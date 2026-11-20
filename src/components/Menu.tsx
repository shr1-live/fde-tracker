import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon, type IconName } from "./Icon";
import { closeLayer, openLayer } from "../lib/layers";

/** instant: run inside the click itself (needed for the clipboard on Safari). Otherwise the action runs once the menu's
 *  history entry is gone, so an action that navigates or opens a dialog starts from a clean history. */
export type MenuItem = { label: string; icon?: IconName; onSelect: () => void; danger?: boolean; instant?: boolean };

/** A "More" button that opens a small list of actions. Arrow keys move, Esc (or Android Back) closes and returns focus. */
export function Menu({ label, items, icon = "more" }: { label: string; items: MenuItem[]; icon?: IconName }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const layer = useRef<number | null>(null);
  const id = useId();
  const focusItem = (i: number) => {
    const els = list.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]");
    if (!els?.length) return;
    els[(i + els.length) % els.length]!.focus();
  };
  const show = () => { setOpen(true); layer.current = openLayer(() => { layer.current = null; setOpen(false); }); };
  const hide = (focus = true) => {
    setOpen(false);
    const l = layer.current; layer.current = null;
    if (focus) btn.current?.focus();
    return closeLayer(l);
  };
  useEffect(() => {
    if (!open) return;
    focusItem(0);
    const away = (e: PointerEvent) => { if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) void hide(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { void closeLayer(layer.current); }, []);
  const onKey = (e: KeyboardEvent) => {
    const els = [...(list.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
    const at = els.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") { e.preventDefault(); focusItem(at + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(at - 1); }
    else if (e.key === "Home") { e.preventDefault(); focusItem(0); }
    else if (e.key === "End") { e.preventDefault(); focusItem(els.length - 1); }
    else if (e.key === "Escape") { e.preventDefault(); void hide(); }
    else if (e.key === "Tab") void hide(false);
  };
  return (
    <div className="menu">
      <button ref={btn} type="button" className="iconbtn" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => (open ? void hide() : show())} onKeyDown={(e) => { if (e.key === "ArrowDown" && !open) { e.preventDefault(); show(); } }}>
        <Icon name={icon} />
      </button>
      {open && (
        <div ref={list} id={id} role="menu" aria-label={label} className="menu-list" onKeyDown={onKey}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" tabIndex={-1} className={"menu-item" + (it.danger ? " danger" : "")}
              onClick={() => { if (it.instant) { it.onSelect(); void hide(); } else void hide().then(it.onSelect); }}>
              {it.icon && <Icon name={it.icon} size={16} />}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
