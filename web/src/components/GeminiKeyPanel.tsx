import { FormEvent, useId, useState } from "react";
import { ApiError, getModels } from "../lib/assistantApi";
import { clearOwnKey, isGeminiKeyShape, maskKey, setOwnKey, useOwnKey } from "../lib/llmKey";
import { Chip } from "./Chip";
import { Icon } from "./Icon";

/**
 * "Use your own Gemini key": anyone can paste their own free Gemini key and use the assistants when no shared model is set up.
 * The key stays in this browser. It is sent to our server only with assistant requests, used for that one request and never saved there.
 */
export function GeminiKeyPanel({ serverModel, serverConfigured, onChange }: { serverModel?: string | null; serverConfigured?: boolean; onChange?: () => void }) {
  const saved = useOwnKey();
  const id = useId();
  const [key, setKey] = useState("");
  const [models, setModels] = useState<string[] | null>(null);
  const [model, setModel] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);
  const shaped = isGeminiKeyShape(key);

  async function test(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setModels(null);
    try {
      const r = await getModels(key);
      if (r.models.length === 0) { setError("This key works, but Google lists no Gemini chat models for it. Try another key."); return; }
      setModels(r.models); setModel(r.suggested ?? r.models[0]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not check the key. Try again.");
    } finally { setBusy(false); }
  }

  function use() {
    setOwnKey(key, model, remember);
    setKey(""); setModels(null); setChanging(false);
    onChange?.();
  }

  if (saved && !changing) {
    return (
      <section className="card keypanel" aria-labelledby={id + "-h"}>
        <h2 id={id + "-h"}><Icon name="shield" /> Your Gemini key <Chip tone="ok">In use</Chip></h2>
        <p>The assistants are using your key <code>{maskKey(saved.key)}</code>{saved.model ? <> with the model <code>{saved.model}</code></> : <>, but no model is chosen yet</>}.
          {" "}{saved.remember ? "It is remembered in this browser." : "It is kept in this tab only and is forgotten when you close it."}</p>
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => setChanging(true)}>Change model or key</button>
          <button type="button" className="btn ghost" onClick={() => { clearOwnKey(); onChange?.(); }}>Remove my key</button>
        </div>
      </section>
    );
  }

  return (
    <details className="card keypanel" open={serverConfigured === false || changing || undefined}>
      <summary><Icon name="shield" /> Use your own Gemini key {serverConfigured === false && <Chip tone="warn">Needed: no shared model is set up</Chip>}</summary>
      <p className="muted small">
        {serverConfigured === false ? "The shared model is not set up. " : serverModel ? `The shared model is ${serverModel}. ` : ""}
        You can use your own free Gemini key instead, for example when there is no shared or local model. Get one in{" "}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio<span className="sr"> (opens in a new tab)</span></a>.
      </p>
      <ul className="plain small">
        <li>Your key stays in this browser. We never save it on the server and never write it to a log.</li>
        <li>It is sent over HTTPS only with assistant requests, and only to Google, to answer that one request.</li>
        <li>Free keys have low limits set by Google. If you hit one, wait a minute and try again.</li>
        <li>Do not paste a key you share with others. Remove it on a shared computer.</li>
      </ul>
      <form onSubmit={test} autoComplete="off">
        <label htmlFor={id + "-k"}>Gemini API key</label>
        <input id={id + "-k"} type="password" value={key} onChange={(e) => { setKey(e.target.value); setModels(null); setError(""); }}
          autoComplete="off" spellCheck={false} placeholder="AIza... or AQ...." aria-describedby={error ? id + "-e" : undefined} />
        {key && !shaped && <p className="small muted">A Gemini key starts with AIza or AQ. and has no spaces.</p>}
        <div className="row"><button type="submit" className="btn" disabled={!shaped || busy}>{busy ? "Checking..." : "Test key"}</button></div>
      </form>
      {error && <p id={id + "-e"} className="banner err" role="alert">{error}</p>}
      {models && (
        <div role="status">
          <p className="callout ok"><Icon name="check" /> The key works. Choose a model.</p>
          <label htmlFor={id + "-m"}>Model</label>
          <select id={id + "-m"} value={model} onChange={(e) => setModel(e.target.value)}>{models.map((m) => <option key={m} value={m}>{m}</option>)}</select>
          <label className="pickitem" htmlFor={id + "-r"}><input id={id + "-r"} type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember it in this browser (otherwise only in this tab)</label>
          <div className="row"><button type="button" className="btn" onClick={use}>Use this key</button></div>
        </div>
      )}
      {changing && <div className="row"><button type="button" className="copy" onClick={() => { setChanging(false); setKey(""); setModels(null); }}>Cancel</button></div>}
    </details>
  );
}
