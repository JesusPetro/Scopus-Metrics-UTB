export interface AuthorRow {
  id: string;
  full_name: string;
  orcid: string | null;
}

/** Plain upsert of the author fact (name) - institution membership/verification lives in author_institutions. */
export async function upsertAuthor(db: D1Database, id: string, fullName: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO authors (id, full_name, updated_at)
       VALUES (?1, ?2, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         full_name = excluded.full_name,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(id, fullName)
    .run();
}

/**
 * Whitelist membership always wins and is sticky: once an author is
 * known-internal to an institution it stays `verified_internal = 1` on every
 * future sync for that institution, regardless of what a later verification
 * pass might say. Non-whitelisted authors keep whatever `verified_internal`
 * value they already had for that institution (NULL until verified via
 * POST /api/admin/verify-authors?institution=<id>).
 */
export async function upsertAuthorInstitution(
  db: D1Database,
  authorId: string,
  institutionId: string,
  whitelisted: boolean
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO author_institutions (author_id, institution_id, verified_internal)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(author_id, institution_id) DO UPDATE SET
         verified_internal = CASE WHEN ?3 = 1 THEN 1 ELSE author_institutions.verified_internal END`
    )
    .bind(authorId, institutionId, whitelisted ? 1 : null)
    .run();
}

export async function getAuthor(db: D1Database, id: string): Promise<AuthorRow | null> {
  const row = await db.prepare(`SELECT id, full_name, orcid FROM authors WHERE id = ?1`).bind(id).first<AuthorRow>();
  return row ?? null;
}

export async function listAuthors(
  db: D1Database,
  limit = 100,
  offset = 0,
  institutionId?: string
): Promise<AuthorRow[]> {
  if (institutionId) {
    const { results } = await db
      .prepare(
        `SELECT a.id, a.full_name, a.orcid
         FROM authors a
         JOIN author_institutions ai ON ai.author_id = a.id
         WHERE ai.institution_id = ?1 AND ai.verified_internal = 1
         ORDER BY a.full_name LIMIT ?2 OFFSET ?3`
      )
      .bind(institutionId, limit, offset)
      .all<AuthorRow>();
    return results;
  }
  const { results } = await db
    .prepare(`SELECT id, full_name, orcid FROM authors ORDER BY full_name LIMIT ?1 OFFSET ?2`)
    .bind(limit, offset)
    .all<AuthorRow>();
  return results;
}
