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
      <small>Test account (dev only)</small>
      <div className="themesw">
        {names.map((n) => <button key={n} type="button" aria-pressed={active === n} onClick={() => setActive(n)}>{n}</button>)}
      </div>
      <small>{me ? `Acting as ${me.email} (${me.role})` : "Checking who this is..."}</small>
    </div>
  );
}
