import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_URL, ApiError } from "../lib/api";
import * as api from "../lib/feedApi";
import { canReview, useMe } from "../lib/useRole";
import { useView } from "../lib/viewAs";
import { useStore } from "../lib/store";
import { feedSeenKey } from "../lib/work";
import { youTubeId } from "../components/Bits";
import { Chip } from "../components/Chip";
import { Icon } from "../components/Icon";

const SORTS: [api.Sort, string][] = [["newest", "Newest"], ["recommended", "Recommended"], ["oldest", "Oldest"], ["title", "A to Z"]];
const STATUS: Record<api.MyItem["status"], [string, "ok" | "warn" | "bad" | "info" | "none"]> = {
  approved: ["In the feed", "ok"], in_review: ["Waiting for a reviewer", "warn"], changes_requested: ["Changes asked", "bad"], rejected: ["Not accepted", "bad"], draft: ["Draft", "none"],
};
const site = (url: string | null) => { try { return url ? new URL(url).hostname.replace(/^www\./, "") : ""; } catch { return ""; } };
const when = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Try again.");

/** "3 hours ago", "yesterday", "12 Nov": how people read times in a feed. */
function ago(iso: string | null): string {
  if (!iso) return "";
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hour${Math.floor(s / 3600) === 1 ? "" : "s"} ago`;
  if (s < 172800) return "yesterday";
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} days ago`;
  return when(iso);
}
const initials = (name: string) => (name || "?").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("") || "?";
/** A steady colour per topic, so the same topic always looks the same. */
const hue = (key: string) => [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

function Media({ item, playing, onPlay, big = false }: { item: api.FeedItem; playing: boolean; onPlay: (id: string | null) => void; big?: boolean }) {
  const id = item.url ? youTubeId(item.url) : null;
  if (id) {
    return (
      <div className={"vthumb" + (big ? " big" : "")}>
        {playing
          ? <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`} title={`Video: ${item.title}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          : <button type="button" className="vplay" onClick={() => onPlay(item.id)} aria-label={`Play ${item.title}`}>
              <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
              <span className="vbtn" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
            </button>}
      </div>
    );
  }
  const domain = site(item.url);
  const h = hue(item.topic || domain);
  return (
    <a className={"vthumb fposter" + (big ? " big" : "")} href={item.url ?? undefined} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true"
      style={{ background: `linear-gradient(135deg, hsl(${h} 55% 32%), hsl(${(h + 40) % 360} 60% 22%))` }}>
      <span className="fp-letter">{(domain[0] ?? "?").toUpperCase()}</span>
      <span className="fp-site">{domain || "link"}</span>
    </a>
  );
}

/** One shared item, like a card on YouTube or dev.to: picture, title, why it is worth it, who shared it and when. */
function FeedCard({ item, playing, onPlay, reviewer, onRecommend, big = false }: { item: api.FeedItem; playing: boolean; onPlay: (id: string | null) => void; reviewer: boolean; onRecommend: (i: api.FeedItem) => void; big?: boolean }) {
  const isVideo = !!(item.url && youTubeId(item.url));
  return (
    <li className={"fcard2" + (big ? " spot" : "") + (item.recommended ? " rec" : "")}>
      <Media item={item} playing={playing} onPlay={onPlay} big={big} />
      <div className="fbody">
        <div className="fmeta-top">
          <span className="ftopic" style={{ ["--h" as string]: String(hue(item.topic)) }}>{item.topic_title}</span>
          <span className="fkind">{isVideo ? "Video" : item.kind === "note" ? "Note" : "Article"}</span>
          {item.recommended && <span className="frec"><Icon name="check" size={14} /> Recommended</span>}
        </div>
        {item.url
          ? <a className="ftitle" href={item.url} target="_blank" rel="noopener noreferrer">{item.title}<span className="sr"> (opens in a new tab)</span></a>
          : <span className="ftitle">{item.title}</span>}
        {item.summary && <p className="fsum">{item.summary}</p>}
        <div className="fby">
          <span className="favatar" aria-hidden="true" style={{ ["--h" as string]: String(hue(item.author)) }}>{initials(item.author)}</span>
          <span><b>{item.author || "Someone"}</b><span className="muted"> &middot; {ago(item.approved_at)}{!isVideo && item.url ? ` · ${site(item.url)}` : ""}</span></span>
        </div>
        <div className="factions">
          {isVideo && (playing
            ? <button type="button" className="copy" onClick={() => onPlay(null)}>Close player</button>
            : <button type="button" className="copy" onClick={() => onPlay(item.id)}>Play here</button>)}
          {item.url && !isVideo && <a className="copy" href={item.url} target="_blank" rel="noopener noreferrer">Read</a>}
          {reviewer && <button type="button" className={"markbtn" + (item.recommended ? " on" : "")} aria-pressed={!!item.recommended} onClick={() => onRecommend(item)}>{item.recommended ? "Recommended" : "Recommend"}</button>}
        </div>
      </div>
    </li>
  );
}

function Skeleton() {
  return <ul className="fgrid" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((k) => <li key={k} className="fcard2 skel"><div className="vthumb" /><div className="fbody"><i /><i /><i className="short" /></div></li>)}</ul>;
}

function ShareForm({ topics, onShared, open, onToggle }: { topics: api.Topic[]; onShared: (status: string) => void; open?: boolean; onToggle?: (open: boolean) => void }) {
  const [url, setUrl] = useState(""); const [title, setTitle] = useState(""); const [topic, setTopic] = useState(""); const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const okUrl = /^https:\/\/\S+\.\S+/.test(url.trim());
  const ready = okUrl && title.trim().length >= 3 && topic && !busy;
  async function go(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await api.share({ topic, kind: api.kindFor(url), title: title.trim(), url: url.trim(), summary: why });
      setUrl(""); setTitle(""); setWhy(""); onShared(r.status);
    } catch (e2) { setErr(msg(e2)); } finally { setBusy(false); }
  }
  return (
    <details className="card sharebox" open={open || undefined} onToggle={(e) => onToggle?.((e.target as HTMLDetailsElement).open)}>
      <summary><Icon name="link" /> Share a video or blog</summary>
      <p className="muted small">Paste a link to a video or an article that helped you. Say in a line why it is worth it.</p>
      <form onSubmit={go}>
        <label htmlFor="sh-url">Link (https)</label>
        <input id="sh-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
        {url && !okUrl && <p className="small muted">Paste the full link, starting with https://</p>}
        <label htmlFor="sh-title">Title</label>
        <input id="sh-title" maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is it, in a few words" />
        <label htmlFor="sh-topic">Topic</label>
        <select id="sh-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">Choose a topic</option>
          {topics.map((t) => <option key={t.slug} value={t.slug}>{t.title}</option>)}
        </select>
        <label htmlFor="sh-why">Why it is worth it (optional)</label>
        <textarea id="sh-why" rows={2} maxLength={400} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="One or two lines for the others" />
        {err && <p className="banner err" role="alert">{err}</p>}
        <div className="row"><button className="btn" disabled={!ready}>{busy ? "Sharing..." : "Share"}</button></div>
      </form>
    </details>
  );
}

function ReviewQueue({ onDone }: { onDone: () => void }) {
  const [items, setItems] = useState<api.QueueItem[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const load = useCallback(() => api.queue().then(setItems).catch((e) => setErr(msg(e))), []);
  useEffect(() => { void load(); }, [load]);
  async function act(i: api.QueueItem, d: "approve" | "request_changes" | "reject", rec = false) {
    setErr("");
    try { await api.decide(i.id, d, notes[i.id] ?? ""); if (rec) await api.recommend(i.id, true); await load(); onDone(); }
    catch (e) { setErr(msg(e)); }
  }
  if (items === null) return <p className="muted">Loading{err ? "" : "..."}</p>;
  return (
    <>
      {err && <p className="banner err" role="alert">{err}</p>}
      {items.length === 0 && <div className="card emptystate"><Icon name="check" size={28} /><div><h3>Nothing waiting</h3><p className="muted">New shares from learners appear here for approval.</p></div></div>}
      <ul className="stackcards">
        {items.map((i) => (
          <li key={i.id} className="card">
            <div className="row tight"><span className={"tag " + (i.kind === "video" ? "v" : "r")}>{i.kind === "video" ? "Video" : "Read"}</span>{i.topic_title && <Chip tone="info">{i.topic_title}</Chip>}<span className="muted small">by {i.author} · {when(i.submitted_at)}</span></div>
            <h3>{i.url ? <a href={i.url} target="_blank" rel="noopener noreferrer">{i.title}<span className="sr"> (opens in a new tab)</span></a> : i.title}</h3>
            {i.summary && <p>{i.summary}</p>}
            <label htmlFor={`rv-${i.id}`}>Note to the person (optional)</label>
            <textarea id={`rv-${i.id}`} rows={2} maxLength={2000} value={notes[i.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [i.id]: e.target.value }))} />
            <div className="row">
              <button type="button" className="btn" onClick={() => act(i, "approve")}>Approve</button>
              <button type="button" className="btn ghost" onClick={() => act(i, "approve", true)}>Approve and recommend</button>
              <button type="button" className="btn ghost" onClick={() => act(i, "request_changes")}>Ask for changes</button>
              <button type="button" className="btn ghost" onClick={() => act(i, "reject")}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The shared feed: anyone shares a video or blog; reviewers and the admin approve and recommend; everyone sees it, sorted as they choose. */
export default function Feed() {
  const { me, ready } = useMe();
  const { setEntry } = useStore();
  const [params, setParams] = useSearchParams();
  const { reviewerView: reviewer } = useView();
  const tab = params.get("tab") === "review" && reviewer ? "review" : params.get("tab") === "mine" ? "mine" : "feed";
  const [sort, setSort] = useState<api.Sort>("newest");
  const [topic, setTopic] = useState("");
  const [q, setQ] = useState("");
  const [topics, setTopics] = useState<api.Topic[]>([]);
  const [items, setItems] = useState<api.FeedItem[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [mine, setMine] = useState<api.MyItem[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [composer, setComposer] = useState(false);

  const load = useCallback(async () => {
    try {
      const [f, m] = await Promise.all([api.feed({ sort, topic: topic || undefined }), api.mine().catch(() => [])]);
      setItems(f.items); setNext(f.next); setMine(m); setErr("");
    } catch (e) { setErr(msg(e)); setItems([]); }
  }, [sort, topic]);
  useEffect(() => { if (API_URL && ready && me) void load(); }, [load, ready, me]);
  useEffect(() => { if (API_URL && ready && me) api.topics().then(setTopics).catch(() => setTopics([])); }, [ready, me]);
  // Opening the feed counts as having seen what is new.
  // only when the whole feed is on screen (not a topic, a search or another tab), so nothing new is marked seen unseen
  useEffect(() => { if (tab === "feed" && !topic && !q.trim() && items && items.length) setEntry(feedSeenKey, new Date().toISOString()); }, [items, tab, topic]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items ?? []).filter((i) => !t || `${i.title} ${i.summary ?? ""} ${i.author} ${i.topic_title}`.toLowerCase().includes(t));
  }, [items, q]);

  async function toggleRecommend(i: api.FeedItem) {
    try { const r = await api.recommend(i.id, !i.recommended); setItems((xs) => (xs ?? []).map((x) => (x.id === i.id ? { ...x, recommended: r.recommended ?? !i.recommended } : x))); }
    catch (e) { setErr(msg(e)); }
  }

  if (!API_URL) return <><header className="ph"><h1>Feed</h1></header><div className="card"><p className="muted">The feed needs the backend, which is not connected for this site.</p></div></>;
  if (ready && !me) return <><header className="ph"><h1>Feed</h1></header><div className="card" role="status"><p>Sign in with your office account to see and share in the feed.</p></div></>;

  const go = (t: string) => setParams(t === "feed" ? {} : { tab: t });
  return (
    <>
      <header className="ph fhead">
        <div>
          <h1>Feed</h1>
          <p className="muted">Videos and articles people in the programme found useful{items ? ` · ${items.length} shared` : ""}. {canReview(me) ? "Yours go straight into the feed." : "A reviewer checks each one, then everyone sees it."}</p>
        </div>
        <button type="button" className="btn" onClick={() => { setComposer(true); setParams({}); }}><Icon name="link" /> Share a link</button>
      </header>
      <div className="seg" role="tablist" aria-label="Feed views">
        <button type="button" role="tab" aria-selected={tab === "feed"} className={tab === "feed" ? "on" : ""} onClick={() => go("feed")}>Feed</button>
        <button type="button" role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "on" : ""} onClick={() => go("mine")}>My shares <small>{mine.length || ""}</small></button>
        {reviewer && <button type="button" role="tab" aria-selected={tab === "review"} className={tab === "review" ? "on" : ""} onClick={() => go("review")}>Waiting for approval</button>}
      </div>
      {note && <p className="callout ok" role="status">{note}</p>}
      {err && <p className="banner err" role="alert">{err} <button type="button" className="copy" onClick={load}>Try again</button></p>}

      {tab === "review" && <ReviewQueue onDone={load} />}

      {tab !== "review" && <ShareForm topics={topics} open={composer} onToggle={setComposer} onShared={(s) => { setNote(s === "approved" ? "Shared. It is in the feed now and everyone will see it." : "Shared. A reviewer will check it, then everyone sees it."); void load(); }} />}

      {tab === "mine" && (
        mine.length === 0 ? <p className="muted">You have not shared anything yet.</p> : (
          <ul className="stackcards">{mine.map((m) => { const [label, tone] = STATUS[m.status] ?? [m.status, "none"]; return (
            <li key={m.id} className="card"><div className="row tight"><Chip tone={tone}>{label}</Chip></div><h3>{m.title}</h3></li>); })}</ul>
        )
      )}

      {tab === "feed" && (
        <>
          <div className="fcontrols">
            <div className="fpills" role="group" aria-label="Topic">
              <button type="button" aria-pressed={!topic} className={!topic ? "on" : ""} onClick={() => setTopic("")}>All</button>
              {topics.map((t) => <button key={t.slug} type="button" aria-pressed={topic === t.slug} className={topic === t.slug ? "on" : ""} onClick={() => setTopic(topic === t.slug ? "" : t.slug)}>{t.title}</button>)}
            </div>
            <div className="frow">
              <div className="fsort" role="group" aria-label="Sort">
                {SORTS.map(([v, l]) => <button key={v} type="button" aria-pressed={sort === v} className={sort === v ? "on" : ""} onClick={() => setSort(v)}>{l}</button>)}
              </div>
              <label className="fsearch"><span className="sr">Search the feed</span><Icon name="compass" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, person, topic" /></label>
            </div>
          </div>
          {items === null ? <Skeleton /> : shown.length === 0
            ? <div className="card emptystate"><Icon name="link" size={28} /><div><h3>{q || topic ? "Nothing matches" : "Nothing here yet"}</h3><p className="muted">{q || topic ? "Try another topic or a shorter word." : "Be the first: share a video or an article that helped you."}</p>{!(q || topic) && <button type="button" className="btn" onClick={() => setComposer(true)}>Share a link</button>}</div></div>
            : (() => {
              const spot = sort === "newest" && !topic && !q.trim() ? shown.find((i) => i.recommended) : undefined;
              const rest = spot ? shown.filter((i) => i.id !== spot.id) : shown;
              return (
                <>
                  {spot && (
                    <section aria-labelledby="spot-h" className="fspot">
                      <h2 id="spot-h" className="eyebrow">Recommended by a reviewer</h2>
                      <ul className="fgrid one"><FeedCard item={spot} big playing={playing === spot.id} onPlay={setPlaying} reviewer={reviewer} onRecommend={toggleRecommend} /></ul>
                    </section>
                  )}
                  {rest.length > 0 && <ul className="fgrid">{rest.map((i) => <FeedCard key={i.id} item={i} playing={playing === i.id} onPlay={setPlaying} reviewer={reviewer} onRecommend={toggleRecommend} />)}</ul>}
                </>
              );
            })()}
          {next && <div className="row"><button type="button" className="btn ghost" onClick={async () => { try { const f = await api.feed({ sort, topic: topic || undefined, before: next }); setItems((xs) => [...(xs ?? []), ...f.items]); setNext(f.next); } catch (e) { setErr(msg(e)); } }}>Load more</button></div>}
        </>
      )}
    </>
  );
}
