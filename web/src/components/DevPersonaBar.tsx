import { getPersonas, setActive, useDevPersona } from "../lib/devPersona";
import { useMe } from "../lib/useRole";

/** DEV BUILDS ONLY: switch between test accounts to try the review flow locally. Renders nothing in production. */
export function DevPersonaBar() {
  const active = useDevPersona();
  const { me } = useMe();
  if (!import.meta.env.DEV) return null;
  const names = Object.keys(getPersonas());
  if (names.length === 0) return null;
  return (
    <div className="devbar" role="group" aria-label="Test accounts (development only)">
      <span className="overline">Test account (dev only)</span>
      <div className="themesw">
        {names.map((n) => <button key={n} type="button" aria-pressed={active === n} onClick={() => setActive(n)}>{n}</button>)}
      </div>
      <span className="meta">{me ? `Acting as ${me.email} (${me.role})` : "Checking who this is..."}</span>
    </div>
  );
}
