import { useWork } from "../lib/work";

/** Says whether the numbers next to it refresh by themselves. Words carry the meaning; the dot is only decoration. */
export function LiveBadge() {
  const w = useWork();
  const server = w.source === "server" && !w.error;
  return (
    <span className={"live" + (server ? "" : " off")} role="status">
      <i aria-hidden="true" />
      {server && w.updatedAt
        ? <>Live, updated {w.updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</>
        : "Updates as you tick"}
      {w.error && <button type="button" className="copy" onClick={w.refresh}>Try again</button>}
    </span>
  );
}
