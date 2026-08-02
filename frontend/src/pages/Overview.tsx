import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { StateBoundary } from "../components/StateBoundary";
import { BarChart } from "../components/charts/BarChart";
import { DonutChart } from "../components/charts/DonutChart";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import { IconInfo } from "../components/icons";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";
import { useInstitution } from "../lib/InstitutionContext";
import { useStaggerReveal } from "../lib/motion";
import { useElementSize } from "../lib/useElementSize";

// Measured from the rendered Top Investigadores card (Card padding + title/subtitle
// header block above the list, and padding below it), and one list row including its
// divide-y border. Fixed constants are safe here — unlike Producción's chart, which
// scales with viewport width, these come from fixed Tailwind type/spacing and don't
// change with viewport.
const INVESTIGADORES_CHROME = 115.5;
const INVESTIGADOR_ROW_HEIGHT = 53;

export function Overview() {
  const navigate = useNavigate();
  const { institutions, selectedId, ready } = useInstitution();
  const institutionName = institutions.find((i) => i.id === selectedId)?.name ?? "la institución seleccionada";
  const growth = useApi(() => api.growth(selectedId ?? undefined), [selectedId]);
  const docTypes = useApi(() => api.documentTypes(selectedId ?? undefined), [selectedId]);
  const openAccess = useApi(() => api.openAccess(selectedId ?? undefined), [selectedId]);
  // Fetched generously; how many actually render is computed to fit Producción's
  // measured height exactly (see `investigadoresFit` below) — never a fixed count.
  const topAuthors = useApi(() => api.topAuthors(20, undefined, selectedId ?? undefined), [selectedId]);
  const { ref: produccionRef, height: produccionHeight } = useElementSize<HTMLDivElement>();
  const investigadoresFit =
    produccionHeight > 0 ? Math.max(1, Math.floor((produccionHeight - INVESTIGADORES_CHROME) / INVESTIGADOR_ROW_HEIGHT)) : 6;
  const topJournals = useApi(() => api.topJournals(6, selectedId ?? undefined), [selectedId]);
  const tilesRef = useStaggerReveal<HTMLDivElement>([growth.status, topAuthors.status]);

  if (!ready) return null;

  const totalPublications = growth.status === "ready" ? growth.data.reduce((s, y) => s + y.count, 0) : undefined;
  const totalDocTyped = docTypes.status === "ready" ? docTypes.data.reduce((s, d) => s + d.count, 0) : undefined;

  // The current calendar year is necessarily a partial period — comparing it
  // year-over-year against a complete year would report a false "decline".
  const currentCalendarYear = new Date().getFullYear();
  const growthData = growth.status === "ready" ? growth.data : [];
  const inProgressYear =
    growthData.length > 0 && growthData[growthData.length - 1].year >= currentCalendarYear
      ? growthData[growthData.length - 1]
      : undefined;
  const completeYears = inProgressYear ? growthData.slice(0, -1) : growthData;
  const lastCompleteYear = completeYears.at(-1);
  const prevCompleteYear = completeYears.at(-2);
  const yoy =
    lastCompleteYear && prevCompleteYear && prevCompleteYear.count > 0
      ? Math.round(((lastCompleteYear.count - prevCompleteYear.count) / prevCompleteYear.count) * 100)
      : undefined;
  const emphasizeIndex = lastCompleteYear ? growthData.indexOf(lastCompleteYear) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink">Análisis Bibliométrico</h1>
        <p className="mt-1 text-sm text-muted">
          Producción científica, colaboraciones y tendencias de investigación de la UTB, según la API del worker.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-utb-blue/15 bg-utb-blue/5 p-4">
        <IconInfo className="mt-0.5 h-4.5 w-4.5 shrink-0 text-utb-blue" />
        <p className="text-sm text-ink/80">
          Este análisis cubre únicamente artículos donde <strong className="font-semibold">{institutionName}</strong> figura
          como afiliación verificada en Scopus. Si un docente publicó bajo otra afiliación (o sin afiliar a esta institución), esos
          artículos no quedan contados acá — por eso algunos números pueden diferir de lo que ves directamente en Scopus.
        </p>
      </div>

      <div ref={tilesRef} className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatTile
          label="Total publicaciones"
          value={totalPublications}
          hint={
            lastCompleteYear && prevCompleteYear
              ? `${lastCompleteYear.year} vs. ${prevCompleteYear.year} (últimos años completos)`
              : "Documentos indexados (Scopus)"
          }
          trend={yoy !== undefined ? `${yoy >= 0 ? "↑" : "↓"} ${Math.abs(yoy)}%` : undefined}
        />
        <StatTile label="Tipos de documento" value={docTypes.status === "ready" ? docTypes.data.length : undefined} hint="Categorías distintas registradas" />
        <StatTile
          label="Documentos clasificados"
          value={totalDocTyped}
          hint="Con tipo de documento asignado"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div ref={produccionRef}>
          <Card title="Producción Científica por Año" subtitle="Publicaciones indexadas, agrupadas por año. Clic en una barra para filtrar.">
            <StateBoundary
              state={growth}
              isEmpty={(d) => d.length === 0}
              emptyHint="Corré una sincronización para ver la evolución anual de publicaciones."
            >
              {(data) => (
                <>
                  <BarChart
                    data={data.map((d) => ({ label: String(d.year), value: d.count }))}
                    emphasizeIndex={emphasizeIndex}
                    onBarClick={(_, d) => navigate(`/publicaciones?year=${d.label}`)}
                  />
                  {inProgressYear && (
                    <p className="mt-2 text-sm text-muted">
                      * {inProgressYear.year} está en curso — {inProgressYear.count} publicaciones registradas hasta la fecha.
                    </p>
                  )}
                </>
              )}
            </StateBoundary>
          </Card>
        </div>

        <Card title="Top Investigadores" subtitle="Autores internos verificados con más publicaciones.">
          <StateBoundary state={topAuthors} isEmpty={(d) => d.length === 0}>
            {(data) => (
              <ol className="flex flex-col divide-y divide-line">
                {data.slice(0, investigadoresFit).map((author, i) => (
                  <li key={author.author_id}>
                    <button
                      onClick={() => navigate(`/coautoria?author=${author.author_id}`)}
                      className="flex w-full items-center justify-between gap-4 py-3 text-left transition-colors hover:text-utb-blue"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-canvas text-sm font-semibold text-muted">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium">{author.full_name}</span>
                      </div>
                      <span className="text-sm font-semibold text-muted">{author.publication_count} pub.</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </StateBoundary>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card
          title="Tipos de Documento"
          subtitle={`Distribución por categoría · ${(totalDocTyped ?? 0).toLocaleString("es-CO")} en total.`}
        >
          <StateBoundary state={docTypes} isEmpty={(d) => d.length === 0}>
            {(data) => (
              <DonutChart
                data={data.map((d) => ({ label: d.document_type ?? "Sin clasificar", value: d.count }))}
                onSelect={(label) => label && navigate(`/publicaciones?document_type=${encodeURIComponent(label)}`)}
              />
            )}
          </StateBoundary>
        </Card>

        <Card title="Top Revistas" subtitle="Revistas y actas donde más publica la UTB.">
          <StateBoundary
            state={topJournals}
            isEmpty={(d) => d.length === 0}
            emptyHint="Sin datos de revista todavía."
          >
            {(data) => {
              const total = data.reduce((s, d) => s + d.count, 0) || 1;
              return (
                <HorizontalBarChart
                  data={data.map((d) => ({ label: d.source_title, value: d.count, percent: (d.count / total) * 100 }))}
                />
              );
            }}
          </StateBoundary>
        </Card>
      </div>

      <Card
        title="Acceso Abierto"
        subtitle="Artículos disponibles en lectura abierta, según el indicador por artículo de Scopus."
      >
        <StateBoundary state={openAccess} isEmpty={(d) => d.length === 0}>
          {(data) => {
            const total = data.reduce((s, d) => s + d.count, 0) || 1;
            const openCount = data.find((d) => d.openAccess)?.count ?? 0;
            const openPct = Math.round((openCount / total) * 100);
            return (
              <>
                <DonutChart
                  data={data.map((d) => ({
                    label: d.openAccess ? "Acceso abierto" : "Acceso restringido",
                    value: d.count,
                  }))}
                />
                <p className="mt-2 text-sm text-muted">
                  {openPct}% de los artículos son de acceso abierto a nivel de artículo individual — este dato indica que
                  ese artículo puntual puede leerse gratis, <strong className="font-semibold text-ink">no</strong> que la
                  revista en la que se publicó sea de acceso abierto en su totalidad.
                </p>
              </>
            );
          }}
        </StateBoundary>
      </Card>
    </div>
  );
}
