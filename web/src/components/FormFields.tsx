import { useId, useState } from "react";
import type { Field, Values } from "../lib/v3";

/** The (i) button next to a field: shows the description the coordinator wrote for it. */
export function InfoButton({ label, text }: { label: string; text: string | null }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!text) return null;
  return (
    <>
      <button type="button" className="infobtn" aria-expanded={open} aria-controls={id} aria-label={`About ${label}`} title={text} onClick={() => setOpen((o) => !o)}>i</button>
      {open && <span id={id} className="infotext" role="note">{text}</span>}
    </>
  );
}

const RATING_HINT = ["Needs significant guidance", "Understands some concepts, needs frequent help", "Can implement with some guidance", "Independently implements, tests, troubleshoots", "Customer-ready, explains trade-offs, edge cases"];

/** One input per form field, typed by the field. Errors come from checkValues. */
export function FormFields({ fields, values, onChange, errors, idPrefix, disabled }: {
  fields: Field[]; values: Values; onChange: (v: Values) => void; errors: Record<string, string>; idPrefix: string; disabled?: boolean;
}) {
  const set = (k: string, v: string) => onChange({ ...values, [k]: v });
  return (
    <div className="ffields">
      {fields.map((f) => {
        const id = `${idPrefix}-${f.key}`;
        const v = values[f.key] ?? "";
        const err = errors[f.key];
        const common = { id, disabled, "aria-invalid": !!err || undefined, "aria-describedby": err ? `${id}-err` : undefined };
        return (
          <div key={f.key} className="ffield">
            <div className="flabel">
              <label htmlFor={id}>{f.label}{f.required && <span className="req" aria-label="required"> *</span>}</label>
              <InfoButton label={f.label} text={f.description} />
            </div>
            {f.type === "longtext" ? <textarea {...common} rows={4} maxLength={4000} value={String(v)} onChange={(e) => set(f.key, e.target.value)} />
              : f.type === "rating" ? (
                <select {...common} value={String(v)} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">Choose 1 to 5</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}: {RATING_HINT[n - 1]}</option>)}
                </select>
              ) : f.type === "number" ? <input {...common} type="number" min={0} max={1000} step="0.5" value={String(v)} onChange={(e) => set(f.key, e.target.value)} />
              : f.type === "url" ? <input {...common} type="url" inputMode="url" placeholder="https://" maxLength={500} value={String(v)} onChange={(e) => set(f.key, e.target.value)} />
              : <input {...common} type="text" maxLength={500} value={String(v)} onChange={(e) => set(f.key, e.target.value)} />}
            {err && <p id={`${id}-err`} className="small err">{err}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** Read-only view of saved values ("Label: value" lines). */
export function ValuesView({ fields, values }: { fields: Field[]; values: Values }) {
  const shown = fields.filter((f) => values[f.key] !== undefined && String(values[f.key]).trim() !== "");
  if (!shown.length) return <p className="small muted">Nothing filled in.</p>;
  return (
    <dl className="vals">
      {shown.map((f) => (
        <div key={f.key}><dt>{f.label}</dt><dd className="wrap">{f.type === "url" && /^https:\/\//.test(String(values[f.key])) ? <a href={String(values[f.key])} target="_blank" rel="noreferrer noopener">{String(values[f.key])}</a> : String(values[f.key])}</dd></div>
      ))}
    </dl>
  );
}
