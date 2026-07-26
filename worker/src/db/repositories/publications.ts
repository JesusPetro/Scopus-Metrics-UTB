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
}

export async function upsertPublication(db: D1Database, pub: ParsedPublication): Promise<void> {
  await db
    .prepare(
      `INSERT INTO publications
         (id, title, doi, cover_date, year, document_type, source_title, cited_by_count, raw_json, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         doi = excluded.doi,
         cover_date = excluded.cover_date,
         year = excluded.year,
         document_type = excluded.document_type,
         source_title = excluded.source_title,
         cited_by_count = excluded.cited_by_count,
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

export async function replacePublicationAuthors(
  db: D1Database,
  publicationId: string,
  authors: { authorId: string; order: number; isInternal: boolean }[]
): Promise<void> {
  const statements = [
    db.prepare(`DELETE FROM publication_authors WHERE publication_id = ?1`).bind(publicationId),
    ...authors.map((a) =>
      db
        .prepare(
          `INSERT INTO publication_authors (publication_id, author_id, author_order, is_internal)
           VALUES (?1, ?2, ?3, ?4)`
        )
        .bind(publicationId, a.authorId, a.order, a.isInternal ? 1 : 0)
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
}

/** Shared join/where builder so list and count never drift out of sync with each other. */
function buildPublicationQuery(opts: PublicationFilter): { joins: string; where: string; binds: unknown[] } {
  const conditions: string[] = [];
  const binds: unknown[] = [];
  let joins = "";

  if (opts.authorId) {
    joins += ` JOIN publication_authors pa ON pa.publication_id = p.id`;
    conditions.push(`pa.author_id = ?`);
    binds.push(opts.authorId);
  }
  if (opts.subjectArea) {
    joins += ` JOIN publication_subject_areas psa ON psa.publication_id = p.id`;
    conditions.push(`psa.name = ?`);
    binds.push(opts.subjectArea);
  }
  if (opts.year) {
    conditions.push(`p.year = ?`);
    binds.push(opts.year);
  }
  if (opts.documentType) {
    conditions.push(`p.document_type = ?`);
    binds.push(opts.documentType);
  }

  return { joins, where: conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "", binds };
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
  const sql = `SELECT DISTINCT p.id, p.title, p.doi, p.cover_date, p.year, p.document_type, p.source_title, p.cited_by_count
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
