import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./api";
import { programs, type Program } from "./v3";

const cache = new Map<string, Program>();

/** One program (plan + forms + my role). Cached per program so moving between its pages is instant; reload() refetches. */
export function useProgram(id: string | undefined) {
  const [program, setProgram] = useState<Program | null>(() => (id ? cache.get(id) ?? null : null));
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const p = await programs.get(id);
      cache.set(id, p);
      setProgram(p); setError("");
    } catch (e) {
      setError(e instanceof ApiError ? (e.status === 403 || e.status === 404 ? "You are not part of this program, or it no longer exists." : e.message) : "Could not load the program.");
    }
  }, [id]);
  useEffect(() => { setProgram(id ? cache.get(id) ?? null : null); void reload(); }, [id, reload]);
  return { program, error, reload };
}

/** Days grouped by week, in order. */
export function byWeek<T extends { week: number; day: number }>(days: T[]): [number, T[]][] {
  const m = new Map<number, T[]>();
  for (const d of [...days].sort((a, b) => a.week - b.week || a.day - b.day)) m.set(d.week, [...(m.get(d.week) ?? []), d]);
  return [...m.entries()];
}

export const errText = (e: unknown, fallback = "Something went wrong. Try again.") => (e instanceof ApiError ? e.message : fallback);
