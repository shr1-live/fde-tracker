import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../lib/api";
import { useMe } from "../lib/useRole";
import { feed, type Post } from "../lib/v3";
import { errText } from "../lib/useProgram";
import { PostCard, PostSkeleton } from "../components/feed/PostCard";
import { EmptyState, ErrorState, Loading } from "../components/States";
import { Icon } from "../components/Icon";

/** One post with all its comments, at /post/:id (the link people copy). */
export default function PostPage() {
  const { id = "" } = useParams();
  const { me } = useMe();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "error">("loading");
  const [err, setErr] = useState("");
  const load = () => {
    setState("loading");
    feed.get(id).then((p) => { setPost(p); setState("ok"); })
      .catch((e) => { if (e instanceof ApiError && e.status === 404) setState("missing"); else { setErr(errText(e)); setState("error"); } });
  };
  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="content narrow">
      <Link to="/" className="back"><Icon name="left" size={16} />Back to the feed</Link>
      <h1 className="sr">Post</h1>
      {state === "loading" && <Loading label="Loading the post"><PostSkeleton /></Loading>}
      {state === "missing" && <EmptyState icon="inbox" title="This post is not here" action={<Link className="btn" to="/">Go to the feed</Link>}>It may have been deleted by its author.</EmptyState>}
      {state === "error" && <ErrorState title="Could not load the post" message={err} onRetry={load} />}
      {state === "ok" && post && (
        <PostCard post={post} meId={me?.id} isAdmin={me?.role === "admin"} single onChange={setPost} onRemoved={() => navigate("/", { replace: true })} />
      )}
    </div>
  );
}
