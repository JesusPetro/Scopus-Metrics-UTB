import type { Env } from "../types/env";
import { createScopusClient } from "../scopus/client";
import { fetchAuthorCurrentAffiliationId } from "../scopus/authorRetrieval";

export interface VerificationSummary {
  checked: number;
  confirmedInternal: number;
  rejected: number;
  remaining: number;
}

/**
 * Resolves the `verified_internal` flag for authors that some publication
 * flagged as a candidate (via afid match) but that aren't on the manual
 * whitelist yet. Capped at `limit` per call - Cloudflare Workers free tier
 * allows only 50 subrequests per invocation, and this hits the Elsevier
 * Author Retrieval API once per author, so this is meant to be called
 * repeatedly (POST /api/admin/verify-authors) until `remaining` is 0, not as
 * part of the weekly ingestion cron (which already spends its own budget on
 * the affiliation search).
 */
export async function verifyPendingAuthors(env: Env, limit = 40): Promise<VerificationSummary> {
  const client = createScopusClient(env);

  const { results: pending } = await env.DB.prepare(
    `SELECT DISTINCT a.id
     FROM authors a
     JOIN publication_authors pa ON pa.author_id = a.id
     WHERE a.verified_internal IS NULL AND pa.is_internal = 1
     LIMIT ?1`
  )
    .bind(limit)
    .all<{ id: string }>();

  let confirmedInternal = 0;
  let rejected = 0;

  for (const { id } of pending) {
    const affiliationId = await fetchAuthorCurrentAffiliationId(client, id);
    const isInternal = affiliationId === env.SCOPUS_AFFILIATION_ID;
    await env.DB.prepare(`UPDATE authors SET verified_internal = ?1 WHERE id = ?2`)
      .bind(isInternal ? 1 : 0, id)
      .run();
    if (isInternal) {
      confirmedInternal += 1;
    } else {
      rejected += 1;
    }
  }

  const { results: remainingRows } = await env.DB.prepare(
    `SELECT COUNT(DISTINCT a.id) as count
     FROM authors a
     JOIN publication_authors pa ON pa.author_id = a.id
     WHERE a.verified_internal IS NULL AND pa.is_internal = 1`
  ).all<{ count: number }>();

  return {
    checked: pending.length,
    confirmedInternal,
    rejected,
    remaining: remainingRows[0]?.count ?? 0,
  };
}
