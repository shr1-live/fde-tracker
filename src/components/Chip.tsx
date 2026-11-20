import type { ReactNode } from "react";

export type Tone = "ok" | "warn" | "bad" | "info" | "none";

/** A small status label. The words carry the meaning; the colour only backs them up. */
export function Chip({ tone = "none", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={"chip " + tone}>{children}</span>;
}
