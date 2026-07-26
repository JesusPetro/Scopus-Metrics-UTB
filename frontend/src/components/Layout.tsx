import { useEffect, useRef, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import gsap from "gsap";
import { IconDocument, IconGrid, IconNetwork, IconRanking } from "./icons";

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: IconGrid, end: true },
  { to: "/ranking", label: "Ranking", icon: IconRanking, end: false },
  { to: "/coautoria", label: "Coautoría", icon: IconNetwork, end: false },
  { to: "/publicaciones", label: "Publicaciones", icon: IconDocument, end: false },
];

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
  }, [pathname]);

  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-1 bg-navy-deep px-4 py-5 lg:sticky lg:top-0 lg:h-svh lg:w-60 lg:self-start lg:py-6">
        <nav className="flex gap-1 overflow-x-auto lg:mt-1 lg:flex-col lg:overflow-visible">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-sm px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-utb-blue text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 bg-canvas">
        <div ref={contentRef} className="mx-auto max-w-[1400px] px-5 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
