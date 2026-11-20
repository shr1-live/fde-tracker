import { forwardRef, useEffect, useRef, useState, type FormEvent } from "react";
import { clearUnsaved, hasUnsaved, useUnsaved } from "../../lib/unsaved";
import { Link, useNavigate } from "react-router-dom";
import { ago, feed, type Post } from "../../lib/v3";
import { errText } from "../../lib/useProgram";
import { firstUrl, fullDate, plural } from "../../lib/text";
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

type Props = { post: Post; meId?: string; isAdmin: boolean; onChange: (p: Post) => void; onRemoved: (id: string) => void; single?: boolean };

export const PostCard = forwardRef<HTMLElement, Props>(function PostCard({ post, meId, isAdmin, onChange, onRemoved, single }, ref) {
  const [showComments, setShowComments] = useState(single || (post.comment_count > 0 && post.comment_count <= 2));
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const mine = post.author.id === meId;

  const like = async () => {
    const prev = post;
    onChange({ ...post, liked_by_me: !post.liked_by_me, like_count: post.like_count + (post.liked_by_me ? -1 : 1) }); // instant; the server's answer replaces it
    try { const r = await feed.like(post.id); onChange({ ...prev, ...r }); } catch (e) { onChange(prev); toast.error(errText(e)); }
  };
  const comment = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try { const c = await feed.comment(post.id, text.trim()); onChange({ ...post, comments: [...post.comments, c], comment_count: post.comment_count + 1 }); setText(""); setShowComments(true); }
    catch (e2) { toast.error(errText(e2)); } finally { setBusy(false); }
  };
  const removeComment = async (id: string) => {
    if (!(await confirm({ title: "Delete this comment?", body: "It is removed for everyone.", confirm: "Delete comment", danger: true }))) return;
    try { await feed.removeComment(id); onChange({ ...post, comments: post.comments.filter((c) => c.id !== id), comment_count: post.comment_count - 1 }); toast.success("Comment deleted."); }
    catch (e) { toast.error(errText(e)); }
  };
  const remove = async () => {
    if (!(await confirm({ title: "Delete this post?", body: "The post, its likes and its comments are removed for everyone. This cannot be undone.", confirm: "Delete post", danger: true }))) return;
    try { await feed.remove(post.id); toast.success("Post deleted."); onRemoved(post.id); } catch (e) { toast.error(errText(e)); }
  };
  const copy = async () => { (await copyText(postLink(post.id))) ? toast.success("Link to the post copied.") : toast.error("Could not copy. The link is " + postLink(post.id)); };
  const openComments = () => { setShowComments(true); setTimeout(() => document.getElementById(`c-${post.id}`)?.focus(), 0); };

  const items: MenuItem[] = [{ label: "Copy link", icon: "copy", onSelect: copy }];
  if (!single) items.push({ label: "Open post", icon: "external", onSelect: async () => { if (hasUnsaved() && !(await confirm({ title: "Leave without saving?", body: "You have changes on this page that are not saved yet. If you leave now, they are lost.", confirm: "Leave page", cancel: "Stay on this page", danger: true }))) return; clearUnsaved(); navigate(`/post/${post.id}`); } });
  if (mine) items.push({ label: "Edit post", icon: "edit", onSelect: () => setEditing(true) });
  if (mine || isAdmin) items.push({ label: "Delete post", icon: "trash", onSelect: remove, danger: true });

  return (
    <article ref={ref} className="card post" aria-labelledby={`p-${post.id}`} tabIndex={-1} data-post={post.id}>
      <header className="post-head">
        <Avatar name={post.author.name} />
        <div className="post-who">
          <b id={`p-${post.id}`}>{post.author.name}</b>
          <span className="meta">
            {single ? <Time iso={post.created_at} /> : <Link to={`/post/${post.id}`} className="meta-link"><Time iso={post.created_at} /><span className="sr">, open post</span></Link>}
            {post.edited_at && <span title={`Edited ${fullDate(post.edited_at)}`}> · edited</span>}
          </span>
        </div>
        <div ref={menuRef}><Menu label={`Post actions for ${post.author.name}'s post`} items={items} /></div>
      </header>
      {editing
        ? <EditForm post={post} onDone={(p) => { setEditing(false); if (p) onChange({ ...post, ...p }); setTimeout(() => menuRef.current?.querySelector("button")?.focus(), 0); }} />
        : (
          <>
            {post.body && <p className="post-body"><Linkified text={post.body} /></p>}
            {post.url && <LinkPreview url={post.url} />}
          </>
        )}
      <div className="post-stats">
        <span>{plural(post.like_count, "like")}</span>
        <button type="button" className="textbtn" onClick={() => setShowComments((s) => !s)} aria-expanded={showComments}>{plural(post.comment_count, "comment")}</button>
      </div>
      <div className="post-actions">
        <button type="button" className={"act" + (post.liked_by_me ? " on" : "")} aria-pressed={post.liked_by_me} onClick={like}><Icon name="heart" />Like</button>
        <button type="button" className="act" onClick={openComments}><Icon name="comment" />Comment</button>
        <button type="button" className="act" onClick={copy}><Icon name="copy" />Copy link</button>
      </div>
      {showComments && (
        <div className="comments">
          {post.comment_count > post.comments.length && (
            single ? <p className="meta">Showing the latest {post.comments.length} of {post.comment_count} comments.</p>
              : <p className="meta">Showing the latest {post.comments.length} of {post.comment_count}. <Link to={`/post/${post.id}`}>See all comments</Link></p>
          )}
          {post.comments.map((c) => (
            <div key={c.id} className="comment">
              <Avatar name={c.author.name} size="sm" />
              <div className="comment-bubble">
                <div className="comment-head"><b>{c.author.name}</b><span className="meta"><Time iso={c.created_at} /></span>
                  {(c.author.id === meId || isAdmin) && <button type="button" className="textbtn danger" onClick={() => removeComment(c.id)}>Delete<span className="sr"> comment by {c.author.name}</span></button>}
                </div>
                <p><Linkified text={c.body} /></p>
              </div>
            </div>
          ))}
          <form className="comment-form" onSubmit={comment}>
            <label className="sr" htmlFor={`c-${post.id}`}>Write a comment</label>
            <input id={`c-${post.id}`} placeholder="Write a comment" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn sm" disabled={busy || !text.trim()}>{busy ? "Sending" : "Send"}</button>
          </form>
        </div>
      )}
    </article>
  );
});

export function PostSkeleton() {
  return (
    <div className="card post">
      <div className="post-head"><Skeleton w={36} h={36} r={999} /><div className="grow"><Skeleton w={140} /><Skeleton w={80} h={12} style={{ marginTop: 6 }} /></div></div>
      <Skeleton w="100%" style={{ marginTop: 16 }} /><Skeleton w="85%" style={{ marginTop: 8 }} /><Skeleton w="100%" h={120} r={10} style={{ marginTop: 16 }} />
    </div>
  );
}

