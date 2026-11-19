// People, roles and batches, managed by the admin through the backend. The backend enforces every rule; these are just the calls.
import { apiJson } from "./api";

export type Person = {
  id: string; email: string; display_name: string | null; stack_id: string | null; role: "member" | "reviewer" | "admin";
  access_status: "pending" | "approved" | "rejected"; created_at: string; last_seen_at: string; batch_id?: string | null; batch_name?: string | null;
};
export type Batch = { id: string; name: string; starts_on: string; members?: number };

export const people = () => apiJson<Person[]>("GET", "/api/admin/users");
export const setAccess = (id: string, status: Person["access_status"]) => apiJson<unknown>("POST", `/api/admin/users/${id}/access`, { status });
export const setRole = (id: string, role: "member" | "reviewer") => apiJson<unknown>("POST", `/api/admin/users/${id}/role`, { role });
export const setBatch = (id: string, batch_id: string | null) => apiJson<unknown>("POST", `/api/admin/users/${id}/batch`, { batch_id });

export const batches = () => apiJson<Batch[]>("GET", "/api/admin/batches");
export const createBatch = (name: string, starts_on: string) => apiJson<Batch>("POST", "/api/admin/batches", { name: name.trim(), starts_on });
