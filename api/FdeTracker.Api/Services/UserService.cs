using FdeTracker.Api.Common;
using FdeTracker.Api.Data;
using FdeTracker.Api.Models;
using FdeTracker.Api.Models.Requests;
using FdeTracker.Api.Repositories;
using FdeTracker.Api.ViewModels;

namespace FdeTracker.Api.Services;

public sealed class UserService(Db db, UserRepository users, BatchRepository batches, AuditRepository audit, AppOptions options)
{
    /// <summary>Loads the app user for a verified token, creating (or re-linking) them the first time we see them.</summary>
    public Task<AppUser> SignIn(Guid id, string email) => db.Tx(async s =>
    {
        await users.LockForSignup(s);
        var isAdmin = email == options.AdminEmail;
        var user = await users.ById(s, id);
        if (user is null)
        {
            // The same person re-created in the auth provider gets a new id; keep their data by re-linking on email.
            if (await users.ByEmail(s, email) is not null)
            {
                user = await users.Relink(s, id, email);
            }
            else
            {
                var status = isAdmin || await users.ApprovedMemberCount(s) < options.FreeSeats ? "approved" : "pending";
                user = await users.Insert(s, id, email, isAdmin ? "admin" : "member", status);
                await audit.Record(s, id, "user.first_seen", id.ToString(), new { status });
            }
        }
        else
        {
            await users.Touch(s, id);
        }
        if (isAdmin && (user.Role != "admin" || user.AccessStatus != "approved")) user = await users.MakeAdmin(s, user.Id);
        return user;
    });

    public async Task<ProfileView> UpdateProfile(Guid userId, UpdateMeRequest body) =>
        await db.Read(s => users.UpdateProfile(s, userId, body.DisplayName, body.StackIdSet, body.StackId)) ?? throw ApiException.NotFound();

    public Task<List<AdminUserView>> List() => db.Read(users.List);

    public async Task<AccessChangeView> SetAccess(Guid actorId, Guid id, string status)
    {
        if (id == actorId) throw ApiException.BadRequest("You cannot change your own access");
        var row = await db.Tx(async s =>
        {
            var r = await users.SetAccess(s, id, status);
            if (r is not null) await audit.Record(s, actorId, "admin.access", id.ToString(), new { status });
            return r;
        });
        return row ?? throw ApiException.NotFound();
    }

    /// <summary>The signed-in person as /api/me shows them, with their batch (or null).</summary>
    public async Task<UserView> Me(AppUser user)
    {
        var batch = user.BatchId is { } bid ? await db.Read(s => batches.ById(s, bid)) : null;
        return UserView.From(user, batch);
    }

    public async Task<BatchAssignView> SetBatch(Guid actorId, Guid id, Guid? batchId)
    {
        var row = await db.Tx(async s =>
        {
            if (batchId is { } bid && await batches.ById(s, bid) is null) throw ApiException.NotFound("Unknown batch");
            var r = await users.SetBatch(s, id, batchId);
            if (r is not null) await audit.Record(s, actorId, "admin.batch", id.ToString(), new { batch_id = batchId });
            return r;
        });
        return row ?? throw ApiException.NotFound();
    }

    public async Task<RoleChangeView> SetRole(Guid actorId, Guid id, string role)
    {
        var row = await db.Tx(async s =>
        {
            var r = await users.SetRole(s, id, role, options.AdminEmail);
            if (r is not null) await audit.Record(s, actorId, "admin.role", id.ToString(), new { role });
            return r;
        });
        return row ?? throw ApiException.NotFound();
    }
}
