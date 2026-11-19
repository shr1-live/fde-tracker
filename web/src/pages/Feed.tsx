import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "../lib/api";
import { useMe } from "../lib/useRole";
import { feed, type FeedKind, type FeedSort, type Post } from "../lib/v3";
import { errText } from "../lib/useProgram";
import { Icon, type IconName } from "../components/Icon";
import { Composer } from "../components/feed/Composer";
import { PostCard, PostSkeleton } from "../components/feed/PostCard";
import { EmptyState, ErrorState, Loading } from "../components/States";

const SORTS: [FeedSort, string][] = [["new", "Newest"], ["top", "Most liked"], ["discussed", "Most discussed"]];
type Show = FeedKind | "mine";
const SHOWS: [Show, string, IconName][] = [["all", "All", "grid"], ["video", "Videos", "video"], ["link", "Links", "link"], ["text", "Text", "text"], ["mine", "My posts", "user"]];

export default function Feed() {
  const { me } = useMe();
  const [sp, setSp] = useSearchParams();
  const sort: FeedSort = SORTS.some(([k]) => k === sp.get("sort")) ? (sp.get("sort") as FeedSort) : "new";
  const mine = sp.get("mine") === "1";
  const kind: FeedKind = !mine && ["video", "link", "text"].includes(sp.get("kind") ?? "") ? (sp.get("kind") as FeedKind) : "all";
  const show: Show = mine ? "mine" : kind;
  const q = sp.get("q") ?? "";
  const [search, setSearch] = useState(q);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pages = useRef(1);
  const seq = useRef(0);
  const composer = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const setParam = useCallback((patch: Record<string, string | null>) => {
    setSp((cur) => {
      const n = new URLSearchParams(cur);
      for (const [k, v] of Object.entries(patch)) { if (v === null || v === "") n.delete(k); else n.set(k, v); }
      return n;
    }, { replace: true });
  }, [setSp]);

  // Search is debounced: the server is asked 350 ms after typing stops.
  useEffect(() => { setSearch(q); }, [q]);
  useEffect(() => {
    if (search.trim() === q) return;
    const t = window.setTimeout(() => setParam({ q: search.trim() || null }), 350);
    return () => window.clearTimeout(t);
  }, [search, q, setParam]);

  const load = useCallback(async (quiet = false) => {
    const my = ++seq.current;
    if (!quiet) setLoading(true);
    try {
      const r = await feed.list({ sort, kind, mine, q });
      if (my !== seq.current) return;
      setPosts(r.items); setCursor(r.next_cursor); setErr(""); pages.current = 1;
    } catch (e) { if (my === seq.current) { setErr(errText(e, "Could not load the feed.")); setPosts((x) => x ?? []); } }
    finally { if (my === seq.current) setLoading(false); }
  }, [sort, kind, mine, q]);

  useEffect(() => {
    if (!API_URL) return;
    void load();
    // Refresh the first page every minute while the tab is visible, unless older pages were loaded.
    const t = window.setInterval(() => { if (document.visibilityState === "visible" && pages.current === 1) void load(true); }, 60000);
    return () => window.clearInterval(t);
  }, [load]);

  if (!API_URL) return <div className="content narrow"><header className="page-head"><h1>Feed</h1></header><ErrorState title="Not connected" message="The feed needs the backend, which is not connected for this site." /></div>;

  const more = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    const before = posts?.length ?? 0;
    const my = seq.current; // a cursor belongs to the sort and filters it came from
    try {
      const r = await feed.list({ sort, kind, mine, q, cursor });
      if (my !== seq.current) return;
      setPosts((all) => [...(all ?? []), ...r.items.filter((x) => !(all ?? []).some((y) => y.id === x.id))]);
      setCursor(r.next_cursor); pages.current++;
      // Keyboard users continue from the first new post.
      setTimeout(() => listRef.current?.querySelectorAll<HTMLElement>("article.post")[before]?.focus(), 0);
    } catch (e) { setErr(errText(e)); } finally { setLoadingMore(false); }
  };
  const update = (p: Post) => setPosts((all) => all?.map((x) => (x.id === p.id ? p : x)) ?? null);
  const removed = (id: string) => {
    const all = posts ?? [];
    const i = all.findIndex((x) => x.id === id);
    const nextId = all[i + 1]?.id ?? all[i - 1]?.id;
    setPosts(all.filter((x) => x.id !== id));
    setTimeout(() => { const el = nextId ? document.querySelector<HTMLElement>(`[data-post="${nextId}"]`) : null; (el ?? composer.current)?.focus(); }, 0);
  };
  const posted = (p: Post) => {
    setPosts((all) => [p, ...(all ?? [])]);
    setTimeout(() => document.querySelector<HTMLElement>(`[data-post="${p.id}"]`)?.focus(), 0);
  };
  const name = me?.display_name || me?.email?.split("@")[0] || "You";
  const filtered = show !== "all" || q !== "";
  const clear = () => { setSearch(""); setParam({ kind: null, mine: null, q: null }); };

  let list;
  if (posts === null) list = <Loading label="Loading posts"><div className="stack"><PostSkeleton /><PostSkeleton /></div></Loading>;
  else if (err && posts.length === 0) list = <ErrorState title="Could not load the feed" message={err} onRetry={() => void load()} />;
  else if (posts.length === 0) {
    list = filtered
      ? <EmptyState icon="search" title="No posts match" action={<button type="button" className="btn secondary" onClick={clear}>Clear filters</button>}>Try another word, or show all posts.</EmptyState>
      : <EmptyState icon="rss" title="No posts yet" action={<button type="button" className="btn" onClick={() => composer.current?.focus()}>Write the first post</button>}>Share a useful video, an article, or something you built. Everyone in every program sees it.</EmptyState>;
  } else {
    list = (
      <div ref={listRef} className={"stack posts" + (loading ? " is-loading" : "")} aria-busy={loading}>
        {posts.map((p) => <PostCard key={p.id} post={p} meId={me?.id} isAdmin={me?.role === "admin"} onChange={update} onRemoved={removed} />)}
      </div>
    );
  }

  return (
    <div className="content narrow">
      <header className="page-head">
        <h1>Feed</h1>
        <p className="page-sub">Everyone in every program sees this. Share a useful video or article, or something you built.</p>
      </header>
      <Composer ref={composer} name={name} onPosted={posted} />
      <section className="feed-tools" aria-label="Sort and filter posts">
        <div className="feed-tools-row">
          <div className="search">
            <Icon name="search" size={16} />
            <label htmlFor="feed-q" className="sr">Search posts</label>
            <input id="feed-q" type="search" placeholder="Search posts and links" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={100} />
          </div>
          <div className="select-wrap sortsel">
            <Icon name="sort" size={16} />
            <label htmlFor="feed-sort" className="sr">Sort posts</label>
            <select id="feed-sort" value={sort} onChange={(e) => setParam({ sort: e.target.value === "new" ? null : e.target.value })}>
              {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="fchips" role="group" aria-label="Show">
          {SHOWS.map(([k, l, ic]) => (
            <button key={k} type="button" className="fchip" aria-pressed={show === k}
              onClick={() => setParam(k === "mine" ? { mine: "1", kind: null } : { mine: null, kind: k === "all" ? null : k })}>
              <Icon name={ic} size={14} />{l}
            </button>
          ))}
        </div>
      </section>
      {err && posts && posts.length > 0 && <p className="banner error" role="alert">{err}</p>}
      {list}
      {posts && posts.length > 0 && (
        cursor
          ? <div className="more"><button type="button" className="btn secondary" onClick={more} disabled={loadingMore}>{loadingMore ? "Loading" : "Show more posts"}</button></div>
          : <p className="end-note">You are all caught up.</p>
      )}
    </div>
  );
}
