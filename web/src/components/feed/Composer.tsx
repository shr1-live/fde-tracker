import { forwardRef, useState, type FormEvent } from "react";
import { feed, type Post } from "../../lib/v3";
import { errText } from "../../lib/useProgram";
import { firstUrl, shortUrl } from "../../lib/text";
import { useUnsaved } from "../../lib/unsaved";
import { Avatar } from "../Avatar";
import { Icon } from "../Icon";
import { useToast } from "../Toast";
import { BODY_MAX, cleanPost } from "./PostCard";

/** Write a post: text, an optional link (or the first https link in the text), with a character counter. */
export const Composer = forwardRef<HTMLTextAreaElement, { name: string; onPosted: (p: Post) => void }>(function Composer({ name, onPosted }, ref) {
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [withLink, setWithLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const toast = useToast();
  useUnsaved("composer", body.trim() !== "" || url.trim() !== "");
  const found = !url.trim() ? firstUrl(body) : null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = cleanPost(body, url);
    if (typeof v === "string") { setErr(v); return; }
    setBusy(true); setErr("");
    try { const p = await feed.post({ body: v.body ?? undefined, url: v.url ?? undefined }); setBody(""); setUrl(""); setWithLink(false); toast.success("Posted to the feed."); onPosted(p); }
    catch (e2) { setErr(errText(e2)); } finally { setBusy(false); }
  };
  const left = BODY_MAX - body.length;
  return (
    <form className="card composer" onSubmit={submit} aria-label="Share a post">
      <div className="composer-main">
        <Avatar name={name} />
        <div className="grow">
          <label htmlFor="post-body" className="sr">What do you want to share?</label>
          <textarea ref={ref} id="post-body" rows={2} maxLength={BODY_MAX} placeholder="Share a video, an article, or something you learned…" value={body}
            aria-describedby="post-count" onChange={(e) => setBody(e.target.value)} />
          {found && <p className="found"><Icon name="link" size={14} />Link found: <span title={found}>{shortUrl(found)}</span>. It shows as a preview.</p>}
          {withLink && (
            <div className="field">
              <label htmlFor="post-url">Link</label>
              <input id="post-url" type="url" inputMode="url" placeholder="https://" maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          )}
          {err && <p className="field-error" role="alert">{err}</p>}
        </div>
      </div>
      <div className="composer-foot">
        <button type="button" className="btn ghost sm" onClick={() => { setWithLink((w) => !w); if (withLink) setUrl(""); }} aria-expanded={withLink}>
          <Icon name={withLink ? "x" : "link"} size={16} />{withLink ? "Remove link" : "Add a link"}
        </button>
        <span id="post-count" className={"counter" + (left < 200 ? " warn" : "") + (left <= 0 ? " full" : "")} aria-live={left < 200 ? "polite" : "off"}>
          {body.length > 0 ? `${body.length} / ${BODY_MAX}` : <span className="sr">Up to {BODY_MAX} characters</span>}
        </span>
        <button className="btn" disabled={busy}>{busy ? "Posting" : "Post"}</button>
      </div>
    </form>
  );
});
