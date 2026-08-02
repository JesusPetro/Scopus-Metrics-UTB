export interface YearCount {
  year: number;
  count: number;
}

/**
 * Shared join fragment: "publications with at least one author verified-
 * internal to this institution" - the authoritative trust-model flag
 * (author_institutions.verified_internal), not the raw per-paper afid match
 * (publication_author_institutions.is_internal), same reasoning as
 * topPublishers/coauthorshipGraph below.
 */
const INSTITUTION_PUBLICATIONS_JOIN = `
  JOIN publication_author_institutions pai ON pai.publication_id = p.id AND pai.institution_id = ?1
  JOIN author_institutions ai ON ai.author_id = pai.author_id AND ai.institution_id = pai.institution_id AND ai.verified_internal = 1
`;

export async function growthByYear(
  db: D1Database,
  institutionId: string,
  documentType?: string
): Promise<YearCount[]> {
  const query = documentType
    ? `SELECT p.year as year, COUNT(DISTINCT p.id) as count
       FROM publications p
       ${INSTITUTION_PUBLICATIONS_JOIN}
       WHERE p.document_type = ?2
       GROUP BY p.year ORDER BY p.year`
    : `SELECT p.year as year, COUNT(DISTINCT p.id) as count
       FROM publications p
       ${INSTITUTION_PUBLICATIONS_JOIN}
       GROUP BY p.year ORDER BY p.year`;
  const stmt = documentType ? db.prepare(query).bind(institutionId, documentType) : db.prepare(query).bind(institutionId);
  const { results } = await stmt.all<YearCount>();
  return results;
}

export interface DocumentTypeCount {
  document_type: string | null;
  count: number;
}

export async function documentTypeBreakdown(db: D1Database, institutionId: string): Promise<DocumentTypeCount[]> {
  const { results } = await db
    .prepare(
      `SELECT p.document_type as document_type, COUNT(DISTINCT p.id) as count
       FROM publications p
       ${INSTITUTION_PUBLICATIONS_JOIN}
       GROUP BY p.document_type ORDER BY count DESC`
    )
    .bind(institutionId)
    .all<DocumentTypeCount>();
  return results;
}

export interface TopJournal {
  source_title: string;
  count: number;
}

export async function topJournals(db: D1Database, institutionId: string, limit = 10): Promise<TopJournal[]> {
  const { results } = await db
    .prepare(
      `SELECT p.source_title as source_title, COUNT(DISTINCT p.id) as count
       FROM publications p
       ${INSTITUTION_PUBLICATIONS_JOIN}
       WHERE p.source_title IS NOT NULL AND p.source_title != ''
       GROUP BY p.source_title ORDER BY count DESC LIMIT ?2`
    )
    .bind(institutionId, limit)
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
 * only once a re-sync of that institution runs.
 */
export async function subjectAreaBreakdown(
  db: D1Database,
  institutionId: string,
  limit = 12
): Promise<SubjectAreaCount[]> {
  const { results } = await db
    .prepare(
      `SELECT psa.name as name, COUNT(DISTINCT psa.publication_id) as count
       FROM publication_subject_areas psa
       JOIN publications p ON p.id = psa.publication_id
       ${INSTITUTION_PUBLICATIONS_JOIN}
       GROUP BY psa.name ORDER BY count DESC LIMIT ?2`
    )
    .bind(institutionId, limit)
    .all<SubjectAreaCount>();
  return results;
}

export interface OpenAccessCount {
  /** Per-article `openaccess` flag from Scopus - describes the article itself, not whether its journal is open access as a whole. */
  openAccess: boolean;
  count: number;
}

export async function openAccessBreakdown(db: D1Database, institutionId: string): Promise<OpenAccessCount[]> {
  const { results } = await db
    .prepare(
      `SELECT p.open_access as open_access, COUNT(DISTINCT p.id) as count
       FROM publications p
       ${INSTITUTION_PUBLICATIONS_JOIN}
       GROUP BY p.open_access`
    )
    .bind(institutionId)
    .all<{ open_access: number; count: number }>();
  return results.map((r) => ({ openAccess: r.open_access === 1, count: r.count }));
}

export interface TopPublisher {
  author_id: string;
  full_name: string;
  publication_count: number;
}

export async function topPublishers(
  db: D1Database,
  institutionId: string,
  limit = 20,
  documentType?: string
): Promise<TopPublisher[]> {
  const query = documentType
    ? `SELECT a.id as author_id, a.full_name, COUNT(*) as publication_count
       FROM publication_authors pa
       JOIN authors a ON a.id = pa.author_id
       JOIN author_institutions ai ON ai.author_id = a.id AND ai.institution_id = ?1 AND ai.verified_internal = 1
       JOIN publications p ON p.id = pa.publication_id
       WHERE p.document_type = ?3
       GROUP BY pa.author_id
       ORDER BY publication_count DESC
       LIMIT ?2`
    : `SELECT a.id as author_id, a.full_name, COUNT(*) as publication_count
       FROM publication_authors pa
       JOIN authors a ON a.id = pa.author_id
       JOIN author_institutions ai ON ai.author_id = a.id AND ai.institution_id = ?1 AND ai.verified_internal = 1
       GROUP BY pa.author_id
       ORDER BY publication_count DESC
       LIMIT ?2`;
  const stmt = documentType
    ? db.prepare(query).bind(institutionId, limit, documentType)
    : db.prepare(query).bind(institutionId, limit);
  const { results } = await stmt.all<TopPublisher>();
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
 * Co-authorship graph among internal authors of one institution only
 * (external co-authors, and co-authors internal to a *different* tracked
 * institution, are excluded - the point is to see which docentes of this
 * university publish together). "Internal" here means
 * `author_institutions.verified_internal = 1` for this institution
 * (whitelist or Author Retrieval API confirmed), not the raw per-publication
 * afid match, which can false-positive on external researchers with a
 * courtesy affiliation on one paper.
 */
export async function coauthorshipGraph(db: D1Database, institutionId: string): Promise<CoauthorshipGraph> {
  const { results: nodeRows } = await db
    .prepare(
      `SELECT a.id as author_id, a.full_name, COUNT(*) as publication_count
       FROM publication_authors pa
       JOIN authors a ON a.id = pa.author_id
       JOIN author_institutions ai ON ai.author_id = a.id AND ai.institution_id = ?1 AND ai.verified_internal = 1
       GROUP BY pa.author_id`
    )
    .bind(institutionId)
    .all<{ author_id: string; full_name: string; publication_count: number }>();

  const { results: edgeRows } = await db
    .prepare(
      `SELECT pa1.author_id as author_a, pa2.author_id as author_b, COUNT(*) as weight
       FROM publication_authors pa1
       JOIN publication_authors pa2
         ON pa1.publication_id = pa2.publication_id AND pa1.author_id < pa2.author_id
       JOIN author_institutions ai1 ON ai1.author_id = pa1.author_id AND ai1.institution_id = ?1 AND ai1.verified_internal = 1
       JOIN author_institutions ai2 ON ai2.author_id = pa2.author_id AND ai2.institution_id = ?1 AND ai2.verified_internal = 1
       GROUP BY pa1.author_id, pa2.author_id
       ORDER BY weight DESC`
    )
    .bind(institutionId)
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

/**
 * Not institution-scoped: an author page is about one Scopus Author ID's
 * full body of work regardless of which institution's dataset surfaced them
 * (a dual-affiliated author's publication list is the same list either way).
 * Which institution(s) they're verified-internal to is a separate concern
 * (author_institutions), orthogonal to this summary.
 */
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
