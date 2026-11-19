using FdeTracker.Api.Common;
using FdeTracker.Api.Data;
using FdeTracker.Api.Models;
using FdeTracker.Api.Models.Requests;
using FdeTracker.Api.Repositories;
using FdeTracker.Api.ViewModels;

namespace FdeTracker.Api.Services;

/// <summary>The shared feed: posts, likes and comments for everyone approved. Limits are counted per person per UTC day.</summary>
public sealed class FeedPostService(Db db, FeedPostRepository repo)
{
    public const int PostsPerDay = 30;
    public const int CommentsPerDay = 200;
    public const int MaxLimit = 50;

    public Task<List<FeedPostView>> Page(AppUser user, DateTime? before, int limit) => db.Read(async s =>
    {
        if (limit is < 1 or > MaxLimit) throw ApiException.BadRequest($"limit must be from 1 to {MaxLimit}");
        var posts = await repo.Page(s, user.Id, before, limit);
        var comments = posts.Count == 0 ? [] : await repo.LastComments(s, posts.Select(p => p.Id).ToArray());
        var byPost = comments.GroupBy(c => c.PostId).ToDictionary(g => g.Key, g => g.Select(Comment).ToList());
        return posts.Select(p => Post(p, byPost.GetValueOrDefault(p.Id) ?? [])).ToList();
    });

    public Task<FeedPostView> Create(AppUser user, FeedPostRequest b) => db.Tx(async s =>
    {
        if (b.Body is null && b.Url is null) throw ApiException.BadRequest("Write something or add a link");
        await repo.LockAuthor(s, user.Id);
        if (await repo.PostsToday(s, user.Id) >= PostsPerDay) throw new ApiException(429, $"You can post up to {PostsPerDay} times a day");
        var id = await repo.InsertPost(s, user.Id, b.Body, b.Url);
        return Post((await repo.Post(s, user.Id, id))!, []);
    });

    public Task Delete(AppUser user, Guid id) => db.Tx<bool>(async s =>
    {
        var author = await repo.PostAuthor(s, id) ?? throw ApiException.NotFound();
        if (author != user.Id && !user.IsAdmin) throw new ApiException(403, "You can only delete your own posts");
        await repo.DeletePost(s, id);
        return true;
    });

    public Task<FeedLikeView> ToggleLike(AppUser user, Guid id) => db.Tx(async s =>
    {
        if (await repo.PostAuthor(s, id) is null) throw ApiException.NotFound();
        return await repo.ToggleLike(s, id, user.Id);
    });

    public Task<FeedCommentView> AddComment(AppUser user, Guid postId, FeedCommentRequest b) => db.Tx(async s =>
    {
        if (await repo.PostAuthor(s, postId) is null) throw ApiException.NotFound();
        await repo.LockAuthor(s, user.Id);
        if (await repo.CommentsToday(s, user.Id) >= CommentsPerDay) throw new ApiException(429, $"You can comment up to {CommentsPerDay} times a day");
        return Comment(await repo.InsertComment(s, postId, user.Id, b.Body));
    });

    public Task DeleteComment(AppUser user, Guid commentId) => db.Tx<bool>(async s =>
    {
        var author = await repo.CommentAuthor(s, commentId) ?? throw ApiException.NotFound();
        if (author != user.Id && !user.IsAdmin) throw new ApiException(403, "You can only delete your own comments");
        await repo.DeleteComment(s, commentId);
        return true;
    });

    static FeedCommentView Comment(FeedCommentRow c) =>
        new() { Id = c.Id, Author = new FeedAuthorView { Id = c.AuthorId, Name = c.AuthorName }, Body = c.Body, CreatedAt = c.CreatedAt };

    static FeedPostView Post(FeedPostRow p, List<FeedCommentView> comments) => new()
    {
        Id = p.Id, Author = new FeedAuthorView { Id = p.AuthorId, Name = p.AuthorName }, Body = p.Body, Url = p.Url, CreatedAt = p.CreatedAt,
        LikeCount = p.LikeCount, LikedByMe = p.LikedByMe, CommentCount = p.CommentCount, Comments = comments,
    };
}
