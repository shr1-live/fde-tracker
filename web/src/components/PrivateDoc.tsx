import { useState } from "react";
import { supabase } from "../lib/supabase";

/** Opens a file from the private Supabase bucket. The database only allows the admin to read it. */
export default function PrivateDoc({ name, label = "Open PDF", className = "btn" }: { name: string; label?: string; className?: string }) {
  const [state, setState] = useState<"" | "busy" | "err">("");
  async function open() {
    if (!supabase) { setState("err"); return; }
    setState("busy");
    const w = window.open("", "_blank"); // open first so pop-up blockers allow it
    const { data, error } = await supabase.storage.from("private-docs").download(name);
    if (error || !data) { w?.close(); setState("err"); return; }
    const url = URL.createObjectURL(new Blob([data], { type: data.type || "application/pdf" }));
    if (w) w.location.href = url; else window.location.href = url;
    setState("");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  return (
    <>
      <button type="button" className={className} onClick={open} disabled={state === "busy"}>{state === "busy" ? "Opening" : label}</button>
      {state === "err" && <p className="err small" role="alert">Could not open the file. Check it is uploaded to the private-docs bucket and that you are signed in as the admin.</p>}
    </>
  );
}
