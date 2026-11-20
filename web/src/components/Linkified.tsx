import { shortUrl, splitLinks } from "../lib/text";

/** Text with https links made clickable (new tab, no opener), line breaks kept by the CSS. */
export function Linkified({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((p, i) => p.href
        ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" title={p.href} className="inline-link">{shortUrl(p.href)}</a>
        : <span key={i}>{p.text}</span>)}
    </>
  );
}
