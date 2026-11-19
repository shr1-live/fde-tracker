// Progress bar with the right accessibility role: screen readers announce "label, 40 percent".
export function Progress({ value, label, small = false }: { value: number; label: string; small?: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={"meter" + (small ? " small" : "")} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <i style={{ width: pct + "%" }} />
    </div>
  );
}
