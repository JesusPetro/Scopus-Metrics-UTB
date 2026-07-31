import type { ParsedPublication } from "../../types/scopus";

export interface PublicationRow {
  id: string;
  title: string;
  doi: string | null;
  cover_date: string | null;
  year: number;
  document_type: string | null;
  source_title: string | null;
  cited_by_count: number;
  /** Per-article OA status from Scopus (0/1) - not a statement about the journal as a whole. */
  open_access: number;
}

export async function upsertPublication(db: D1Database, pub: ParsedPublication): Promise<void> {
  await db
    .prepare(
      `INSERT INTO publications
         (id, title, doi, cover_date, year, document_type, source_title, cited_by_count, open_access, raw_json, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         doi = excluded.doi,
         cover_date = excluded.cover_date,
         year = excluded.year,
         document_type = excluded.document_type,
         source_title = excluded.source_title,
         cited_by_count = excluded.cited_by_count,
         open_access = excluded.open_access,
         raw_json = excluded.raw_json,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      pub.id,
      pub.title,
      pub.doi,
      pub.coverDate,
      pub.year,
      pub.documentType,
      pub.sourceTitle,
      pub.citedByCount,
      pub.isOpenAccess ? 1 : 0,
      JSON.stringify(pub.raw)
    )
    .run();
}

export async function replacePublicationSubjectAreas(
  db: D1Database,
  publicationId: string,
  areas: { code: string; abbrev: string | null; name: string }[]
): Promise<void> {
  const statements = [
    db.prepare(`DELETE FROM publication_subject_areas WHERE publication_id = ?1`).bind(publicationId),
    ...areas.map((a) =>
      db
        .prepare(
          `INSERT INTO publication_subject_areas (publication_id, code, abbrev, name)
           VALUES (?1, ?2, ?3, ?4)`
        )
        .bind(publicationId, a.code, a.abbrev, a.name)
    ),
  ];
  if (statements.length > 0) await db.batch(statements);
}

/**
 * Authorship fact (who wrote this paper, in what order) - institution-agnostic,
 * so re-ingesting the same publication from a different institution's sync
 * (e.g. a paper co-authored across two compared universities) is a harmless
 * overwrite of the same author list Scopus reports either way.
 */
export async function replacePublicationAuthors(
  db: D1Database,
  publicationId: string,
  authors: { authorId: string; order: number }[]
): Promise<void> {
  const statements = [
    db.prepare(`DELETE FROM publication_authors WHERE publication_id = ?1`).bind(publicationId),
    ...authors.map((a) =>
      db
        .prepare(
          `INSERT INTO publication_authors (publication_id, author_id, author_order)
           VALUES (?1, ?2, ?3)`
        )
        .bind(publicationId, a.authorId, a.order)
    ),
  ];
  await db.batch(statements);
}

/**
 * Institution-relative `is_internal` reading (that author's afid matched this
 * institution's affiliation on this paper). Scoped delete+insert by
 * (publication_id, institution_id) only - unlike a single is_internal column,
 * this can't be clobbered by a different institution's sync touching the same
 * shared publication.
 */
export async function replacePublicationAuthorInstitutions(
  db: D1Database,
  publicationId: string,
  institutionId: string,
  authors: { authorId: string; isInternal: boolean }[]
): Promise<void> {
  const statements = [
    db
      .prepare(`DELETE FROM publication_author_institutions WHERE publication_id = ?1 AND institution_id = ?2`)
      .bind(publicationId, institutionId),
    ...authors.map((a) =>
      db
        .prepare(
          `INSERT INTO publication_author_institutions (publication_id, author_id, institution_id, is_internal)
           VALUES (?1, ?2, ?3, ?4)`
        )
        .bind(publicationId, a.authorId, institutionId, a.isInternal ? 1 : 0)
    ),
  ];
  await db.batch(statements);
}

const SORT_COLUMNS = {
  date: "p.cover_date",
  citations: "p.cited_by_count",
  year: "p.year",
  title: "p.title",
} as const;

export type PublicationSort = keyof typeof SORT_COLUMNS;

export interface PublicationFilter {
  year?: number;
  authorId?: string;
  documentType?: string;
  subjectArea?: string;
  /** Restrict to publications with at least one author verified-internal to this institution. */
  institutionId?: string;
}

/**
 * Shared join/where builder so list and count never drift out of sync with
 * each other. Placeholders inside `joins` and inside `where` are tracked in
 * separate bind arrays and concatenated join-then-where, matching the order
 * they'll actually appear in the final `FROM publications p${joins}${where}`
 * SQL text - binds must be positional, so join-placeholder order must not be
 * interleaved with where-placeholder order.
 */
function buildPublicationQuery(opts: PublicationFilter): { joins: string; where: string; binds: unknown[] } {
  const conditions: string[] = [];
  const joinBinds: unknown[] = [];
  const whereBinds: unknown[] = [];
  let joins = "";

  if (opts.authorId) {
    joins += ` JOIN publication_authors pa ON pa.publication_id = p.id`;
    conditions.push(`pa.author_id = ?`);
    whereBinds.push(opts.authorId);
  }
  if (opts.institutionId) {
    // Authoritative verified_internal (trust model), not the raw per-paper
    // afid match on publication_author_institutions.is_internal - same
    // reasoning as topPublishers/coauthorshipGraph in services/metrics.ts.
    joins += ` JOIN publication_author_institutions pai ON pai.publication_id = p.id AND pai.institution_id = ?
               JOIN author_institutions ai ON ai.author_id = pai.author_id AND ai.institution_id = pai.institution_id`;
    conditions.push(`ai.verified_internal = 1`);
    joinBinds.push(opts.institutionId);
  }
  if (opts.subjectArea) {
    joins += ` JOIN publication_subject_areas psa ON psa.publication_id = p.id`;
    conditions.push(`psa.name = ?`);
    whereBinds.push(opts.subjectArea);
  }
  if (opts.year) {
    conditions.push(`p.year = ?`);
    whereBinds.push(opts.year);
  }
  if (opts.documentType) {
    conditions.push(`p.document_type = ?`);
    whereBinds.push(opts.documentType);
  }

  return {
    joins,
    where: conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "",
    binds: [...joinBinds, ...whereBinds],
  };
}

export async function listPublications(
  db: D1Database,
  opts: PublicationFilter & {
    sort?: PublicationSort;
    sortDir?: "asc" | "desc";
    limit?: number;
    offset?: number;
  } = {}
): Promise<PublicationRow[]> {
  const { joins, where, binds } = buildPublicationQuery(opts);
  const sortColumn = SORT_COLUMNS[opts.sort ?? "date"];
  const sortDir = opts.sortDir === "asc" ? "ASC" : "DESC";
  const sql = `SELECT DISTINCT p.id, p.title, p.doi, p.cover_date, p.year, p.document_type, p.source_title, p.cited_by_count, p.open_access
             FROM publications p${joins}${where}
             ORDER BY ${sortColumn} ${sortDir} LIMIT ? OFFSET ?`;

  const { results } = await db
    .prepare(sql)
    .bind(...binds, opts.limit ?? 50, opts.offset ?? 0)
    .all<PublicationRow>();
  return results;
}

export async function countPublications(db: D1Database, opts: PublicationFilter = {}): Promise<number> {
  const { joins, where, binds } = buildPublicationQuery(opts);
  const sql = `SELECT COUNT(DISTINCT p.id) as count FROM publications p${joins}${where}`;
  const row = await db
    .prepare(sql)
    .bind(...binds)
    .first<{ count: number }>();
  return row?.count ?? 0;
}
