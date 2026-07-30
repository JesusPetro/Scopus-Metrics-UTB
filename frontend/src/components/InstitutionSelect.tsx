import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useInstitution } from "../lib/InstitutionContext";
import { IconCheck, IconChevronDown, IconGrid } from "./icons";

/**
 * Lives at the top of the Navy Deep sidebar, above the primary nav — there's
 * no persistent top-bar chrome in this layout to put a selector into on
 * desktop (DESIGN.md only defines sidebar + canvas; a top bar only exists as
 * the mobile collapse of this same sidebar), so this stays inside the one
 * persistent nav surface instead of introducing a second one.
 *
 * Hand-built listbox (not a native <select>) so opening/closing and picking
 * an option can carry the same GSAP-driven motion language as the rest of
 * the product instead of an unstyled OS dropdown.
 */
export function InstitutionSelect() {
  const { institutions, selectedId, setSelectedId, ready } = useInstitution();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const options = panelRef.current.querySelectorAll("[data-option]");
    gsap.fromTo(
      panelRef.current,
      { opacity: 0, y: -6, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out", transformOrigin: "top" }
    );
    gsap.fromTo(
      options,
      { opacity: 0, y: -4 },
      { opacity: 1, y: 0, duration: 0.18, stagger: 0.03, delay: 0.03, ease: "power2.out" }
    );
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!ready || institutions.length === 0) return null;
  const selected = institutions.find((i) => i.id === selectedId);

  return (
    <div ref={containerRef} className="relative mb-3 lg:mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-sm bg-white/5 px-3 py-2.5 text-white transition-colors hover:bg-white/10"
      >
        <IconGrid className="h-4 w-4 shrink-0 text-white/50" />
        <span className="flex-1 truncate text-left text-sm font-medium">{selected?.name ?? "Elegí institución"}</span>
        <IconChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute top-full right-0 left-0 z-20 mt-1.5 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-card"
        >
          {institutions.map((inst) => {
            const isSelected = inst.id === selectedId;
            return (
              <button
                key={inst.id}
                data-option
                onClick={() => {
                  setSelectedId(inst.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm transition-colors ${
                  isSelected ? "font-semibold text-utb-blue" : "text-ink hover:bg-canvas"
                }`}
              >
                <span className="flex-1 truncate">{inst.name}</span>
                {isSelected && <IconCheck className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
