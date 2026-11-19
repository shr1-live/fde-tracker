import { Icon, IconName } from "./Icon";
import type { Status } from "../lib/submissionsApi";

const LOOK: Record<Status, { label: string; cls: string; icon: IconName }> = {
  draft: { label: "Draft", cls: "st-draft", icon: "file" },
  submitted: { label: "Waiting for review", cls: "st-pending", icon: "clock" },
  changes_requested: { label: "Changes requested", cls: "st-rejected", icon: "alert" },
  approved: { label: "Approved", cls: "st-approved", icon: "check" },
};

/** Status as an icon plus words: colour is never the only signal. */
export function StatusTag({ status }: { status: Status }) {
  const l = LOOK[status];
  return <span className={"tag " + l.cls}><Icon name={l.icon} size={13} /> {l.label}</span>;
}

export const NOT_SUBMITTED = <span className="tag st-draft">Not submitted</span>;
