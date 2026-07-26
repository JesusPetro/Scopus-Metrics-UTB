import { useCallback, useRef, useState } from "react";
import gsap from "gsap";

export interface PanZoomTransform {
  x: number;
  y: number;
  k: number;
}

const MIN_K = 0.3;
const MAX_K = 4;

/**
 * Drag-to-pan + wheel-to-zoom for an SVG scene, applied via a single
 * `translate(x,y) scale(k)` group transform. A small drag threshold keeps a
 * plain click (selecting a node) from being swallowed as a zero-distance pan.
 * Direct manipulation (drag/wheel) snaps the transform 1:1 with the input;
 * programmatic moves (select, fit, toolbar zoom) ease into place instead of
 * jump-cutting, since those are the ones a user actually watches happen.
 */
export function usePanZoom(initial: PanZoomTransform = { x: 0, y: 0, k: 1 }) {
  const [transform, setTransform] = useState<PanZoomTransform>(initial);
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number; dragged: boolean } | null>(
    null
  );

  const animateTo = useCallback((target: PanZoomTransform, duration = 0.5) => {
    tweenRef.current?.kill();
    const from = { ...transformRef.current };
    tweenRef.current = gsap.to(from, {
      x: target.x,
      y: target.y,
      k: target.k,
      duration,
      ease: "power2.out",
      onUpdate: () => setTransform({ x: from.x, y: from.y, k: from.k }),
    });
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      tweenRef.current?.kill();
      (e.target as Element).setPointerCapture(e.pointerId);
      dragState.current = { startX: e.clientX, startY: e.clientY, origX: transform.x, origY: transform.y, dragged: false };
    },
    [transform.x, transform.y]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragState.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.dragged = true;
    setTransform((t) => ({ ...t, x: drag.origX + dx, y: drag.origY + dy }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    const wasDragged = dragState.current?.dragged ?? false;
    dragState.current = null;
    return wasDragged;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    tweenRef.current?.kill();
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setTransform((t) => {
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const k = Math.min(MAX_K, Math.max(MIN_K, t.k * factor));
      // Zoom toward the pointer: keep the point under the cursor stationary.
      const x = px - ((px - t.x) / t.k) * k;
      const y = py - ((py - t.y) / t.k) * k;
      return { x, y, k };
    });
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const t = transformRef.current;
      animateTo({ ...t, k: Math.min(MAX_K, Math.max(MIN_K, t.k * factor)) }, 0.35);
    },
    [animateTo]
  );

  const fitToBounds = useCallback(
    (bounds: { minX: number; minY: number; maxX: number; maxY: number }, viewWidth: number, viewHeight: number) => {
      const w = Math.max(1, bounds.maxX - bounds.minX);
      const h = Math.max(1, bounds.maxY - bounds.minY);
      const k = Math.min(MAX_K, Math.max(MIN_K, Math.min(viewWidth / w, viewHeight / h) * 0.9));
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      animateTo({ x: viewWidth / 2 - cx * k, y: viewHeight / 2 - cy * k, k }, 0.6);
    },
    [animateTo]
  );

  const centerOn = useCallback(
    (x: number, y: number, viewWidth: number, viewHeight: number, k?: number) => {
      const nk = k ?? transformRef.current.k;
      animateTo({ x: viewWidth / 2 - x * nk, y: viewHeight / 2 - y * nk, k: nk }, 0.5);
    },
    [animateTo]
  );

  return { transform, setTransform, onPointerDown, onPointerMove, onPointerUp, onWheel, zoomBy, fitToBounds, centerOn };
}
