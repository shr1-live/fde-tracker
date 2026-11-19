// Per-person progress reports, built by the backend from submissions and reviews.
// Learners can read only their own; reviewers and the admin can read everyone's (the backend enforces this).
import { apiJson } from "./api";
import type { Status } from "./submissionsApi";

export type ReportDay = {
  task_key: string; status: Status; rating: number | null; learned: string | null; note: string | null;
  submitted_at: string | null; reviewed_at: string | null; updated_at: string | null; item_count: number;
  last_decision: "approve" | "request_changes" | null; last_comment: string | null; last_reviewer: string | null;
};
export type Totals = { submitted: number; approved: number; changes_requested: number; drafts: number; avg_rating: number | null };
export type PersonReport = { person: { id: string; name: string; batch: { id: string; name: string; starts_on: string } | null }; days: ReportDay[]; totals: Totals };
export type PersonRow = {
  id: string; name: string; batch_name: string | null; batch_starts_on: string | null;
  submitted: number; approved: number; changes_requested: number; drafts: number; avg_rating: number | null; last_activity: string | null;
};

export const myReport = () => apiJson<PersonReport>("GET", "/api/reports/me");
export const people = (batch?: string) => apiJson<PersonRow[]>("GET", `/api/reports/people${batch ? `?batch=${encodeURIComponent(batch)}` : ""}`);
export const personReport = (id: string) => apiJson<PersonReport>("GET", `/api/reports/people/${encodeURIComponent(id)}`);
