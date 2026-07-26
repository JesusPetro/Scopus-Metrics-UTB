export interface YearCount {
  year: number;
  count: number;
}

export async function growthByYear(db: D1Database): Promise<YearCount[]> {
  const { results } = await db
    .prepare(`SELECT year, COUNT(*) as count FROM publications GROUP BY year ORDER BY year`)
    .all<YearCount>();
  return results;
}

export interface DocumentTypeCount {
  document_type: string | null;
  count: number;
}

export async function documentTypeBreakdown(db: D1Database): Promise<DocumentTypeCount[]> {
  const { results } = await db
    .prepare(
      `SELECT document_type, COUNT(*) as count FROM publications
       GROUP BY document_type ORDER BY count DESC`
    )
    .all<DocumentTypeCount>();
  return results;
}

export interface TopJournal {
  source_title: string;
  count: number;
}

export async function topJournals(db: D1Database, limit = 10): Promise<TopJournal[]> {
  const { results } = await db
    .prepare(
      `SELECT source_title, COUNT(*) as count FROM publications
       WHERE source_title IS NOT NULL AND source_title != ''
       GROUP BY source_title ORDER BY count DESC LIMIT ?1`
    )
    .bind(limit)
    .all<TopJournal>();
  return results;
}

export interface SubjectAreaCount {
  name: string;
  count: number;
}

/**
 * Only populated for publications synced after subject-area was added to the
 * Scopus fetch FIELDS list (src/scopus/search.ts) - older rows show up here
 * only once POST /api/admin/sync re-syncs them.
 */
export async function subjectAreaBreakdown(db: D1Database, limit = 12): Promise<SubjectAreaCount[]> {
  const { results } = await db
    .prepare(
      `SELECT name, COUNT(DISTINCT publication_id) as count FROM publication_subject_areas
       GROUP BY name ORDER BY count DESC LIMIT ?1`
    )
    .bind(limit)
    .all<SubjectAreaCount>();
  return results;
}

export interface TopPublisher {
  author_id: string;
  full_name: string;
  publication_count: number;
}

export async function topPublishers(db: D1Database, limit = 20): Promise<TopPublisher[]> {
  const { results } = await db
    .prepare(
      `SELECT a.id as author_id, a.full_name, COUNT(*) as publication_count
       FROM publication_authors pa
       JOIN authors a ON a.id = pa.author_id
       WHERE a.verified_internal = 1
       GROUP BY pa.author_id
       ORDER BY publication_count DESC
       LIMIT ?1`
    )
    .bind(limit)
    .all<TopPublisher>();
  return results;
}

/** Standard h-index: largest n such that the author has n publications with >= n citations each. */
export function computeHIndex(citationCounts: number[]): number {
  const sorted = [...citationCounts].sort((a, b) => b - a);
  let h = 0;
  for (let i = 0; i < sorted.length; i++) {
    if ((sorted[i] ?? 0) >= i + 1) {
      h = i + 1;
    } else {
      break;
    }
  }
  return h;
}

export interface CoauthorshipNode {
  authorId: string;
  fullName: string;
  publicationCount: number;
}

export interface CoauthorshipEdge {
  authorA: string;
  authorB: string;
  weight: number;
}

export interface CoauthorshipGraph {
  nodes: CoauthorshipNode[];
  edges: CoauthorshipEdge[];
}

/**
 * Co-authorship graph among internal authors only (external co-authors are
 * excluded — the point is to see which docentes publish together). "Internal"
 * here means `authors.verified_internal = 1` (whitelist or Author Retrieval
 * API confirmed), not the raw per-publication afid match, which can false-
 * positive on external researchers with a courtesy affiliation on one paper.
 * Computed on the fly via self-join, no precomputed edges table: at ~100
 * docentes / ~2000 publications this is cheap, per the migration plan.
 */
export async function coauthorshipGraph(db: D1Database): Promise<CoauthorshipGraph> {
  const { results: nodeRows } = await db
    .prepare(
      `SELECT a.id as author_id, a.full_name, COUNT(*) as publication_count
       FROM publication_authors pa
       JOIN authors a ON a.id = pa.author_id
       WHERE a.verified_internal = 1
       GROUP BY pa.author_id`
    )
    .all<{ author_id: string; full_name: string; publication_count: number }>();

  const { results: edgeRows } = await db
    .prepare(
      `SELECT pa1.author_id as author_a, pa2.author_id as author_b, COUNT(*) as weight
       FROM publication_authors pa1
       JOIN publication_authors pa2
         ON pa1.publication_id = pa2.publication_id AND pa1.author_id < pa2.author_id
       JOIN authors a1 ON a1.id = pa1.author_id
       JOIN authors a2 ON a2.id = pa2.author_id
       WHERE a1.verified_internal = 1 AND a2.verified_internal = 1
       GROUP BY pa1.author_id, pa2.author_id
       ORDER BY weight DESC`
    )
    .all<{ author_a: string; author_b: string; weight: number }>();

  return {
    nodes: nodeRows.map((r) => ({
      authorId: r.author_id,
      fullName: r.full_name,
      publicationCount: r.publication_count,
    })),
    edges: edgeRows.map((r) => ({ authorA: r.author_a, authorB: r.author_b, weight: r.weight })),
  };
}

export interface AuthorSummary {
  authorId: string;
  fullName: string;
  publicationCount: number;
  totalCitations: number;
  hIndex: number;
}

export async function getAuthorSummary(db: D1Database, authorId: string): Promise<AuthorSummary | null> {
  const author = await db.prepare(`SELECT id, full_name FROM authors WHERE id = ?1`).bind(authorId).first<{
    id: string;
    full_name: string;
  }>();
  if (!author) return null;

  const { results } = await db
    .prepare(
      `SELECT p.cited_by_count as cited_by_count
       FROM publication_authors pa
       JOIN publications p ON p.id = pa.publication_id
       WHERE pa.author_id = ?1`
    )
    .bind(authorId)
    .all<{ cited_by_count: number }>();

  const citations = results.map((r) => r.cited_by_count ?? 0);

  return {
    authorId: author.id,
    fullName: author.full_name,
    publicationCount: citations.length,
    totalCitations: citations.reduce((sum, c) => sum + c, 0),
    hIndex: computeHIndex(citations),
  };
}
