import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** A grey block in the shape of content that is still loading. */
export function Skeleton({ w, h = 14, r, style }: { w?: number | string; h?: number; r?: number; style?: CSSProperties }) {
  return <span className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

/** Wraps skeletons so screen readers hear "Loading" once. */
export function Loading({ label = "Loading", children }: { label?: string; children: ReactNode }) {
  return <div aria-busy="true" role="status" aria-live="polite"><span className="sr">{label}</span>{children}</div>;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card skel-card">
      <Skeleton w="40%" h={16} />
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} w={i === lines - 1 ? "60%" : "100%"} />)}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <Loading>
      <div className="page-head"><Skeleton w={140} h={12} /><Skeleton w={220} h={28} style={{ marginTop: 10 }} /><Skeleton w="55%" style={{ marginTop: 12 }} /></div>
      <div className="stack"><CardSkeleton /><CardSkeleton lines={4} /><CardSkeleton lines={2} /></div>
    </Loading>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Loading label="Loading table">
      <div className="card flush">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="skel-row">{Array.from({ length: cols }, (_, c) => <Skeleton key={c} w={c === 0 ? "22%" : `${100 / cols - 4}%`} h={r === 0 ? 12 : 14} />)}</div>
        ))}
      </div>
    </Loading>
  );
}

/** Nothing here yet: says what to do next. */
export function EmptyState({ icon = "inbox", title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden="true"><Icon name={icon} size={22} /></span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

/** Something failed: says what, and offers to try again. */
export function ErrorState({ title = "Something went wrong", message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="empty error" role="alert">
      <span className="empty-icon" aria-hidden="true"><Icon name="alert" size={22} /></span>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && <div className="empty-action"><button type="button" className="btn secondary" onClick={onRetry}>Try again</button></div>}
    </div>
  );
}
