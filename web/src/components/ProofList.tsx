import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { ApiError } from "../lib/api";
import { Item, download, fileBlob } from "../lib/submissionsApi";

const size = (n: number | null) => (n === null ? "" : n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const host = (url: string | null) => { try { return url ? new URL(url).host : ""; } catch { return ""; } };

/** A small picture of an image proof. It is fetched with the sign-in token and shown from memory. */
function Thumb({ item }: { item: Item }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    fileBlob(item.id).then((b) => { if (alive) { url = URL.createObjectURL(b); setSrc(url); } }).catch(() => { /* no preview: the download button still works */ });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [item.id]);
  return src ? <img className="thumb" src={src} alt={`Preview of ${item.label}`} /> : <div className="thumb empty" aria-hidden="true" />;
}

/** The proofs of a submission: links open in a new tab, files can be downloaded, images are previewed. */
export function ProofList({ items, onRemove, busy }: { items: Item[]; onRemove?: (id: string) => void; busy?: boolean }) {
  const [error, setError] = useState("");
  if (items.length === 0) return <p className="muted small">No proof added yet.</p>;
  return (
    <>
      <ul className="proofs">
        {items.map((i) => (
          <li key={i.id} className="proof">
            {i.previewable && <Thumb item={i} />}
            <div className="proofbody">
              <div className="proofhead"><Icon name={i.kind === "link" ? "link" : "file"} size={16} /> <b>{i.label}</b></div>
              {i.kind === "link"
                ? (i.url?.startsWith("https://")
                  ? <a href={i.url} target="_blank" rel="noopener noreferrer">{host(i.url)}<span className="sr"> (opens in a new tab)</span></a>
                  : <span className="muted small">Link not shown: {i.url}</span>)
                : <span className="muted small">{i.file_name} · {size(i.size_bytes)}</span>}
            </div>
            <div className="proofactions">
              {i.kind === "file" && (
                <button type="button" className="copy" onClick={() => { setError(""); download(i).catch((e: ApiError) => setError(e.message)); }} aria-label={`Download ${i.label}`}>Download</button>
              )}
              {onRemove && <button type="button" className="copy" disabled={busy} onClick={() => onRemove(i.id)} aria-label={`Remove ${i.label}`}>Remove</button>}
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="err small" role="alert">{error}</p>}
    </>
  );
}
