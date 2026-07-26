import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`flex flex-col rounded-lg bg-surface shadow-card ${padded ? "p-6" : ""} ${className}`}>
      {(title || action) && (
        <div className={`flex items-center justify-between gap-4 ${padded ? "mb-5" : "p-6 pb-5"}`}>
          <div>
            {title && <h2 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
