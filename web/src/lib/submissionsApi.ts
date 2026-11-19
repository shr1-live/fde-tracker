import { ApiError, apiBlob, apiForm, apiJson } from "./api";

export type Status = "draft" | "submitted" | "changes_requested" | "approved";
export type Item = { id: string; kind: "link" | "file"; label: string; url: string | null; file_name: string | null; content_type: string | null; size_bytes: number | null; previewable: boolean };
export type ReviewNote = { decision: "approve" | "request_changes"; comment: string | null; reviewer: string; created_at: string };
export type Submission = {
  id: string; task_key: string; status: Status; note: string | null; learned: string | null; rating: number | null; author: string;
  submitted_at: string | null; reviewed_at: string | null; editable: boolean; items: Item[]; reviews: ReviewNote[];
};
export type Row = { id: string; task_key: string; status: Status; author: string; submitted_at: string | null; updated_at: string; item_count: number; last_comment: string | null };
export type Counts = { submitted: number; changes_requested: number; approved: number; drafts: number };

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md,.csv,.json,.log,.zip";

const base = (key: string) => `/api/submissions/${encodeURIComponent(key)}`;

// ---- a person's own submissions
export const mine = () => apiJson<Row[]>("GET", "/api/submissions");

/** The person's submission for a task, or null when they have not started one. */
export async function get(taskKey: string): Promise<Submission | null> {
  try { return await apiJson<Submission>("GET", base(taskKey)); }
  catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e; }
}
export const saveDetails = (taskKey: string, d: { note: string; learned: string; rating: number | null }) => apiJson<Submission>("PUT", base(taskKey), d);
export const addLink = (taskKey: string, label: string, url: string) => apiJson<Submission>("POST", `${base(taskKey)}/links`, { label, url });
export function addFile(taskKey: string, file: File, label: string) {
  const form = new FormData();
  form.append("file", file);
  if (label.trim()) form.append("label", label.trim());
  return apiForm<Submission>(`${base(taskKey)}/files`, form);
}
export const removeItem = (taskKey: string, itemId: string) => apiJson<Submission>("DELETE", `${base(taskKey)}/items/${itemId}`);
export const withdraw = (taskKey: string) => apiJson<Submission>("POST", `${base(taskKey)}/withdraw`);
export const submit = (taskKey: string) => apiJson<Submission>("POST", `${base(taskKey)}/submit`);
export const fileBlob = (itemId: string) => apiBlob(`/api/submissions/items/${itemId}/file`);

// ---- reviewers and admins
export const reviewList = (status: string) => apiJson<Row[]>("GET", `/api/review/submissions?status=${encodeURIComponent(status)}`);
export const reviewCounts = () => apiJson<Counts>("GET", "/api/review/submissions/counts");
export const reviewDetail = (id: string) => apiJson<Submission>("GET", `/api/review/submissions/${id}`);
export const decide = (id: string, decision: "approve" | "request_changes", comment: string) =>
  apiJson<Submission>("POST", `/api/review/submissions/${id}`, { decision, comment: comment.trim() || undefined });

/** Saves a file the person asked for. The browser's download name comes from the server's cleaned name. */
export async function download(item: Item) {
  const blob = await fileBlob(item.id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = item.file_name ?? "proof";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
