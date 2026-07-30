export interface Institution {
  id: string;
  name: string;
  /** Short display label for data contexts (chips, legend, chart tooltips) - falls back to the full name until curated. */
  abbreviation: string;
  scopusAffiliationId: string;
  isDefault: boolean;
  autoSync: boolean;
}

interface InstitutionRow {
  id: string;
  name: string;
  abbreviation: string | null;
  scopus_affiliation_id: string;
  is_default: number;
  auto_sync: number;
}

const INSTITUTION_COLUMNS = "id, name, abbreviation, scopus_affiliation_id, is_default, auto_sync";

function toInstitution(row: InstitutionRow): Institution {
  return {
    id: row.id,
    name: row.name,
    abbreviation: row.abbreviation ?? row.name,
    scopusAffiliationId: row.scopus_affiliation_id,
    isDefault: row.is_default === 1,
    autoSync: row.auto_sync === 1,
  };
}

export async function listInstitutions(db: D1Database): Promise<Institution[]> {
  const { results } = await db
    .prepare(`SELECT ${INSTITUTION_COLUMNS} FROM institutions ORDER BY name`)
    .all<InstitutionRow>();
  return results.map(toInstitution);
}

export async function listAutoSyncInstitutions(db: D1Database): Promise<Institution[]> {
  const { results } = await db
    .prepare(`SELECT ${INSTITUTION_COLUMNS} FROM institutions WHERE auto_sync = 1 ORDER BY name`)
    .all<InstitutionRow>();
  return results.map(toInstitution);
}

export async function getInstitution(db: D1Database, id: string): Promise<Institution | null> {
  const row = await db
    .prepare(`SELECT ${INSTITUTION_COLUMNS} FROM institutions WHERE id = ?1`)
    .bind(id)
    .first<InstitutionRow>();
  return row ? toInstitution(row) : null;
}

export async function getDefaultInstitution(db: D1Database): Promise<Institution | null> {
  const row = await db
    .prepare(`SELECT ${INSTITUTION_COLUMNS} FROM institutions WHERE is_default = 1 LIMIT 1`)
    .first<InstitutionRow>();
  return row ? toInstitution(row) : null;
}

/** IDs on the manual whitelist for a given institution - membership always wins, see upsertAuthorInstitution. */
export async function getWhitelistedAuthorIds(db: D1Database, institutionId: string): Promise<Set<string>> {
  const { results } = await db
    .prepare(`SELECT author_id FROM institution_author_whitelist WHERE institution_id = ?1`)
    .bind(institutionId)
    .all<{ author_id: string }>();
  return new Set(results.map((r) => r.author_id));
}
