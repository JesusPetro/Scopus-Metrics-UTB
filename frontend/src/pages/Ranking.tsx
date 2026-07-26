import { useState, type Ref } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { StateBoundary } from "../components/StateBoundary";
import { StatTile } from "../components/StatTile";
import { IconNetwork } from "../components/icons";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";
import { useStaggerReveal } from "../lib/motion";
import { useElementSize } from "../lib/useElementSize";
import { useFitCount } from "../lib/useFitCount";
import { useAvailableViewportHeight } from "../lib/useViewportFit";

const COLUMN_GAP = 20; // gap-5
// A generous upper bound to fetch per "page" of publications — how many
// actually render is whatever whole rows fit (see useFitCount), never this
// fixed number. Publication titles wrap 1-3 lines, so row height varies;
// this is just a ceiling on how much we ask the API for at once.
const PUB_FETCH_BATCH = 20;
// Measured from the rendered card: Card's title+subtitle header block above
// the list, and the pagination footer bar below it. Fixed Tailwind
// type/spacing, not viewport-dependent.
const PUB_HEADER_CHROME = 91.5;
const PUB_FOOTER_CHROME = 63;
// Measured from the ranking card: filter bar row, table head row, and the
// pagination footer bar — all fixed Tailwind type/spacing, not
// viewport-dependent. Subtracted from the viewport budget to get how much is
// actually left for tbody rows (see useFitCount below).
const FILTER_BAR_CHROME = 52;
const THEAD_CHROME = 46;
const RANKING_FOOTER_CHROME = 72;

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as { current: T | null }).current = node;
    }
  };
}

export function Ranking() {
  const [selected, setSelected] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const docTypes = useApi(api.documentTypes, []);
  const topAuthors = useApi(() => api.topAuthors(50, documentType || undefined), [documentType]);
  const { ref: tableCardRef, height: tableCardHeight } = useElementSize<HTMLDivElement>();
  const { ref: viewportAnchorRef, height: availableHeight } = useAvailableViewportHeight<HTMLDivElement>(32);
  const tbodyBudget = availableHeight
    ? Math.max(80, availableHeight - FILTER_BAR_CHROME - THEAD_CHROME - RANKING_FOOTER_CHROME)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink">Ranking de Investigadores</h1>
      </div>

      <div ref={viewportAnchorRef} className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div ref={tableCardRef}>
          <Card padded={false}>
            <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-2">
              <label className="flex items-center gap-2 text-sm">
                <span className="font-semibold tracking-wide text-muted uppercase text-[12.5px]">Tipo de documento</span>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="rounded-sm border border-line bg-surface px-3 py-1 text-sm text-ink focus:border-utb-blue focus:outline-none"
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
              </label>
            </div>
            <StateBoundary
              state={topAuthors}
              isEmpty={(d) => d.length === 0}
              emptyTitle="Todavía no hay investigadores verificados"
              emptyHint="Corré POST /api/admin/verify-authors para resolver candidatos a interno."
            >
              {(data) => (
                <RankingTable
                  key={documentType}
                  data={data}
                  selected={selected}
                  onSelect={setSelected}
                  countLabel={documentType ? `Publicaciones (${documentType})` : "Publicaciones"}
                  budget={tbodyBudget}
                />
              )}
            </StateBoundary>
          </Card>
        </div>

        <AuthorDetailPanel key={selected} authorId={selected} matchHeight={tableCardHeight} />
      </div>
    </div>
  );
}

function RankingTable({
  data,
  selected,
  onSelect,
  countLabel,
  budget,
}: {
  data: { author_id: string; full_name: string; publication_count: number }[];
  selected: string | null;
  onSelect: (id: string) => void;
  countLabel: string;
  budget: number | undefined;
}) {
  const [offset, setOffset] = useState(0);
  const [offsetStack, setOffsetStack] = useState<number[]>([]);

  return (
    <RankingRows
      key={offset}
      data={data}
      offset={offset}
      selected={selected}
      onSelect={onSelect}
      countLabel={countLabel}
      budget={budget}
      canGoBack={offsetStack.length > 0}
      onNext={(shown) => {
        setOffsetStack((s) => [...s, offset]);
        setOffset((o) => o + shown);
      }}
      onPrev={() => {
        setOffsetStack((s) => {
          if (s.length === 0) return s;
          setOffset(s[s.length - 1]);
          return s.slice(0, -1);
        });
      }}
    />
  );
}

// Remounted via `key={offset}` by the parent on every page change — this is
// what forces useFitCount to re-measure from scratch (it renders the full
// remaining candidate on first pass, then reduces `count`). Without the
// remount, a page that lands on fewer rows than fit (e.g. the last page)
// leaves a stale, too-small `count` baked into the hook's state, which then
// incorrectly caps every page navigated to afterward, including back.
function RankingRows({
  data,
  offset,
  selected,
  onSelect,
  countLabel,
  budget,
  canGoBack,
  onNext,
  onPrev,
}: {
  data: { author_id: string; full_name: string; publication_count: number }[];
  offset: number;
  selected: string | null;
  onSelect: (id: string) => void;
  countLabel: string;
  budget: number | undefined;
  canGoBack: boolean;
  onNext: (shown: number) => void;
  onPrev: () => void;
}) {
  const candidate = data.slice(offset);
  const bodyRef = useStaggerReveal<HTMLTableSectionElement>([offset, data]);
  const { containerRef, count } = useFitCount<HTMLTableSectionElement>(budget, candidate.length);
  const canGoForward = offset + count < data.length;

  return (
    <>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[12.5px] font-semibold tracking-wide text-muted uppercase">
            <th className="px-6 py-3 font-semibold">#</th>
            <th className="px-3 py-3 font-semibold">Investigador</th>
            <th className="px-6 py-3 text-right font-semibold">{countLabel}</th>
          </tr>
        </thead>
        <tbody ref={mergeRefs(bodyRef, containerRef)}>
          {candidate.slice(0, count).map((author, i) => (
            <tr
              key={author.author_id}
              onClick={() => onSelect(author.author_id)}
              className={`cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-canvas ${
                selected === author.author_id ? "bg-canvas" : ""
              }`}
            >
              <td className="px-6 py-3 text-muted">{offset + i + 1}</td>
              <td className="px-3 py-3 font-medium text-ink">{author.full_name}</td>
              <td className="px-6 py-3 text-right font-semibold text-ink">{author.publication_count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-sm text-muted">
          Mostrando {data.length === 0 ? 0 : offset + 1}–{Math.min(offset + count, data.length)} de {data.length} investigadores
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

function AuthorDetailPanel({ authorId, matchHeight }: { authorId: string | null; matchHeight: number }) {
  const navigate = useNavigate();
  const { ref: summaryRef, height: summaryHeight } = useElementSize<HTMLDivElement>();
  const summary = useApi(() => (authorId ? api.authorSummary(authorId) : Promise.resolve(null)), [authorId]);

  // The publications card's own end must never run past the ranking table's —
  // whatever's left after the summary card and the column gap is the budget
  // for the list itself (header/footer chrome reserved separately, see below).
  const pubsMaxHeight = matchHeight > 0 && summaryHeight > 0 ? Math.max(140, matchHeight - summaryHeight - COLUMN_GAP) : undefined;
  const ulBudget = pubsMaxHeight ? Math.max(60, pubsMaxHeight - PUB_HEADER_CHROME - PUB_FOOTER_CHROME) : undefined;

  if (!authorId) {
    return (
      <Card title="Detalle de investigador">
        <div className="flex flex-col items-center gap-1.5 rounded-md border border-dashed border-line px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink">Elegí un investigador</p>
          <p className="text-sm text-muted">Hacé clic en una fila del ranking para ver su resumen y publicaciones.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div ref={summaryRef}>
        <StateBoundary state={summary}>
          {(data) =>
            data ? (
              <Card
                title={data.fullName}
                subtitle={`ID Scopus: ${data.authorId}`}
                action={
                  <button
                    onClick={() => navigate(`/coautoria?author=${data.authorId}`)}
                    className="flex shrink-0 items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-utb-blue hover:text-utb-blue"
                  >
                    <IconNetwork className="h-4 w-4" />
                    Ver grafo de coautoría
                  </button>
                }
              >
                <div className="grid grid-cols-3 gap-3">
                  <StatTile label="Publicaciones" value={data.publicationCount} />
                  <StatTile label="Citas totales" value={data.totalCitations} />
                  <StatTile label="h-index" value={data.hIndex} />
                </div>
              </Card>
            ) : (
              <Card title="Investigador no encontrado">
                <p className="text-sm text-muted">No existe un registro para este autor.</p>
              </Card>
            )
          }
        </StateBoundary>
      </div>

      <PublicationsFitCard authorId={authorId} ulBudget={ulBudget} />
    </div>
  );
}

function PublicationsFitCard({ authorId, ulBudget }: { authorId: string; ulBudget: number | undefined }) {
  const [offset, setOffset] = useState(0);
  const [offsetStack, setOffsetStack] = useState<number[]>([]);
  const publications = useApi(() => api.authorPublications(authorId, PUB_FETCH_BATCH, offset), [authorId, offset]);

  return (
    <Card title="Publicaciones" subtitle="De este investigador." padded={false}>
      <StateBoundary state={publications} isEmpty={(p) => p.data.length === 0} emptyHint="Este autor no tiene publicaciones registradas.">
        {({ data, total }) => (
          <FitPublicationsList
            key={offset}
            data={data}
            total={total}
            offset={offset}
            budget={ulBudget}
            onNext={(shown) => {
              setOffsetStack((s) => [...s, offset]);
              setOffset((o) => o + shown);
            }}
            onPrev={() => {
              setOffsetStack((s) => {
                if (s.length === 0) return s;
                setOffset(s[s.length - 1]);
                return s.slice(0, -1);
              });
            }}
            canGoBack={offsetStack.length > 0}
          />
        )}
      </StateBoundary>
    </Card>
  );
}

function FitPublicationsList({
  data,
  total,
  offset,
  budget,
  onNext,
  onPrev,
  canGoBack,
}: {
  data: { id: string; title: string; doi: string | null; source_title: string | null; year: number; cited_by_count: number }[];
  total: number;
  offset: number;
  budget: number | undefined;
  onNext: (shown: number) => void;
  onPrev: () => void;
  canGoBack: boolean;
}) {
  const { containerRef, count } = useFitCount<HTMLUListElement>(budget, data.length);
  const canGoForward = offset + count < total;

  return (
    <>
      <ul ref={containerRef} className="flex flex-col divide-y divide-line px-6 py-2">
        {data.slice(0, count).map((pub) => (
          <li key={pub.id} className="py-3">
            {pub.doi ? (
              <a
                href={`https://doi.org/${pub.doi}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-ink hover:text-utb-blue hover:underline"
              >
                {pub.title}
              </a>
            ) : (
              <p className="text-sm font-medium text-ink">{pub.title}</p>
            )}
            <p className="mt-0.5 text-sm text-muted">
              {pub.source_title ?? "Fuente sin registrar"} · {pub.year} · {pub.cited_by_count} citas
            </p>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-line px-6 py-4">
        <p className="text-sm text-muted">
          {total === 0 ? "Sin publicaciones" : `Mostrando ${offset + 1}–${Math.min(offset + count, total)} de ${total}`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onPrev}
            disabled={!canGoBack}
            className="rounded-sm border border-line px-3 py-1 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => onNext(count)}
            disabled={!canGoForward}
            className="rounded-sm border border-line px-3 py-1 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </>
  );
}
