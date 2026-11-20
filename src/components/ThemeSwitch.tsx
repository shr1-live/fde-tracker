import { useState } from "react";
import { Theme, applyTheme, getTheme } from "../lib/theme";
import { Icon, type IconName } from "./Icon";

const OPTS: [Theme, string, IconName][] = [["system", "System", "monitor"], ["light", "Light", "sun"], ["dark", "Dark", "moon"]];

/** Light, dark, or follow the system. compact shows icons only (each still has a name). */
export default function ThemeSwitch({ compact }: { compact?: boolean }) {
  const [t, setT] = useState<Theme>(getTheme());
  const set = (n: Theme) => { applyTheme(n); setT(n); };
  return (
    <div className={"themesw" + (compact ? " compact" : "")} role="group" aria-label="Colour theme">
      {OPTS.map(([n, label, ic]) => (
        <button key={n} type="button" aria-pressed={t === n} onClick={() => set(n)} aria-label={compact ? label : undefined} title={label}>
          <Icon name={ic} size={14} />{!compact && label}
        </button>
      ))}
    </div>
  );
}
