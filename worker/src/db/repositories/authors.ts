import { KNOWN_AUTHOR_IDS } from "../../data/knownAuthorIds";

export interface AuthorRow {
  id: string;
  full_name: string;
  orcid: string | null;
}

/**
 * Whitelist membership always wins and is sticky: once an id is known-internal
 * it stays `verified_internal = 1` on every future sync, regardless of what a
 * later verification pass might say. Non-whitelisted authors keep whatever
 * `verified_internal` value they already had (NULL until verified via
 * POST /api/admin/verify-authors).
 */
export async function upsertAuthor(db: D1Database, id: string, fullName: string): Promise<void> {
  const whitelisted = KNOWN_AUTHOR_IDS.has(id);
  await db
    .prepare(
      `INSERT INTO authors (id, full_name, verified_internal, updated_at)
       VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         full_name = excluded.full_name,
         verified_internal = CASE WHEN ?3 = 1 THEN 1 ELSE authors.verified_internal END,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(id, fullName, whitelisted ? 1 : null)
    .run();
}

export async function getAuthor(db: D1Database, id: string): Promise<AuthorRow | null> {
  const row = await db.prepare(`SELECT id, full_name, orcid FROM authors WHERE id = ?1`).bind(id).first<AuthorRow>();
  return row ?? null;
}

export async function listAuthors(db: D1Database, limit = 100, offset = 0): Promise<AuthorRow[]> {
  const { results } = await db
    .prepare(`SELECT id, full_name, orcid FROM authors ORDER BY full_name LIMIT ?1 OFFSET ?2`)
    .bind(limit, offset)
    .all<AuthorRow>();
  return results;
}
