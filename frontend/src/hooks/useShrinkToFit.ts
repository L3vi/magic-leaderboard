import { useLayoutEffect, useRef } from "react";

/**
 * Shrinks an element's text (as an em fraction of its inherited size) until it
 * fits its own width, never below `minScale`; past that, CSS ellipsis takes
 * over. Text that already fits is left at full size.
 */
export function useShrinkToFit<T extends HTMLElement>(text: string, minScale = 0.6) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      const cs = getComputedStyle(el);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const available = el.clientWidth - pad;
      const needed = el.scrollWidth - pad;
      if (needed > available && needed > 0) {
        el.style.fontSize = `${Math.max(minScale, Math.floor((available / needed) * 100) / 100)}em`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, minScale]);

  return ref;
}
