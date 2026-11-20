import { useEffect, useRef, type MouseEvent } from "react";

/**
 * Double-tap (touch) or double-click (mouse) detection for one element, Instagram style.
 * - onDouble runs on the second tap within `delay` ms.
 * - onSingle (optional) runs after `delay` ms when no second tap came, so a single tap can still play a video.
 * - Keyboard activation (Enter/Space gives a click with detail 0) runs onSingle at once: keyboard users never wait.
 * Pair the element with `touch-action: manipulation` so the browser does not zoom on double-tap.
 */
export function useDoubleTap(onDouble: () => void, onSingle?: () => void, delay = 260) {
  const last = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (e: MouseEvent) => {
    if (e.detail === 0) { onSingle?.(); return; }
    const now = performance.now();
    if (now - last.current < delay) {
      last.current = 0;
      window.clearTimeout(timer.current);
      window.getSelection()?.removeAllRanges(); // a double-click would otherwise select a word
      onDouble();
      return;
    }
    last.current = now;
    if (onSingle) { window.clearTimeout(timer.current); timer.current = window.setTimeout(onSingle, delay); }
  };
}
