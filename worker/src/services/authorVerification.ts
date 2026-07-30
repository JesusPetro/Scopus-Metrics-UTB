import type { Env } from "../types/env";
import { createScopusClient } from "../scopus/client";
import { fetchAuthorCurrentAffiliationIds } from "../scopus/authorRetrieval";
import { getInstitution } from "../db/repositories/institutions";
import { ScopusResponseError } from "../lib/errors";

export interface VerificationSummary {
  checked: number;
  confirmedInternal: number;
  rejected: number;
  pendingReview: number;
  remaining: number;
}

/**
 * Resolves the `verified_internal` flag (author_institutions) for authors
 * that some publication flagged as a candidate for this institution (via
 * afid match) but that aren't on this institution's manual whitelist yet.
 *
 * Verification is a membership test against *all* of the author's current
 * affiliations (see fetchAuthorCurrentAffiliationIds), not equality against
 * one - an author legitimately affiliated with more than one institution we
 * track (e.g. cátedra docentes) should be confirmed independently for each.
 *
 * Absence from that list is deliberately NOT auto-rejected: Scopus profiles
 * lag real appointments, so "not the current affiliation on file" is weak
 * evidence, not proof. But an explicit empty/unresolvable API response
 * (nothing to go on, or a 404 - profile deleted/merged) still gets written
 * as 0 ("pendingReview" in the summary marks it as this kind of rejection,
 * not a confirmed non-match) rather than left NULL - leaving it NULL would
 * make every future call re-select the same unresolvable author first
 * forever, so `remaining` never reaches 0. The manual whitelist is still the
 * fallback if one of these turns out to actually be internal - whitelist
 * membership always overrides this on the next sync (see
 * upsertAuthorInstitution), so writing 0 here isn't a dead end.
 *
 * Capped at `limit` per call - Cloudflare Workers free tier allows only 50
 * subrequests per invocation, and this hits the Elsevier Author Retrieval
 * API once per author, so this is meant to be called repeatedly
 * (POST /api/admin/verify-authors?institution=<id>) until `remaining` is 0,
 * not as part of the weekly ingestion cron.
 */
export async function verifyPendingAuthors(
  env: Env,
  institutionId: string,
  limit = 40
): Promise<VerificationSummary> {
  const institution = await getInstitution(env.DB, institutionId);
  if (!institution) {
    throw new Error(`Unknown institution: ${institutionId}`);
  }

  const client = createScopusClient(env);

  const pendingQuery = `SELECT DISTINCT pai.author_id as id
     FROM publication_author_institutions pai
     LEFT JOIN author_institutions ai
       ON ai.author_id = pai.author_id AND ai.institution_id = pai.institution_id
     WHERE pai.institution_id = ?1 AND pai.is_internal = 1 AND ai.verified_internal IS NULL`;

  const { results: pending } = await env.DB.prepare(`${pendingQuery} LIMIT ?2`)
    .bind(institutionId, limit)
    .all<{ id: string }>();

  let confirmedInternal = 0;
  let rejected = 0;
  let pendingReview = 0;

  for (const { id } of pending) {
    let affiliationIds: string[];
    try {
      affiliationIds = await fetchAuthorCurrentAffiliationIds(client, id);
    } catch (err) {
      // A 404 means Scopus no longer has a profile at this exact Author ID -
      // it was deleted or merged into another one (Scopus periodically
      // dedupes author profiles). That's unresolvable for this ID, not an
      // infra failure - treat it the same as an empty response (pendingReview)
      // instead of letting it abort the whole batch and leave this author
      // permanently NULL, which would make every future call re-select it
      // first and crash again. Any other error (auth, rate limit, connection,
      // schema) is a real problem with the call itself, not this one author -
      // let it propagate and fail the batch loudly, same as before.
      if (err instanceof ScopusResponseError && err.statusCode === 404) {
        pendingReview += 1;
        await markUnresolved(env, id, institutionId);
        continue;
      }
      throw err;
    }

    if (affiliationIds.length === 0) {
      // Nothing to go on - write 0 so this stops being re-selected as
      // "pending" every call; still overridable via manual whitelist.
      pendingReview += 1;
      await markUnresolved(env, id, institutionId);
      continue;
    }

    const isInternal = affiliationIds.includes(institution.scopusAffiliationId);
    await env.DB.prepare(
      `INSERT INTO author_institutions (author_id, institution_id, verified_internal)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(author_id, institution_id) DO UPDATE SET verified_internal = excluded.verified_internal`
    )
      .bind(id, institutionId, isInternal ? 1 : 0)
      .run();

    if (isInternal) {
      confirmedInternal += 1;
    } else {
      rejected += 1;
    }
  }

  const { results: remainingRows } = await env.DB.prepare(`SELECT COUNT(*) as count FROM (${pendingQuery})`)
    .bind(institutionId)
    .all<{ count: number }>();

  return {
    checked: pending.length,
    confirmedInternal,
    rejected,
    pendingReview,
    remaining: remainingRows[0]?.count ?? 0,
  };
}

async function markUnresolved(env: Env, authorId: string, institutionId: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO author_institutions (author_id, institution_id, verified_internal)
     VALUES (?1, ?2, 0)
     ON CONFLICT(author_id, institution_id) DO UPDATE SET verified_internal = 0`
  )
    .bind(authorId, institutionId)
    .run();
}
