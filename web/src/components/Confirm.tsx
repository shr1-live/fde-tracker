import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";

export type ConfirmOptions = { title: string; body?: string; confirm: string; cancel?: string; danger?: boolean };
type Ask = (o: ConfirmOptions) => Promise<boolean>;

const C = createContext<Ask>(async () => false);
/** Asks the person to confirm an action in a modal dialog. Resolves true when they confirm. */
export const useConfirm = () => useContext(C);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const id = useId();
  const ask = useCallback<Ask>((o) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    opener.current = document.activeElement as HTMLElement | null;
    resolver.current = resolve;
    setOpts(o);
  }), []);
  useEffect(() => {
    const d = ref.current;
    if (opts && d && !d.open) {
      d.showModal();
      d.querySelector<HTMLButtonElement>("[data-autofocus]")?.focus();
    }
  }, [opts]);
  const finish = (v: boolean) => {
    const d = ref.current;
    if (d?.open) d.close();
    resolver.current?.(v); resolver.current = null;
    setOpts(null);
    const back = opener.current;
    if (back && document.contains(back)) back.focus();
  };
  return (
    <C.Provider value={ask}>
      {children}
      <dialog ref={ref} className="dialog" aria-labelledby={`${id}-t`} aria-describedby={opts?.body ? `${id}-b` : undefined}
        onCancel={(e) => { e.preventDefault(); finish(false); }}
        onClick={(e) => { if (e.target === ref.current) finish(false); }}>
        {opts && (
          <div className="dialog-inner">
            <h2 id={`${id}-t`}>{opts.title}</h2>
            {opts.body && <p id={`${id}-b`}>{opts.body}</p>}
            <div className="dialog-actions">
              <button type="button" className="btn secondary" data-autofocus onClick={() => finish(false)}>{opts.cancel ?? "Cancel"}</button>
              <button type="button" className={"btn" + (opts.danger ? " danger" : "")} onClick={() => finish(true)}>{opts.confirm}</button>
            </div>
          </div>
        )}
      </dialog>
    </C.Provider>
  );
}
