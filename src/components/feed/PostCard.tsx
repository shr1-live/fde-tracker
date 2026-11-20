import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { clearUnsaved, hasUnsaved, useUnsaved } from "../../lib/unsaved";
import { Link, useNavigate } from "react-router-dom";
import { ago, feed, type Comment, type Post } from "../../lib/v3";
import { errText } from "../../lib/useProgram";
import { firstUrl, fullDate, plural } from "../../lib/text";
import { useDoubleTap } from "../../lib/useDoubleTap";
import { Avatar } from "../Avatar";
import { Icon } from "../Icon";
import { Linkified } from "../Linkified";
import { Menu, type MenuItem } from "../Menu";
import { useConfirm } from "../Confirm";
import { useToast } from "../Toast";
import { LinkPreview } from "./LinkPreview";
import { Skeleton } from "../States";

export const BODY_MAX = 2000;
export const postLink = (id: string) => `${window.location.origin}/post/${encodeURIComponent(id)}`;
const PREVIEW_COMMENTS = 2; // like Instagram: the latest two under the post, the rest behind "View all"

/** Copies text to the clipboard; falls back to a hidden textarea where the clipboard API is blocked. */
export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* try the old way */ }
  try {
    const t = document.createElement("textarea");
    t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy"); t.remove(); return ok;
  } catch { return false; }
}

function Time({ iso }: { iso: string }) {
  return <time dateTime={iso} title={fullDate(iso)}>{ago(iso)}</time>;
}

/** Checks body + link the same way as the server. Returns an error message or the cleaned values. */
/** fromText: use the first https link in the text when the link field is empty (new posts only; when editing, an empty link field means "remove the link"). */
export function cleanPost(body: string, url: string, fromText = true): { body: string | null; url: string | null } | string {
  const b = body.trim();
  let u = url.trim();
  if (!u && fromText) u = firstUrl(b) ?? "";
  if (!b && !u) return "Write something or add a link.";
  if (b.length > BODY_MAX) return `Keep the text under ${BODY_MAX} characters.`;
  if (u && !/^https:\/\/\S+$/.test(u)) return "The link must start with https://";
  if (u.length > 500) return "The link is too long (500 characters at most).";
  return { body: b || null, url: u || null };
}

function EditForm({ post, onDone }: { post: Post; onDone: (p?: Post) => void }) {
  const [body, setBody] = useState(post.body ?? "");
  const [url, setUrl] = useState(post.url ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();
  useUnsaved(`edit-${post.id}`, body !== (post.body ?? "") || url !== (post.url ?? ""));
  useEffect(() => { const t = ref.current; if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, []);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const v = cleanPost(body, url, false);
    if (typeof v === "string") { setErr(v); return; }
    setBusy(true); setErr("");
    try { const p = await feed.edit(post.id, v); toast.success("Post updated."); onDone(p); }
    catch (e2) { setErr(errText(e2)); } finally { setBusy(false); }
  };
  return (
    <form className="post-edit" onSubmit={save} aria-label="Edit post" onKeyDown={(e) => { if (e.key === "Escape") onDone(); }}>
      <label htmlFor={`e-${post.id}`} className="sr">Post text</label>
      <textarea ref={ref} id={`e-${post.id}`} rows={4} maxLength={BODY_MAX} value={body} onChange={(e) => setBody(e.target.value)} />
      <label htmlFor={`eu-${post.id}`}>Link <span className="hint">(optional)</span></label>
      <input id={`eu-${post.id}`} type="url" inputMode="url" placeholder="https://" maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} />
      {err && <p className="field-error" role="alert">{err}</p>}
      <div className="row end">
        <span className={"counter" + (body.length > BODY_MAX - 100 ? " warn" : "")} aria-live="polite">{body.length} / {BODY_MAX}</span>
        <button type="button" className="btn ghost" onClick={() => onDone()}>Cancel</button>
        <button className="btn" disabled={busy}>{busy ? "Saving" : "Save changes"}</button>
      </div>
    </form>
  );
}

/** Post text. Long captions fold to a few lines with "more", like Instagram. */
function Caption({ post, lines, author }: { post: Post; lines: number; author: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  useLayoutEffect(() => { const el = ref.current; if (el && !open) setLong(el.scrollHeight > el.clientHeight + 2); }, [post.body, open]);
  if (!post.body) return null;
  return (
    <div className="caption">
      <p ref={ref} id={`b-${post.id}`} className={"post-body" + (open ? "" : " clamp")} style={{ ["--lines" as string]: lines }}>
        {author && <b className="caption-who" aria-hidden="true">{post.author.name} </b>}<Linkified text={post.body} />
      </p>
      {long && !open && <button type="button" className="textbtn more-btn" aria-expanded={false} aria-controls={`b-${post.id}`} onClick={() => setOpen(true)}>more<span className="sr"> of this post</span></button>}
    </div>
  );
}

type Props = {
  post: Post; meId?: string; meName?: string; isAdmin: boolean; single?: boolean;
  /** Change this post in the list. Always an updater, so quick actions in a row never overwrite each other. */
  onChange: (fn: (p: Post) => Post) => void;
  /** The post is gone. In the feed this is instant; the returned function puts it back if the server says no. */
  onRemoved: (id: string) => (() => void) | void;
};

let tempIds = 0;
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const PostCard = forwardRef<HTMLElement, Props>(function PostCard({ post, meId, meName, isAdmin, onChange, onRemoved, single }, ref) {
  const [expanded, setExpanded] = useState(!!single);
  const [composing, setComposing] = useState(!!single);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [burst, setBurst] = useState(0);
  const [popKey, setPopKey] = useState(0);
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const mine = post.author.id === meId;
  const pending = post.id.startsWith("tmp-");

  const toggle = (p: Post): Post => ({ ...p, liked_by_me: !p.liked_by_me, like_count: Math.max(0, p.like_count + (p.liked_by_me ? -1 : 1)) });
  const like = async () => {
    if (pending) return;
    if (!post.liked_by_me) setPopKey((k) => k + 1);
    onChange(toggle); // instant; the server's answer replaces it, and a failure turns it back
    try { const r = await feed.like(post.id); onChange((p) => ({ ...p, ...r })); } catch (e) { onChange(toggle); toast.error(errText(e)); }
  };
  // Double tap / double click on the media: like (never unlike), with a heart burst.
  const doubleLike = () => {
    if (!reduceMotion()) setBurst((b) => b + 1);
    if (!post.liked_by_me) void like();
  };
  const tapText = useDoubleTap(doubleLike);

  const comment = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || pending) return;
    const temp: Comment = { id: `tmp-c${++tempIds}`, author: { id: meId ?? "", name: meName ?? "You" }, body, created_at: new Date().toISOString() };
    onChange((p) => ({ ...p, comments: [...p.comments, temp], comment_count: p.comment_count + 1 }));
    setText(""); setExpanded(true);
    try {
      const c = await feed.comment(post.id, body);
      onChange((p) => ({ ...p, comments: p.comments.map((x) => (x.id === temp.id ? c : x)) }));
    } catch (e2) {
      onChange((p) => ({ ...p, comments: p.comments.filter((x) => x.id !== temp.id), comment_count: p.comment_count - 1 }));
      setText((t) => t || body); toast.error(errText(e2, "Your comment was not sent."));
    }
  };
  const removeComment = async (c: Comment) => {
    if (!(await confirm({ title: "Delete this comment?", body: "It is removed for everyone.", confirm: "Delete comment", danger: true }))) return;
    const at = post.comments.findIndex((x) => x.id === c.id);
    onChange((p) => ({ ...p, comments: p.comments.filter((x) => x.id !== c.id), comment_count: p.comment_count - 1 }));
    try { await feed.removeComment(c.id); toast.success("Comment deleted."); }
    catch (e) {
      onChange((p) => { const cs = [...p.comments]; cs.splice(Math.max(0, at), 0, c); return { ...p, comments: cs, comment_count: p.comment_count + 1 }; });
      toast.error(errText(e));
    }
  };
  const remove = async () => {
    if (!(await confirm({ title: "Delete this post?", body: "The post, its likes and its comments are removed for everyone. This cannot be undone.", confirm: "Delete post", danger: true }))) return;
    if (single) {
      try { await feed.remove(post.id); toast.success("Post deleted."); onRemoved(post.id); } catch (e) { toast.error(errText(e)); }
      return;
    }
    const restore = onRemoved(post.id);
    try { await feed.remove(post.id); toast.success("Post deleted."); } catch (e) { restore?.(); toast.error(errText(e, "The post was not deleted.")); }
  };
  const copy = async () => { (await copyText(postLink(post.id))) ? toast.success("Link to the post copied.") : toast.error("Could not copy. The link is " + postLink(post.id)); };
  const openComments = () => { setComposing(true); setTimeout(() => document.getElementById(`c-${post.id}`)?.focus(), 0); };

  const items: MenuItem[] = [{ label: "Copy link", icon: "copy", onSelect: copy, instant: true }];
  if (!single) items.push({ label: "Open post", icon: "external", onSelect: async () => { if (hasUnsaved() && !(await confirm({ title: "Leave without saving?", body: "You have changes on this page that are not saved yet. If you leave now, they are lost.", confirm: "Leave page", cancel: "Stay on this page", danger: true }))) return; clearUnsaved(); navigate(`/post/${post.id}`); } });
  if (mine && !pending) items.push({ label: "Edit post", icon: "edit", onSelect: () => setEditing(true) });
  if ((mine || isAdmin) && !pending) items.push({ label: "Delete post", icon: "trash", onSelect: remove, danger: true });

  const heart = burst > 0 && <span key={burst} className="heart-burst" aria-hidden="true" onAnimationEnd={() => setBurst(0)}><Icon name="heart" size={96} filled strokeWidth={1.5} /></span>;
  const hasMedia = !!post.url;
  const shown = expanded ? post.comments : post.comments.slice(-PREVIEW_COMMENTS);
  const hidden = post.comment_count - shown.length;

  return (
    <article ref={ref} className={"card post" + (pending ? " is-pending" : "")} aria-labelledby={`p-${post.id}`} aria-busy={pending || undefined} tabIndex={-1} data-post={post.id}>
      <header className="post-head">
        <Avatar name={post.author.name} />
        <div className="post-who">
          <b id={`p-${post.id}`}>{post.author.name}</b>
          <span className="meta">
            {pending ? "Posting" : single ? <Time iso={post.created_at} /> : <Link to={`/post/${post.id}`} className="meta-link"><Time iso={post.created_at} /><span className="sr">, open post</span></Link>}
            {post.edited_at && <span title={`Edited ${fullDate(post.edited_at)}`}> · edited</span>}
          </span>
        </div>
        <div ref={menuRef}><Menu label={`Post actions for ${post.author.name}'s post`} items={items} /></div>
      </header>
      {editing
        ? <EditForm post={post} onDone={(p) => { setEditing(false); if (p) onChange((x) => ({ ...x, ...p })); setTimeout(() => menuRef.current?.querySelector("button")?.focus(), 0); }} />
        : hasMedia
          ? (
            <>
              <LinkPreview url={post.url!} onDouble={doubleLike} overlay={heart} />
              <Caption post={post} lines={single ? 40 : 3} author />
            </>
          )
          : (
            <div className="post-text media" onClick={tapText}>
              <Caption post={post} lines={single ? 40 : 10} author={false} />
              {heart}
            </div>
          )}
      <div className="post-actions">
        <button type="button" className={"act" + (post.liked_by_me ? " on" : "")} aria-pressed={post.liked_by_me} aria-label="Like" title={post.liked_by_me ? "Unlike" : "Like"} onClick={like} disabled={pending}>
          <span key={popKey} className={popKey ? "like-pop" : undefined}><Icon name="heart" size={22} filled={post.liked_by_me} /></span>
        </button>
        <button type="button" className="act" aria-label="Comment" title="Comment" onClick={openComments} disabled={pending}><Icon name="comment" size={22} /></button>
        <button type="button" className="act" aria-label="Copy link" title="Copy link" onClick={copy} disabled={pending}><Icon name="send" size={21} /></button>
      </div>
      <p className="post-stats">
        {post.like_count > 0
          ? <span key={post.like_count} className="count-anim tnum">{plural(post.like_count, "like")}</span>
          : <span className="first-like">Be the first to like this</span>}
        {post.comment_count > 0 && <span className="meta"> · {plural(post.comment_count, "comment")}</span>}
      </p>
      {(shown.length > 0 || composing || hidden > 0) && (
        <div className="comments">
          {hidden > 0 && (
            !expanded && post.comments.length > shown.length
              ? <button type="button" className="textbtn view-all" aria-expanded={false} onClick={() => { setExpanded(true); setComposing(true); }}>View all {post.comment_count} comments</button>
              : <p className="meta">{single ? `Showing the latest ${post.comments.length} of ${post.comment_count} comments.` : <>Showing the latest {post.comments.length} of {post.comment_count}. <Link to={`/post/${post.id}`}>See all comments</Link></>}</p>
          )}
          {shown.map((c) => (
            <div key={c.id} className={"comment" + (c.id.startsWith("tmp-") ? " is-pending" : "")}>
              <Avatar name={c.author.name} size="sm" />
              <div className="comment-bubble">
                <p><b>{c.author.name}</b> <Linkified text={c.body} /></p>
                <div className="comment-meta">
                  {c.id.startsWith("tmp-") ? <span>Sending</span> : <Time iso={c.created_at} />}
                  {(c.author.id === meId || isAdmin) && !c.id.startsWith("tmp-") && <button type="button" className="textbtn danger" onClick={() => removeComment(c)}>Delete<span className="sr"> comment by {c.author.name}</span></button>}
                </div>
              </div>
            </div>
          ))}
          {(composing || shown.length > 0) && (
            <form className="comment-form" onSubmit={comment}>
              <label className="sr" htmlFor={`c-${post.id}`}>Write a comment</label>
              <input id={`c-${post.id}`} placeholder="Add a comment" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" enterKeyHint="send" />
              <button className="send-btn" disabled={!text.trim() || pending}>Send</button>
            </form>
          )}
        </div>
      )}
    </article>
  );
});

/** Same shape and size as a real post (header, 16:9 media, actions, two lines), so nothing jumps when posts arrive. */
export function PostSkeleton({ media = true }: { media?: boolean }) {
  return (
    <div className="card post post-skel" aria-hidden="true">
      <div className="post-head"><Skeleton w={36} h={36} r={999} /><div className="grow"><Skeleton w={140} /><Skeleton w={80} h={12} style={{ marginTop: 6 }} /></div></div>
      {media ? <span className="skel media-skel" /> : <><Skeleton w="100%" style={{ marginTop: 14 }} /><Skeleton w="70%" style={{ marginTop: 8 }} /></>}
      <div className="skel-actions"><Skeleton w={24} h={24} r={6} /><Skeleton w={24} h={24} r={6} /><Skeleton w={24} h={24} r={6} /></div>
      <Skeleton w={64} h={12} /><Skeleton w="88%" style={{ marginTop: 8 }} />
    </div>
  );
}
