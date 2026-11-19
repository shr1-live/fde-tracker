import { NavLink } from "react-router-dom";
import { canManage, ROLE_LABEL, type Program } from "../lib/v3";
import { Chip } from "./Chip";

/** Title block shared by a program's pages, with tabs to its other pages. */
export function ProgramHeader({ program, page, intro }: { program: Pick<Program, "id" | "name" | "description" | "my_role">; page: string; intro?: string }) {
  const base = `/p/${program.id}`;
  const tabs: [string, string][] = [[base, "Plan"], [`${base}/daily`, "Daily status"], [`${base}/status`, "Program status"], [`${base}/reports`, "Reports"]];
  if (canManage(program.my_role)) tabs.push([`${base}/manage`, "Manage"]);
  return (
    <header className="ph">
      <p className="crumb">{program.name} <Chip tone="info">{ROLE_LABEL[program.my_role]}</Chip></p>
      <h1>{page}</h1>
      <p className="muted">{intro ?? program.description}</p>
      <nav className="ptabs noprint" aria-label={`${program.name} pages`}>
        {tabs.map(([to, label]) => <NavLink key={to} to={to} end>{label}</NavLink>)}
      </nav>
    </header>
  );
}
