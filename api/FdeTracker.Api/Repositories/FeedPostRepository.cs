using FdeTracker.Api.Data;
using FdeTracker.Api.ViewModels;

namespace FdeTracker.Api.Repositories;

/// <summary>The shared feed (feed_posts, feed_likes, feed_comments). Parameterised SQL only.</summary>
public sealed class FeedPostRepository
{
    static readonly string Name = LearningProgramRepository.NameOf("u");

    const string PostCols =
        """
        p.id, p.author_id, p.body, p.url, p.created_at,
        (select count(*)::int from feed_likes l where l.post_id = p.id) as like_count,
        exists (select 1 from feed_likes l where l.post_id = p.id and l.user_id = @me) as liked_by_me,
        (select count(*)::int from feed_comments c where c.post_id = p.id) as comment_count
        """;

    public Task<List<FeedPostRow>> Page(Session s, Guid me, DateTime? before, int limit) =>
        s.Query<FeedPostRow>(
            $"""
             select {PostCols}, {Name} as author_name
             from feed_posts p join app_users u on u.id = p.author_id
             where (@before::timestamptz is null or p.created_at < @before::timestamptz)
             order by p.created_at desc, p.id desc
             limit @limit
             """, new { me, before, limit });

    public Task<FeedPostRow?> Post(Session s, Guid me, Guid id) =>
        s.First<FeedPostRow>(
            $"select {PostCols}, {Name} as author_name from feed_posts p join app_users u on u.id = p.author_id where p.id = @id",
            new { me, id });

    /// <summary>The last 20 comments of each post, oldest first.</summary>
    public Task<List<FeedCommentRow>> LastComments(Session s, Guid[] postIds) =>
        s.Query<FeedCommentRow>(
            $"""
             select x.id, x.post_id, x.author_id, x.author_name, x.body, x.created_at from (
               select c.id, c.post_id, c.author_id, {Name} as author_name, c.body, c.created_at,
                 row_number() over (partition by c.post_id order by c.created_at desc, c.id desc) as rn
               from feed_comments c join app_users u on u.id = c.author_id
               where c.post_id = any(@postIds)
             ) x where x.rn <= 20
             order by x.post_id, x.created_at, x.id
             """, new { postIds });

    /// <summary>Serialises one person's writes to the feed so the daily limits cannot be raced.</summary>
    public Task LockAuthor(Session s, Guid userId) =>
        s.Exec("select pg_advisory_xact_lock(7002, hashtext(@key))", new { key = userId.ToString() });

    public Task<int> PostsToday(Session s, Guid userId) =>
        s.Scalar<int>("select count(*)::int from feed_posts where author_id = @userId and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'", new { userId });

    public Task<int> CommentsToday(Session s, Guid userId) =>
        s.Scalar<int>("select count(*)::int from feed_comments where author_id = @userId and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'", new { userId });

    public Task<Guid> InsertPost(Session s, Guid authorId, string? body, string? url) =>
        s.Scalar<Guid>("insert into feed_posts (author_id, body, url) values (@authorId, @body, @url) returning id", new { authorId, body, url });

    public Task<Guid?> PostAuthor(Session s, Guid id) =>
        s.First<Guid?>("select author_id from feed_posts where id = @id", new { id });

    public Task DeletePost(Session s, Guid id) => s.Exec("delete from feed_posts where id = @id", new { id });

    /// <summary>Likes the post, or takes the like back if it was there. Returns the new state.</summary>
    public async Task<FeedLikeView> ToggleLike(Session s, Guid postId, Guid userId)
    {
        var removed = await s.Exec("delete from feed_likes where post_id = @postId and user_id = @userId", new { postId, userId });
        if (removed == 0) await s.Exec("insert into feed_likes (post_id, user_id) values (@postId, @userId) on conflict do nothing", new { postId, userId });
        var count = await s.Scalar<int>("select count(*)::int from feed_likes where post_id = @postId", new { postId });
        return new FeedLikeView { LikeCount = count, LikedByMe = removed == 0 };
    }

    public Task<FeedCommentRow> InsertComment(Session s, Guid postId, Guid authorId, string body) =>
        s.First<FeedCommentRow>(
            $"""
             with c as (insert into feed_comments (post_id, author_id, body) values (@postId, @authorId, @body) returning *)
             select c.id, c.post_id, c.author_id, {Name} as author_name, c.body, c.created_at from c join app_users u on u.id = c.author_id
             """, new { postId, authorId, body })!;

    public Task<Guid?> CommentAuthor(Session s, Guid id) =>
        s.First<Guid?>("select author_id from feed_comments where id = @id", new { id });

    public Task DeleteComment(Session s, Guid id) => s.Exec("delete from feed_comments where id = @id", new { id });
}
