import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Card } from "../components/Card";
import { StateBoundary } from "../components/StateBoundary";
import { ComparativeGrowthChart, ComparativeLegend, type ComparativeSeries } from "../components/charts/ComparativeGrowthChart";
import { DonutChart } from "../components/charts/DonutChart";
import { IconVerified } from "../components/icons";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";
import { useInstitution } from "../lib/InstitutionContext";
import { useStaggerReveal } from "../lib/motion";
import { seriesColor } from "../lib/seriesColors";
import type { Institution } from "../lib/types";

export function Comparativa() {
  const { institutions, ready } = useInstitution();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [documentType, setDocumentType] = useState<string>("");

  // Nothing selected yet on first load - default to the institution flagged
  // is_default, same starting point as the individual view elsewhere.
  useEffect(() => {
    if (!ready || selectedIds.length > 0) return;
    const defaultId = institutions.find((i) => i.isDefault)?.id ?? institutions[0]?.id;
    if (defaultId) setSelectedIds([defaultId]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, institutions]);

  function toggleInstitution(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Document-type options come from the union across every registered
  // institution, not just the selected ones - so switching a selection off
  // never makes the filter itself disappear or reset silently.
  const allDocTypes = useApi(
    () => Promise.all(institutions.map((i) => api.documentTypes(i.id))),
    [institutions]
  );
  const docTypeOptions =
    allDocTypes.status === "ready"
      ? Array.from(new Set(allDocTypes.data.flat().map((d) => d.document_type).filter((d): d is string => !!d))).sort()
      : [];

  const growth = useApi(
    () =>
      Promise.all(
        selectedIds.map((id) =>
          api.growth(id, documentType || undefined).then((data) => ({ id, data }))
        )
      ),
    [selectedIds, documentType]
  );

  // Unfiltered by documentType on purpose - these show each institution's
  // full distribution (the reference you pick a type *from*), not a
  // tautological 100%-one-slice view of whatever type is currently selected.
  const docTypeBreakdowns = useApi(
    () => Promise.all(selectedIds.map((id) => api.documentTypes(id).then((data) => ({ id, data })))),
    [selectedIds]
  );

  const tilesRef = useStaggerReveal<HTMLDivElement>([selectedIds.length, documentType]);

  if (!ready) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink">Comparativa Institucional</h1>
        <p className="mt-1 text-sm text-muted">
          Elegí las universidades a comparar y, opcionalmente, un tipo de documento específico.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {institutions.map((inst) => (
            <InstitutionChip
              key={inst.id}
              institution={inst}
              colorIndex={institutions.findIndex((i) => i.id === inst.id)}
              active={selectedIds.includes(inst.id)}
              onToggle={() => toggleInstitution(inst.id)}
            />
          ))}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold tracking-wide text-muted uppercase">Tipo de documento</span>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-48 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-utb-blue focus:outline-none"
          >
            <option value="">Todos</option>
            {docTypeOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div ref={tilesRef} className="flex flex-col gap-6">
        <Card
          title="Crecimiento Comparado"
          subtitle={
            documentType
              ? `Publicaciones por año · tipo de documento: ${documentType}`
              : "Publicaciones por año, todas las universidades seleccionadas."
          }
        >
          <StateBoundary
            state={growth}
            isEmpty={(rows) => rows.every((r) => r.data.length === 0)}
            emptyHint="Elegí al menos una institución con datos sincronizados."
          >
            {(rows) => {
              const series: ComparativeSeries[] = rows.map((r) => ({
                id: r.id,
                label: institutions.find((i) => i.id === r.id)?.abbreviation ?? r.id,
                data: r.data,
                colorIndex: institutions.findIndex((i) => i.id === r.id),
              }));
              return (
                <>
                  <ComparativeGrowthChart series={series} />
                  <ComparativeLegend series={series} />
                </>
              );
            }}
          </StateBoundary>
        </Card>

        <div className="flex flex-wrap gap-5">
          <StateBoundary
            state={docTypeBreakdowns}
            isEmpty={(rows) => rows.every((r) => r.data.length === 0)}
            emptyHint="Sin datos de tipo de documento para las instituciones elegidas."
          >
            {(rows) =>
              rows.map((r) => {
                const name = institutions.find((i) => i.id === r.id)?.abbreviation ?? r.id;
                const total = r.data.reduce((s, d) => s + d.count, 0);
                return (
                  // flex-grow so a single card fills the full row, and a
                  // trailing odd card stretches instead of leaving a gap -
                  // a fixed grid-cols-2 can't do either.
                  <div key={r.id} className="min-w-[340px] flex-1 basis-[340px]">
                    <Card title={`Tipos de Documento · ${name}`} subtitle={`${total.toLocaleString("es-CO")} publicaciones en total.`}>
                      {r.data.length === 0 ? (
                        <p className="text-sm text-muted">Sin datos todavía.</p>
                      ) : (
                        <DonutChart data={r.data.map((d) => ({ label: d.document_type ?? "Sin clasificar", value: d.count }))} />
                      )}
                    </Card>
                  </div>
                );
              })
            }
          </StateBoundary>
        </div>
      </div>
    </div>
  );
}

function InstitutionChip({
  institution,
  colorIndex,
  active,
  onToggle,
}: {
  institution: Institution;
  colorIndex: number;
  active: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const wasActive = useRef(active);

  useLayoutEffect(() => {
    if (wasActive.current === active) return;
    wasActive.current = active;
    if (!ref.current) return;
    gsap.fromTo(ref.current, { scale: 0.94 }, { scale: 1, duration: 0.25, ease: "back.out(2.2)" });
  }, [active]);

  return (
    <button
      ref={ref}
      onClick={onToggle}
      aria-pressed={active}
      title={institution.name}
      className={`flex items-center gap-2 rounded-sm px-3.5 py-2 text-sm font-medium transition-colors ${
        active ? "bg-utb-blue text-white" : "border border-line text-ink hover:bg-canvas"
      }`}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: active ? "#ffffff" : seriesColor(colorIndex).to }}
      />
      {institution.abbreviation}
      {active && <IconVerified className="h-3.5 w-3.5 shrink-0 text-white" />}
    </button>
  );
}
