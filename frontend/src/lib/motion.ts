import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Stagger-reveals the direct children of a container on mount/dep-change —
 * used for card grids and list rows so a route/data change feels alive
 * instead of a hard cut. Kept fast (per DESIGN.md Motion: 300-450ms total)
 * so it never reads as a loading delay.
 */
export function useStaggerReveal<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const children = Array.from(el.children);
    if (children.length === 0) return;
    // Cap the total cascade regardless of row count — a 50-row table must
    // still finish revealing in ~350ms, not stagger on for seconds.
    const stagger = Math.min(0.05, 0.35 / children.length);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        children,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, stagger, ease: "power2.out", clearProps: "transform" }
      );
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/** Animates a number counting up to `value` whenever it changes. */
export function useCountUp(value: number | undefined, duration = 0.6) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const prev = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === undefined) return;
    const from = { n: prev.current };
    const tween = gsap.to(from, {
      n: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = Math.round(from.n).toLocaleString("es-CO");
      },
    });
    prev.current = value;
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return ref;
}

/** Draws in an SVG shape (bar/wedge/node) by animating a scale-from-baseline transform. */
export function revealBars(container: SVGElement | null) {
  if (!container) return;
  const bars = container.querySelectorAll<SVGGraphicsElement>("[data-bar]");
  if (bars.length === 0) return;
  gsap.fromTo(
    bars,
    { scaleY: 0, transformOrigin: "bottom" },
    { scaleY: 1, duration: 0.55, stagger: 0.035, ease: "power3.out" }
  );
}

/** Horizontal counterpart to revealBars — draws bars in left-to-right, for HorizontalBarChart's row rects. */
export function revealHBars(container: HTMLElement | SVGElement | null) {
  if (!container) return;
  const bars = container.querySelectorAll<SVGGraphicsElement>("[data-bar]");
  if (bars.length === 0) return;
  gsap.fromTo(
    bars,
    { scaleX: 0, transformOrigin: "left" },
    { scaleX: 1, duration: 0.55, stagger: 0.05, ease: "power3.out" }
  );
}
