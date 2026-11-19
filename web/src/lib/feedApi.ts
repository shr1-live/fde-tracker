// The shared feed: videos, blogs and notes that people in the programme share. Reviewers and the admin approve and recommend.
import { apiJson } from "./api";

export type Kind = "video" | "article" | "link" | "note";
export type Sort = "newest" | "oldest" | "title" | "recommended";
export type Topic = { slug: string; title: string; description?: string | null };
export type FeedItem = {
  id: string; title: string; summary: string | null; kind: Kind; url: string | null; stack_id: string | null;
  approved_at: string | null; topic: string; topic_title: string; author: string; recommended?: boolean;
};
export type MyItem = { id: string; title: string; status: "draft" | "in_review" | "changes_requested" | "approved" | "rejected"; kind?: Kind; url?: string | null; created_at?: string; updated_at?: string };
export type QueueItem = { id: string; title: string; kind: Kind; url?: string | null; summary?: string | null; stack_id: string | null; submitted_at: string | null; topic: string; topic_title?: string; author: string };

export const topics = () => apiJson<Topic[]>("GET", "/api/topics");

export function feed(opts: { sort?: Sort; topic?: string; limit?: number; before?: string } = {}) {
  const q = new URLSearchParams();
  if (opts.before) q.set("before", opts.before);
  if (opts.sort && opts.sort !== "newest") q.set("sort", opts.sort);
  if (opts.topic) q.set("topic", opts.topic);
  q.set("limit", String(opts.limit ?? 50));
  return apiJson<{ items: FeedItem[]; next: string | null }>("GET", `/api/feed?${q}`);
}

export const mine = () => apiJson<MyItem[]>("GET", "/api/content/mine");

/** Shares a link. A reviewer's or the admin's share goes straight to the feed; a member's waits for a reviewer. */
export const share = (b: { topic: string; kind: Kind; title: string; url: string; summary?: string }) =>
  apiJson<{ id: string; status: MyItem["status"] }>("POST", "/api/content", { ...b, summary: b.summary?.trim() || undefined, submit: true });

export const recommend = (id: string, recommended: boolean) => apiJson<FeedItem>("POST", `/api/content/${id}/recommend`, { recommended });

export const queue = () => apiJson<QueueItem[]>("GET", "/api/review/queue");
export const decide = (id: string, decision: "approve" | "request_changes" | "reject", comment: string) =>
  apiJson<{ status: string }>("POST", `/api/review/${id}`, { decision, comment: comment.trim() || undefined });

/** Video for YouTube links, otherwise a link (an "article" would need body text the share form does not ask for). */
export const kindFor = (url: string): Kind => /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(url.trim()) ? "video" : "link";
