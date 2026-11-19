import { useCallback, useEffect, useState, type FormEvent } from "react";
import { API_URL } from "../lib/api";
import { useMe } from "../lib/useRole";
import { ago, feed, type Post } from "../lib/v3";
import { errText } from "../lib/useProgram";
import { Icon } from "../components/Icon";

const initials = (n: string) => n.split(/[\s.@_-]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("") || "?";
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
function youtubeId(u: string): string | null {
  try {
    const x = new URL(u);
    if (x.hostname === "youtu.be") return x.pathname.slice(1, 12) || null;
    if (/(^|\.)youtube\.com$/.test(x.hostname)) return x.searchParams.get("v")?.slice(0, 11) ?? (x.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/)?.[2] ?? null);
  } catch { /* not a link */ }
  return null;
}

export function Avatar({ name }: { name: string }) {
  return <span className="favatar" style={{ ["--h" as string]: hue(name) }} aria-hidden="true">{initials(name)}</span>;
}

function LinkPreview({ url }: { url: string }) {
  const [play, setPlay] = useState(false);
  const yt = youtubeId(url);
  if (yt && /^[\w-]{11}$/.test(yt)) {
    return play
      ? <div className="pvideo"><iframe src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1`} title="Video player" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>
      : <button type="button" className="pvideo pthumb" onClick={() => setPlay(true)} aria-label="Play the video here"><img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" loading="lazy" /><span className="pplay" aria-hidden="true">▶</span></button>;
  }
  return (
    <a className="plink" href={url} target="_blank" rel="noreferrer noopener">
      <Icon name="link" /><span><b>{host(url)}</b><span className="small muted wrap">{url}</span></span>
    </a>
  );
}

function PostCard({ post, meId, isAdmin, onChange, onRemove }: { post: Post; meId?: string; isAdmin: boolean; onChange: (p: Post) => void; onRemove: () => void }) {
  const [showComments, setShowComments] = useState(post.comment_count > 0 && post.comment_count <= 2);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const like = async () => {
    const prev = post;
    onChange({ ...post, liked_by_me: !post.liked_by_me, like_count: post.like_count + (post.liked_by_me ? -1 : 1) }); // instant; the server's answer replaces it
    try { const r = await feed.like(post.id); onChange({ ...prev, ...r }); } catch (e) { onChange(prev); setErr(errText(e)); }
  };
  const comment = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setErr("");
    try { const c = await feed.comment(post.id, text.trim()); onChange({ ...post, comments: [...post.comments, c], comment_count: post.comment_count + 1 }); setText(""); setShowComments(true); }
    catch (e2) { setErr(errText(e2)); } finally { setBusy(false); }
  };
  const removeComment = async (id: string) => {
    if (!window.confirm("Delete this comment?")) return;
    try { await feed.removeComment(id); onChange({ ...post, comments: post.comments.filter((c) => c.id !== id), comment_count: post.comment_count - 1 }); } catch (e) { setErr(errText(e)); }
  };
  const mine = post.author.id === meId;
  return (
    <article className="card post" aria-labelledby={`p-${post.id}`}>
      <header className="phead">
        <Avatar name={post.author.name} />
        <div><b id={`p-${post.id}`}>{post.author.name}</b><div className="small muted"><time dateTime={post.created_at}>{ago(post.created_at)}</time></div></div>
        {(mine || isAdmin) && <button type="button" className="btn ghost sm pdel" onClick={onRemove}>Delete</button>}
      </header>
      {post.body && <p className="pbody wrap">{post.body}</p>}
      {post.url && <LinkPreview url={post.url} />}
      <div className="pstats small muted">
        <span>{post.like_count} {post.like_count === 1 ? "like" : "likes"}</span>
        <button type="button" className="linkish" onClick={() => setShowComments((s) => !s)} aria-expanded={showComments}>{post.comment_count} {post.comment_count === 1 ? "comment" : "comments"}</button>
      </div>
      <div className="pactions">
        <button type="button" className={"pact" + (post.liked_by_me ? " on" : "")} aria-pressed={post.liked_by_me} onClick={like}><Icon name="heart" />Like</button>
        <button type="button" className="pact" onClick={() => { setShowComments(true); setTimeout(() => document.getElementById(`c-${post.id}`)?.focus(), 0); }}><Icon name="comment" />Comment</button>
      </div>
      {showComments && (
        <div className="pcomments">
          {post.comment_count > post.comments.length && <p className="small muted">Showing the latest {post.comments.length} of {post.comment_count} comments.</p>}
          {post.comments.map((c) => (
            <div key={c.id} className="pcomment">
              <Avatar name={c.author.name} />
              <div className="pcbody"><b>{c.author.name}</b> <span className="small muted">{ago(c.created_at)}</span><p className="wrap">{c.body}</p>
                {(c.author.id === meId || isAdmin) && <button type="button" className="linkish small" onClick={() => removeComment(c.id)}>Delete</button>}
              </div>
            </div>
          ))}
          <form className="pcform" onSubmit={comment}>
            <label className="sr" htmlFor={`c-${post.id}`}>Write a comment</label>
            <input id={`c-${post.id}`} placeholder="Write a comment" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn sm" disabled={busy || !text.trim()}>{busy ? "Sending" : "Send"}</button>
          </form>
        </div>
      )}
      {err && <p className="small err" role="alert">{err}</p>}
    </article>
  );
}

function Composer({ name, onPosted }: { name: string; onPosted: (p: Post) => void }) {
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [withLink, setWithLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const u = url.trim();
    if (!body.trim() && !u) { setErr("Write something or add a link."); return; }
    if (u && !/^https:\/\/\S+$/.test(u)) { setErr("The link must start with https://"); return; }
    setBusy(true); setErr("");
    try { onPosted(await feed.post({ body: body.trim() || undefined, url: u || undefined })); setBody(""); setUrl(""); setWithLink(false); }
    catch (e2) { setErr(errText(e2)); } finally { setBusy(false); }
  };
  return (
    <form className="card composer" onSubmit={submit} aria-label="Share a post">
      <div className="phead"><Avatar name={name} /><label htmlFor="post-body" className="sr">What do you want to share?</label>
        <textarea id="post-body" rows={2} maxLength={2000} placeholder="Share a video, a blog, or something you learned" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      {withLink && <><label htmlFor="post-url">Link</label><input id="post-url" type="url" inputMode="url" placeholder="https://" maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} /></>}
      {err && <p className="small err" role="alert">{err}</p>}
      <div className="row tight cfoot">
        <button type="button" className="pact" onClick={() => setWithLink((w) => !w)} aria-expanded={withLink}><Icon name="link" />{withLink ? "Remove link" : "Add a link"}</button>
        <button className="btn" disabled={busy}>{busy ? "Posting" : "Post"}</button>
      </div>
    </form>
  );
}

export default function Feed() {
  const { me } = useMe();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [err, setErr] = useState("");
  const [more, setMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const load = useCallback(async () => {
    try { const p = await feed.list(); setPosts(p); setMore(p.length >= 20); setErr(""); } catch (e) { setErr(errText(e, "Could not load the feed.")); setPosts((x) => x ?? []); }
  }, []);
  useEffect(() => {
    if (!API_URL) return;
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000);
    return () => window.clearInterval(t);
  }, [load]);
  if (!API_URL) return <><header className="ph"><h1>Feed</h1></header><div className="card"><p className="muted">The feed needs the backend, which is not connected for this site.</p></div></>;
  const older = async () => {
    if (!posts?.length) return;
    setLoadingMore(true);
    try { const p = await feed.list(posts[posts.length - 1]!.created_at); setPosts([...posts, ...p.filter((x) => !posts.some((y) => y.id === x.id))]); setMore(p.length >= 20); }
    catch (e) { setErr(errText(e)); } finally { setLoadingMore(false); }
  };
  const update = (p: Post) => setPosts((all) => all?.map((x) => (x.id === p.id ? p : x)) ?? null);
  const remove = async (id: string) => {
    if (!window.confirm("Delete this post for everyone?")) return;
    try { await feed.remove(id); setPosts((all) => all?.filter((x) => x.id !== id) ?? null); } catch (e) { setErr(errText(e)); }
  };
  const name = me?.display_name || me?.email?.split("@")[0] || "You";
  let list;
  if (posts === null) list = <div className="card" aria-busy="true"><p className="muted">Loading posts...</p></div>;
  else if (posts.length === 0) list = <div className="card"><p className="muted">No posts yet. Be the first to share something.</p></div>;
  else list = <div className="posts">{posts.map((p) => <PostCard key={p.id} post={p} meId={me?.id} isAdmin={me?.role === "admin"} onChange={update} onRemove={() => remove(p.id)} />)}</div>;
  return (
    <div className="feedcol">
      <header className="ph"><h1>Feed</h1><p className="muted">Everyone in every program sees this. Share a useful video or blog, or something you built; like and comment on other people's posts.</p></header>
      <Composer name={name} onPosted={(p) => setPosts((all) => [p, ...(all ?? [])])} />
      {err && <p className="banner err" role="alert">{err}</p>}
      {list}
      {posts && posts.length > 0 && more && <div className="row"><button type="button" className="btn ghost" onClick={older} disabled={loadingMore}>{loadingMore ? "Loading" : "Show older posts"}</button></div>}
    </div>
  );
}
