import { useLayoutEffect, useRef, useState } from "react";

/**
 * How many of a variable-height item list (e.g. publication rows whose
 * titles wrap 1-3 lines) fit whole inside `budget` px, without cutting one
 * off mid-row. The caller must render **all** `itemCount` fetched items into
 * `containerRef` on the first pass — this hook measures them via
 * `useLayoutEffect` (which fires before the browser paints) and reduces
 * `count`, so the caller re-renders with `data.slice(0, count)` before
 * anything is shown on screen. No hidden/ghost DOM copies involved (an
 * earlier version tried keeping overflow items in the DOM via
 * `position: absolute` + `visibility: hidden` to stay measurable across
 * resizes — that broke visibly for `<tr>` rows, which don't handle
 * `position: absolute` cleanly, so it was dropped for this simpler,
 * correct-by-construction approach).
 *
 * Trade-off: once `count` drops below `itemCount`, a later resize that
 * would allow MORE rows to fit can't discover that (the extra rows are no
 * longer in the DOM to measure) until the next data fetch. Accepted as a
 * rare edge case in exchange for never rendering visibly-broken content.
 */
export function useFitCount<T extends HTMLElement>(budget: number | undefined, itemCount: number) {
  const containerRef = useRef<T | null>(null);
  const [count, setCount] = useState(itemCount);

  useLayoutEffect(() => {
    if (budget == null || itemCount === 0) {
      setCount(itemCount);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    if (items.length < itemCount) return; // already sliced from a prior pass; nothing new to measure

    let cumulative = 0;
    let fit = 0;
    for (const item of items) {
      const h = item.getBoundingClientRect().height;
      if (fit > 0 && cumulative + h > budget) break;
      cumulative += h;
      fit++;
    }
    setCount(Math.min(itemCount, Math.max(1, fit)));
  }, [budget, itemCount]);

  return { containerRef, count };
}
