import { useState } from "react";
import { Theme, applyTheme, getTheme } from "../lib/theme";

export default function ThemeSwitch() {
  const [t, setT] = useState<Theme>(getTheme());
  const set = (n: Theme) => { applyTheme(n); setT(n); };
  return (
    <div className="themesw" role="group" aria-label="Colour theme">
      {(["system", "light", "dark"] as Theme[]).map((n) => (
        <button key={n} type="button" aria-pressed={t === n} onClick={() => set(n)}>{n[0].toUpperCase() + n.slice(1)}</button>
      ))}
    </div>
  );
}
