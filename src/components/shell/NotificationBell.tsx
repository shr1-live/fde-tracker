import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../Icon";
import { usePopover } from "../../lib/usePopover";
import { ago, notifications, type Notification } from "../../lib/v3";

const POLL_MS = 5 * 60 * 1000;

/** The bell in the top bar: daily status reminders (sent at 10:00 for every program you missed the day before). */
export function NotificationBell() {
  const { open, toggle, hide, box, btn } = usePopover();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try { const r = await notifications.list(); setItems(r.items); setUnread(r.unread); } catch { /* the bell is a nicety; a failed check changes nothing */ }
  }, []);
  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    const vis = () => void load();
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("fde:daily-saved", vis); // saving a missed day settles its reminder
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", vis); window.removeEventListener("fde:daily-saved", vis); };
  }, [load]);
  const go = async (n: Notification) => {
    await hide(false);
    if (!n.read) { setUnread((u) => Math.max(0, u - 1)); setItems((all) => all.map((x) => (x.id === n.id ? { ...x, read: true } : x))); void notifications.read(n.id).catch(() => undefined); }
    if (n.link?.startsWith("/")) navigate(n.link);
  };
  const readAll = async () => {
    setUnread(0); setItems((all) => all.map((x) => ({ ...x, read: true })));
    try { await notifications.readAll(); } catch { void load(); }
  };
  return (
    <div className="menu bell" ref={box}>
      <button ref={btn} type="button" className="iconbtn" aria-haspopup="true" aria-expanded={open} onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} title="Notifications">
        <Icon name="bell" />
        {unread > 0 && <span className="bell-count" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="menu-list bell-list" role="region" aria-label="Notifications">
          <div className="bell-head">
            <b>Notifications</b>
            {unread > 0 && <button type="button" className="btn ghost sm" onClick={() => void readAll()}>Mark all read</button>}
          </div>
          {items.length === 0 ? (
            <p className="meta bell-empty">Nothing yet. If you miss a daily status, a reminder shows up here at 10:00 the next working day.</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button type="button" className={"menu-item bell-item" + (n.read ? "" : " unread")} onClick={() => void go(n)}>
                    <Icon name="daily" size={16} />
                    <span className="grow"><span className="bell-title">{n.title}</span><span className="meta">{n.body}</span><span className="meta">{ago(n.created_at)}</span></span>
                    {!n.read && <span className="dot" aria-label="Unread" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
