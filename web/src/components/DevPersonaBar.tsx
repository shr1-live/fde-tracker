import { getPersonas, setActive, useDevPersona } from "../lib/devPersona";
import { useMe } from "../lib/useRole";

/** DEV BUILDS ONLY: switch between test accounts to try the review flow locally. Renders nothing in production. */
export function DevPersonaBar() {
  const active = useDevPersona();
  const { me } = useMe();
  if (!import.meta.env.DEV) return null;
  const names = Object.keys(getPersonas());
  if (names.length === 0) return null;
  const who = me ? `Acting as ${me.email} (${me.role})` : "Checking who this is";
  return (
    <div className="devbar" role="group" aria-label="Test account (development only)" title={who}>
      <span className="devtag" aria-hidden="true">Dev</span>
      <div className="themesw devsw">
        {names.map((n) => <button key={n} type="button" aria-pressed={active === n} onClick={() => setActive(n)} title={n}>{n.length > 7 ? n.slice(0, 5) + "." : n}</button>)}
      </div>
    </div>
  );
}
