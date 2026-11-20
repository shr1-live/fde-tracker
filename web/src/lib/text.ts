// Text helpers for the feed: links inside text, link names, YouTube ids and dates.

const URL_RE = /https:\/\/[^\s<>"'`]+/g;
const TRAIL = /[.,;:!?'"\]}>]+$/;

/** A URL is used only when it parses and is https. */
export function safeHttps(u: string): string | null {
  try { const x = new URL(u); return x.protocol === "https:" && !!x.hostname ? x.href : null; } catch { return null; }
}

/** Trims punctuation that ends a sentence, and a closing bracket that has no opening one in the URL. */
function trimUrl(u: string): string {
  let out = u.replace(TRAIL, "");
  while (out.endsWith(")") && (out.match(/\(/g)?.length ?? 0) < (out.match(/\)/g)?.length ?? 0)) out = out.slice(0, -1).replace(TRAIL, "");
  return out;
}

export type Part = { text: string; href?: string };

/** Splits text into plain parts and https link parts. */
export function splitLinks(text: string): Part[] {
  const out: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const raw = trimUrl(m[0]);
    const href = safeHttps(raw);
    if (!href || raw.length < 12) continue;
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i) });
    out.push({ text: raw, href: raw });
    last = i + raw.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** The first https URL in the text (used as the post link when none is given). */
export function firstUrl(text: string): string | null {
  return splitLinks(text).find((p) => p.href)?.href ?? null;
}

export const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

/** host + path, shortened for display; the full URL goes in the title. */
export function shortUrl(u: string, max = 48): string {
  try {
    const x = new URL(u);
    const s = x.hostname.replace(/^www\./, "") + (x.pathname === "/" ? "" : x.pathname) + (x.search ? "?…" : "");
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  } catch { return u; }
}

/** A friendly site name: "hamel.dev" -> "Hamel", "github.com" -> "GitHub". */
const KNOWN: Record<string, string> = { "github.com": "GitHub", "youtube.com": "YouTube", "youtu.be": "YouTube", "medium.com": "Medium", "linkedin.com": "LinkedIn", "docs.google.com": "Google Docs", "learn.microsoft.com": "Microsoft Learn", "arxiv.org": "arXiv", "huggingface.co": "Hugging Face", "anthropic.com": "Anthropic", "openai.com": "OpenAI", "dev.to": "DEV", "stackoverflow.com": "Stack Overflow", "wikipedia.org": "Wikipedia" };
export function siteName(u: string): string {
  const h = host(u);
  const known = Object.entries(KNOWN).find(([k]) => h === k || h.endsWith("." + k));
  if (known) return known[1];
  const parts = h.split(".");
  const core = parts.length > 1 ? parts[parts.length - 2]! : h;
  return core.charAt(0).toUpperCase() + core.slice(1);
}

export function youtubeId(u: string): string | null {
  try {
    const x = new URL(u);
    let id: string | null = null;
    if (x.hostname === "youtu.be") id = x.pathname.slice(1, 12);
    else if (/(^|\.)youtube\.com$/.test(x.hostname)) id = x.searchParams.get("v")?.slice(0, 11) ?? (x.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/)?.[2] ?? null);
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

/** "Thursday, 19 November 2026 at 14:05" style, for hover titles. */
export const fullDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });

export const initials = (n: string) => n.split(/[\s.@_-]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("") || "?";
export const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
