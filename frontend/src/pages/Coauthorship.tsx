import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../components/Card";
import { StateBoundary } from "../components/StateBoundary";
import { NetworkGraph } from "../components/charts/NetworkGraph";
import { IconSearch, IconUsers } from "../components/icons";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";
import { useInstitution } from "../lib/InstitutionContext";
import { useElementSize } from "../lib/useElementSize";
import { useGraphLayout } from "../lib/useGraphLayout";
import { usePanZoom } from "../lib/usePanZoom";
import type { CoauthorshipGraph as CoauthorshipGraphData } from "../lib/types";

export function Coauthorship() {
  const { selectedId } = useInstitution();
  const graph = useApi(() => api.coauthorship(selectedId ?? undefined), [selectedId]);
  const [searchParams, setSearchParams] = useSearchParams();
  const preselected = searchParams.get("author");

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[560px] flex-col gap-4 lg:h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink">Coautoría Institucional</h1>
        <p className="mt-1 text-sm text-muted">
          Nodos: investigadores internos verificados. Aristas: publicaciones en conjunto. Arrastrá para mover el
          lienzo, rueda del mouse para hacer zoom.
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <StateBoundary
          state={graph}
          isEmpty={(d) => d.nodes.length === 0}
          emptyTitle="Todavía no hay red de coautoría"
          emptyHint="Se necesitan autores verificados con publicaciones compartidas — corré la sincronización y la verificación de autores primero."
        >
          {(data) => (
            <GraphExplorer
              data={data}
              preselected={preselected}
              onSelectionChange={(id) => setSearchParams(id ? { author: id } : {}, { replace: true })}
            />
          )}
        </StateBoundary>
      </div>
    </div>
  );
}

function GraphExplorer({
  data,
  preselected,
  onSelectionChange,
}: {
  data: CoauthorshipGraphData;
  preselected: string | null;
  onSelectionChange: (id: string | null) => void;
}) {
  const [selected, setSelected] = useState<string | null>(preselected);
  const [query, setQuery] = useState("");
  const [coauthorPage, setCoauthorPage] = useState(0);
  const COAUTHORS_PAGE_SIZE = 6;
  const { ref: containerRef, width, height } = useElementSize<HTMLDivElement>();
  const w = width || 900;
  const h = height || 560;
  const layout = useGraphLayout(data.nodes, data.edges, w, h);
  const panZoom = usePanZoom();

  const fitAll = () => {
    if (layout.nodes.length === 0) return;
    const xs = layout.nodes.map((n) => n.x);
    const ys = layout.nodes.map((n) => n.y);
    panZoom.fitToBounds(
      { minX: Math.min(...xs) - 40, minY: Math.min(...ys) - 40, maxX: Math.max(...xs) + 40, maxY: Math.max(...ys) + 40 },
      w,
      h
    );
  };

  // Fit the whole graph once real dimensions and a settled layout exist.
  useEffect(() => {
    if (width > 0 && height > 0 && layout.nodes.length > 0) fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, layout.nodes.length]);

  // Preselect + center on the author passed via ?author= (e.g. from Ranking's "Ver grafo" button).
  useEffect(() => {
    if (!preselected || width === 0 || height === 0) return;
    const node = layout.nodes.find((n) => n.authorId === preselected);
    if (node) {
      setSelected(node.authorId);
      panZoom.centerOn(node.x, node.y, w, h, 1.4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselected, width, height, layout.nodes.length]);

  function select(id: string | null) {
    setSelected(id);
    setCoauthorPage(0);
    onSelectionChange(id);
    if (id) {
      const node = layout.nodes.find((n) => n.authorId === id);
      if (node) panZoom.centerOn(node.x, node.y, w, h, Math.max(panZoom.transform.k, 1.2));
    }
  }

  const selectedNode = data.nodes.find((n) => n.authorId === selected) ?? null;
  const coauthors = useMemo(() => {
    if (!selected) return [];
    const byId = new Map(data.nodes.map((n) => [n.authorId, n]));
    return data.edges
      .filter((e) => e.authorA === selected || e.authorB === selected)
      .map((e) => {
        const otherId = e.authorA === selected ? e.authorB : e.authorA;
        return { node: byId.get(otherId), weight: e.weight };
      })
      .filter((c): c is { node: NonNullable<typeof c.node>; weight: number } => !!c.node)
      .sort((a, b) => b.weight - a.weight);
  }, [selected, data]);

  const searchMatches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return data.nodes.filter((n) => n.fullName.toLowerCase().includes(q)).slice(0, 8);
  }, [query, data.nodes]);

  return (
    <div className="grid h-full grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
      <Card padded={false} className="h-[60vh] min-h-[420px] overflow-hidden xl:h-full">
        <div ref={containerRef} className="h-full w-full">
          {width > 0 && height > 0 && (
            <NetworkGraph
              nodes={layout.nodes}
              edges={layout.edges}
              width={w}
              height={h}
              selectedId={selected}
              onSelect={(id) => select(id === selected ? null : id)}
              transform={panZoom.transform}
              panZoomHandlers={{
                onPointerDown: panZoom.onPointerDown,
                onPointerMove: panZoom.onPointerMove,
                onPointerUp: (e) => {
                  const dragged = panZoom.onPointerUp(e);
                  return dragged;
                },
                onWheel: panZoom.onWheel,
              }}
              onZoomIn={() => panZoom.zoomBy(1.25)}
              onZoomOut={() => panZoom.zoomBy(0.8)}
              onFit={fitAll}
            />
          )}
        </div>
      </Card>

      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto pr-0.5">
        <Card title="Explorador de Red">
          <div className="relative">
            <IconSearch className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar investigador…"
              className="w-full rounded-full border border-line bg-surface py-2.5 pr-4 pl-10 text-sm text-ink placeholder:text-muted focus:border-utb-blue focus:outline-none"
            />
            {searchMatches.length > 0 && (
              <ul className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-md border border-line bg-surface shadow-card">
                {searchMatches.map((n) => (
                  <li key={n.authorId}>
                    <button
                      onClick={() => {
                        select(n.authorId);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm hover:bg-canvas"
                    >
                      <span className="text-ink">{n.fullName}</span>
                      <span className="text-muted">{n.publicationCount} pub.</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {selectedNode ? (
          <>
            <Card title={selectedNode.fullName} subtitle="Selección activa">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-canvas p-3">
                  <p className="text-[12.5px] font-semibold tracking-wide text-muted uppercase">Publicaciones</p>
                  <p className="mt-1 text-xl font-bold text-ink">{selectedNode.publicationCount}</p>
                </div>
                <div className="rounded-md bg-canvas p-3">
                  <p className="text-[12.5px] font-semibold tracking-wide text-muted uppercase">Coautores</p>
                  <p className="mt-1 text-xl font-bold text-ink">{coauthors.length}</p>
                </div>
              </div>
            </Card>

            <Card
              title="Coautores"
              subtitle={`Ordenados por publicaciones en conjunto${coauthors.length ? ` · ${coauthors.length} en total` : ""}.`}
              className="min-h-0"
            >
              {coauthors.length === 0 ? (
                <p className="text-sm text-muted">Sin coautores internos verificados registrados.</p>
              ) : (
                <>
                  <ul className="flex flex-col divide-y divide-line">
                    {coauthors
                      .slice(coauthorPage * COAUTHORS_PAGE_SIZE, (coauthorPage + 1) * COAUTHORS_PAGE_SIZE)
                      .map(({ node, weight }) => (
                        <li key={node.authorId}>
                          <button
                            onClick={() => select(node.authorId)}
                            className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:text-utb-blue"
                          >
                            <span className="text-sm font-medium text-ink">{node.fullName}</span>
                            <span className="shrink-0 text-sm font-semibold text-muted">{weight} art. juntos</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                  {coauthors.length > COAUTHORS_PAGE_SIZE && (
                    <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                      <p className="text-sm text-muted">
                        Página {coauthorPage + 1} de {Math.ceil(coauthors.length / COAUTHORS_PAGE_SIZE)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCoauthorPage((p) => Math.max(0, p - 1))}
                          disabled={coauthorPage === 0}
                          className="rounded-sm border border-line px-3 py-1 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() =>
                            setCoauthorPage((p) =>
                              Math.min(Math.ceil(coauthors.length / COAUTHORS_PAGE_SIZE) - 1, p + 1)
                            )
                          }
                          disabled={(coauthorPage + 1) * COAUTHORS_PAGE_SIZE >= coauthors.length}
                          className="rounded-sm border border-line px-3 py-1 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </>
        ) : (
          <Card title="Red completa">
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-canvas p-3">
                <p className="text-[12.5px] font-semibold tracking-wide text-muted uppercase">Investigadores</p>
                <p className="mt-1 text-xl font-bold text-ink">{data.nodes.length}</p>
              </div>
              <div className="rounded-md bg-canvas p-3">
                <p className="text-[12.5px] font-semibold tracking-wide text-muted uppercase">Conexiones</p>
                <p className="mt-1 text-xl font-bold text-ink">{data.edges.length}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-md border border-dashed border-line p-3 text-sm text-muted">
              <IconUsers className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Elegí un nodo en el grafo (o buscá arriba) para ver sus coautores y cuántos artículos comparten.</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
