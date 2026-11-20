import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { canManage, ROLE_LABEL, type Program } from "../lib/v3";
import { Chip } from "./Chip";

/** Title block shared by a program's pages. The tabs show on phones, where the sidebar is a drawer. */
export function ProgramHeader({ program, page, intro, actions }: { program: Pick<Program, "id" | "name" | "description" | "my_role">; page: string; intro?: string; actions?: ReactNode }) {
  const base = `/p/${program.id}`;
  const tabs: [string, string][] = [[base, "Plan"], [`${base}/daily`, "Daily"], [`${base}/status`, "Status"], [`${base}/reports`, "Reports"]];
  if (canManage(program.my_role)) tabs.push([`${base}/manage`, "Manage"]);
  return (
    <header className="page-head">
      <div className="page-head-row">
        <div className="grow">
          <p className="eyebrow">{program.name} <Chip tone="info">{ROLE_LABEL[program.my_role]}</Chip></p>
          <h1>{page}</h1>
          {(intro ?? program.description) && <p className="page-sub">{intro ?? program.description}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      <nav className="ptabs" aria-label={`${program.name} pages`}>
        {tabs.map(([to, label]) => <NavLink key={to} to={to} end>{label}</NavLink>)}
      </nav>
    </header>
  );
}

/** Heading for pages that are not inside a program. */
export function PageHeader({ title, intro, actions }: { title: string; intro?: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head-row">
        <div className="grow"><h1>{title}</h1>{intro && <p className="page-sub">{intro}</p>}</div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </header>
  );
}
