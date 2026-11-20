import { useCallback, useEffect, useRef, useState } from "react";
import { closeLayer, openLayer } from "./layers";

/**
 * Open/close state for a small panel under (or beside) a button: a tap outside, Esc or Android Back closes it,
 * and focus goes back to the button. `box` wraps both the button and the panel.
 */
export function usePopover<B extends HTMLElement = HTMLButtonElement>() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<B>(null);
  const layer = useRef<number | null>(null);
  const hide = useCallback((focus = true) => {
    setOpen(false);
    const l = layer.current; layer.current = null;
    if (focus) btn.current?.focus();
    return closeLayer(l);
  }, []);
  const show = useCallback(() => { setOpen(true); layer.current = openLayer(() => { layer.current = null; setOpen(false); }); }, []);
  const toggle = useCallback(() => (layer.current ? void hide() : show()), [hide, show]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) void hide(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); void hide(); } };
    document.addEventListener("pointerdown", away);
    box.current?.addEventListener("keydown", esc);
    const b = box.current;
    return () => { document.removeEventListener("pointerdown", away); b?.removeEventListener("keydown", esc); };
  }, [open, hide]);
  useEffect(() => () => { void closeLayer(layer.current); }, []);
  return { open, show, hide, toggle, box, btn };
}
