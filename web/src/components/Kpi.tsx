import { Icon, IconName } from "./Icon";

export function Kpi({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub: string }) {
  return (
    <div className="kpi"><div className="kh"><Icon name={icon} />{label}</div><div className="kv">{value}</div><div className="ks">{sub}</div></div>
  );
}
