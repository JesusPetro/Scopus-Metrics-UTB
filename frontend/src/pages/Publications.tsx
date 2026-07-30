import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../components/Card";
import { StateBoundary } from "../components/StateBoundary";
import { useFitCount } from "../lib/useFitCount";
import { useAvailableViewportHeight } from "../lib/useViewportFit";
import { api, type PublicationSort } from "../lib/api";
import { useApi } from "../lib/useApi";
import { useInstitution } from "../lib/InstitutionContext";

// A generous upper bound to fetch per "page" — how many actually render is
// whatever whole rows fit on screen (see useFitCount), never this fixed
// number. Titles wrap 1-3 lines, so row height varies; this just caps how
// much we ask the API for at once.
const FETCH_BATCH = 25;
// Measured from the rendered table: the header row, and the pagination
// footer bar below it. Fixed Tailwind type/spacing, not viewport-dependent.
const THEAD_HEIGHT = 42.5;
const FOOTER_HEIGHT = 66;

type SortableColumn = Extract<PublicationSort, "year" | "citations">;

export function Publications() {
  const { selectedId } = useInstitution();
  const [searchParams, setSearchParams] = useSearchParams();
  const [year, setYear] = useState<string>(searchParams.get("year") ?? "");
  const [documentType, setDocumentType] = useState<string>(searchParams.get("document_type") ?? "");
  const [sort, setSort] = useState<SortableColumn | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [offset, setOffset] = useState(0);
  const [offsetStack, setOffsetStack] = useState<number[]>([]);
  const { ref: fitAnchorRef, height: availableHeight } = useAvailableViewportHeight<HTMLDivElement>();
  const tbodyBudget = availableHeight ? Math.max(80, availableHeight - THEAD_HEIGHT - FOOTER_HEIGHT) : undefined;

  const docTypes = useApi(() => api.documentTypes(selectedId ?? undefined), [selectedId]);
  const years = useApi(() => api.growth(selectedId ?? undefined), [selectedId]);
  const publications = useApi(
    () =>
      api.publications({
        year: year ? Number(year) : undefined,
        documentType: documentType || undefined,
        institutionId: selectedId ?? undefined,
        sort,
        sortDir,
        limit: FETCH_BATCH,
        offset,
      }),
    [year, documentType, selectedId, sort, sortDir, offset]
  );

  function resetPaging() {
    setOffset(0);
    setOffsetStack([]);
  }

  function updateFilter(key: "year" | "document_type", setter: (v: string) => void, value: string) {
    setter(value);
    resetPaging();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  function toggleSort(column: SortableColumn) {
    resetPaging();
    if (sort !== column) {
      setSort(column);
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink">Directorio de Publicaciones</h1>
        <p className="mt-1 text-sm text-muted">Explorá, filtrá y ordená la producción académica institucional.</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Año">
            <select
              value={year}
              onChange={(e) => updateFilter("year", setYear, e.target.value)}
              className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-utb-blue focus:outline-none"
            >
              <option value="">Todos</option>
              {years.status === "ready" &&
                [...years.data]
                  .sort((a, b) => b.year - a.year)
                  .map((y) => (
                    <option key={y.year} value={y.year}>
                      {y.year}
                    </option>
                  ))}
            </select>
          </Field>
          <Field label="Tipo de documento">
            <select
              value={documentType}
              onChange={(e) => updateFilter("document_type", setDocumentType, e.target.value)}
              className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-utb-blue focus:outline-none"
            >
              <option value="">Todos</option>
              {docTypes.status === "ready" &&
                docTypes.data
                  .filter((d) => d.document_type)
                  .map((d) => (
                    <option key={d.document_type} value={d.document_type!}>
                      {d.document_type}
                    </option>
                  ))}
            </select>
          </Field>
        </div>
      </Card>

      <div ref={fitAnchorRef}>
        <Card padded={false}>
          <StateBoundary
            state={publications}
            isEmpty={(p) => p.data.length === 0}
            emptyTitle="Sin resultados"
            emptyHint="Probá otro año o tipo de documento, o corré una sincronización si el directorio está vacío."
          >
            {({ data, total }) => (
              <FitPublicationsTable
                key={offset}
                data={data}
                total={total}
                offset={offset}
                budget={tbodyBudget}
                sort={sort}
                sortDir={sortDir}
                onToggleSort={toggleSort}
                canGoBack={offsetStack.length > 0}
                onNext={(shown) => {
                  setOffsetStack((s) => [...s, offset]);
                  setOffset((o) => o + shown);
                }}
                onPrev={() =>
                  setOffsetStack((s) => {
                    if (s.length === 0) return s;
                    setOffset(s[s.length - 1]);
                    return s.slice(0, -1);
                  })
                }
              />
            )}
          </StateBoundary>
        </Card>
      </div>
    </div>
  );
}

interface PubRow {
  id: string;
  title: string;
  doi: string | null;
  source_title: string | null;
  year: number;
  document_type: string | null;
  cited_by_count: number;
}

function FitPublicationsTable({
  data,
  total,
  offset,
  budget,
  sort,
  sortDir,
  onToggleSort,
  canGoBack,
  onNext,
  onPrev,
}: {
  data: PubRow[];
  total: number;
  offset: number;
  budget: number | undefined;
  sort: SortableColumn | undefined;
  sortDir: "asc" | "desc";
  onToggleSort: (column: SortableColumn) => void;
  canGoBack: boolean;
  onNext: (shown: number) => void;
  onPrev: () => void;
}) {
  const { containerRef, count } = useFitCount<HTMLTableSectionElement>(budget, data.length);
  const canGoForward = offset + count < total;

  return (
    <>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[12.5px] font-semibold tracking-wide text-muted uppercase">
            <th className="px-6 py-3">Título</th>
            <th className="px-3 py-3">Fuente</th>
            <SortableHeader column="year" label="Año" active={sort} dir={sortDir} onToggle={onToggleSort} />
            <th className="px-3 py-3">Tipo</th>
            <SortableHeader column="citations" label="Citas" align="right" active={sort} dir={sortDir} onToggle={onToggleSort} />
          </tr>
        </thead>
        <tbody ref={containerRef}>
          {data.slice(0, count).map((pub) => (
            <tr key={pub.id} className="border-b border-line hover:bg-canvas">
              <td className="max-w-[420px] px-6 py-3 font-medium text-ink">
                {pub.doi ? (
                  <a
                    href={`https://doi.org/${pub.doi}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-utb-blue hover:underline"
                  >
                    {pub.title}
                  </a>
                ) : (
                  pub.title
                )}
              </td>
              <td className="px-3 py-3 text-muted">{pub.source_title ?? "—"}</td>
              <td className="px-3 py-3 text-muted">{pub.year}</td>
              <td className="px-3 py-3 text-muted">{pub.document_type ?? "—"}</td>
              <td className="px-6 py-3 text-right font-semibold text-ink">{pub.cited_by_count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-sm text-muted">
          {total === 0
            ? "Sin resultados"
            : `Mostrando ${offset + 1}–${Math.min(offset + count, total)} de ${total.toLocaleString("es-CO")}`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onPrev}
            disabled={!canGoBack}
            className="rounded-sm border border-line px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => onNext(count)}
            disabled={!canGoForward}
            className="rounded-sm border border-line px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </>
  );
}

function SortableHeader({
  column,
  label,
  align = "left",
  active,
  dir,
  onToggle,
}: {
  column: SortableColumn;
  label: string;
  align?: "left" | "right";
  active: SortableColumn | undefined;
  dir: "asc" | "desc";
  onToggle: (column: SortableColumn) => void;
}) {
  const isActive = active === column;
  return (
    <th className={`px-3 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        onClick={() => onToggle(column)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-ink ${isActive ? "text-utb-blue" : ""}`}
      >
        {label}
        <span className={`text-[10px] transition-transform ${isActive && dir === "asc" ? "rotate-180" : ""}`}>
          {isActive ? "▼" : "⇅"}
        </span>
      </button>
    </th>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold tracking-wide text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}
