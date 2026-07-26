import { useState } from "react";
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

const PAGE_SIZE = 15;
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

export function Ranking() {
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const topAuthors = useApi(() => api.topAuthors(50), []);
  const { ref: tableCardRef, height: tableCardHeight } = useElementSize<HTMLDivElement>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink">Ranking de Investigadores</h1>
        <p className="mt-1 text-sm text-muted">
          Autores internos verificados (`authors.verified_internal`), ordenados por cantidad de publicaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div ref={tableCardRef}>
          <Card padded={false}>
            <StateBoundary
              state={topAuthors}
              isEmpty={(d) => d.length === 0}
              emptyTitle="Todavía no hay investigadores verificados"
              emptyHint="Corré POST /api/admin/verify-authors para resolver candidatos a interno."
            >
              {(data) => (
                <RankingTable
                  data={data}
                  page={page}
                  onPageChange={setPage}
                  selected={selected}
                  onSelect={setSelected}
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
  page,
  onPageChange,
  selected,
  onSelect,
}: {
  data: { author_id: string; full_name: string; publication_count: number }[];
  page: number;
  onPageChange: (page: number) => void;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageData = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const bodyRef = useStaggerReveal<HTMLTableSectionElement>([page, data]);

  return (
    <>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[12.5px] font-semibold tracking-wide text-muted uppercase">
            <th className="px-6 py-3 font-semibold">#</th>
            <th className="px-3 py-3 font-semibold">Investigador</th>
            <th className="px-6 py-3 text-right font-semibold">Publicaciones</th>
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {pageData.map((author, i) => (
            <tr
              key={author.author_id}
              onClick={() => onSelect(author.author_id)}
              className={`cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-canvas ${
                selected === author.author_id ? "bg-canvas" : ""
              }`}
            >
              <td className="px-6 py-3 text-muted">{page * PAGE_SIZE + i + 1}</td>
              <td className="px-3 py-3 font-medium text-ink">{author.full_name}</td>
              <td className="px-6 py-3 text-right font-semibold text-ink">{author.publication_count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-sm text-muted">
            Página {page + 1} de {totalPages} · {data.length} investigadores
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded-sm border border-line px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-sm border border-line px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
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
