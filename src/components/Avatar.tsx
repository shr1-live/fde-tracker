import { hue, initials } from "../lib/text";

/** Initials on a tinted circle. Decorative: the name is always written next to it. */
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  return <span className={"avatar " + size} style={{ ["--h" as string]: hue(name) }} aria-hidden="true">{initials(name)}</span>;
}
