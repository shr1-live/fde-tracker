import { useLocation, useNavigate } from "react-router-dom";

export default function BackButton() {
  const nav = useNavigate(); const { pathname } = useLocation();
  if (pathname === "/") return null;
  const canBack = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
  const fallback = "/";
  return (
    <button type="button" className="back" onClick={() => (canBack ? nav(-1) : nav(fallback))}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      Back
    </button>
  );
}
