import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; text: string };
type Ctx = { success: (t: string) => void; error: (t: string) => void; info: (t: string) => void };

const C = createContext<Ctx>({ success: () => {}, error: () => {}, info: () => {} });
/** Short messages about the result of an action (saved, deleted, copied). Validation stays next to the field. */
export const useToast = () => useContext(C);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const next = useRef(1);
  const close = useCallback((id: number) => setList((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((tone: Tone, text: string) => {
    const id = next.current++;
    setList((l) => [...l.filter((t) => t.text !== text), { id, tone, text }].slice(-4));
    window.setTimeout(() => close(id), tone === "error" ? 7000 : 4500);
  }, [close]);
  const api = useMemo<Ctx>(() => ({ success: (t) => push("success", t), error: (t) => push("error", t), info: (t) => push("info", t) }), [push]);
  return (
    <C.Provider value={api}>
      {children}
      <div className="toasts" aria-label="Notifications" role="region">
        {list.map((t) => (
          <div key={t.id} className={"toast " + t.tone} role={t.tone === "error" ? "alert" : "status"}>
            <span className="toast-icon" aria-hidden="true"><Icon name={t.tone === "error" ? "alert" : t.tone === "success" ? "check" : "bell"} size={16} /></span>
            <p>{t.text}</p>
            <button type="button" className="iconbtn sm" aria-label="Dismiss notification" onClick={() => close(t.id)}><Icon name="x" size={14} /></button>
          </div>
        ))}
      </div>
    </C.Provider>
  );
}
