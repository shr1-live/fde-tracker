import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon, type IconName } from "./Icon";

export type MenuItem = { label: string; icon?: IconName; onSelect: () => void; danger?: boolean };

/** A "More" button that opens a small list of actions. Arrow keys move, Esc closes and returns focus. */
export function Menu({ label, items, icon = "more" }: { label: string; items: MenuItem[]; icon?: IconName }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const focusItem = (i: number) => {
    const els = list.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]");
    if (!els?.length) return;
    els[(i + els.length) % els.length]!.focus();
  };
  useEffect(() => {
    if (!open) return;
    focusItem(0);
    const away = (e: MouseEvent) => { if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  const onKey = (e: KeyboardEvent) => {
    const els = [...(list.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
    const at = els.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") { e.preventDefault(); focusItem(at + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(at - 1); }
    else if (e.key === "Home") { e.preventDefault(); focusItem(0); }
    else if (e.key === "End") { e.preventDefault(); focusItem(els.length - 1); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); btn.current?.focus(); }
    else if (e.key === "Tab") setOpen(false);
  };
  return (
    <div className="menu">
      <button ref={btn} type="button" className="iconbtn" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)} onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); } }}>
        <Icon name={icon} />
      </button>
      {open && (
        <div ref={list} id={id} role="menu" aria-label={label} className="menu-list" onKeyDown={onKey}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" tabIndex={-1} className={"menu-item" + (it.danger ? " danger" : "")}
              onClick={() => { setOpen(false); btn.current?.focus(); it.onSelect(); }}>
              {it.icon && <Icon name={it.icon} size={16} />}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
