import { useEffect, useRef, useState } from "react";

/**
 * How much vertical space is left below `ref`'s top edge before the viewport
 * ends, minus `bottomMargin` — used to cap a table/list to "fits on screen,
 * no page scroll" instead of a guessed row count. Recomputes on resize.
 */
export function useAvailableViewportHeight<T extends HTMLElement>(bottomMargin = 24) {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    function recompute() {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setHeight(Math.max(160, window.innerHeight - top - bottomMargin));
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [bottomMargin]);

  return { ref, height };
}
