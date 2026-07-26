import type { ReactNode } from "react";
import type { ApiState } from "../lib/useApi";

/**
 * Real skeleton/empty/error states per DESIGN.md ("Do show real skeleton/empty
 * states before real Scopus data has been synced — an empty graph is a valid,
 * expected state, not an error").
 */
export function StateBoundary<T>({
  state,
  isEmpty,
  emptyTitle = "Todavía no hay datos",
  emptyHint = "Corré una sincronización (POST /api/admin/sync) para poblar esta vista.",
  skeleton,
  children,
}: {
  state: ApiState<T>;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyHint?: string;
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (state.status === "loading") {
    return skeleton ?? <DefaultSkeleton />;
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-md border border-line bg-canvas/60 px-6 py-10 text-center">
        <p className="text-sm font-medium text-ink">No se pudo cargar la información</p>
        <p className="text-sm text-muted">{state.message}</p>
      </div>
    );
  }

  if (isEmpty?.(state.data)) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-md border border-dashed border-line px-6 py-10 text-center">
        <p className="text-sm font-medium text-ink">{emptyTitle}</p>
        <p className="text-sm text-muted">{emptyHint}</p>
      </div>
    );
  }

  return <>{children(state.data)}</>;
}

function DefaultSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-2/3 rounded-full bg-line" />
      <div className="h-40 w-full rounded-md bg-line" />
    </div>
  );
}
