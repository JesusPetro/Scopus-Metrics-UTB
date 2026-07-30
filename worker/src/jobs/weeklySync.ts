import type { Env } from "../types/env";
import { runIngestion } from "../services/ingestion";
import { listAutoSyncInstitutions } from "../db/repositories/institutions";

export async function runSyncForInstitution(env: Env, institutionId: string): Promise<void> {
  const startedAt = new Date().toISOString();
  const { meta } = await env.DB.prepare(
    `INSERT INTO sync_runs (started_at, status, institution_id) VALUES (?1, 'running', ?2)`
  )
    .bind(startedAt, institutionId)
    .run();
  const runId = meta.last_row_id;

  try {
    const summary = await runIngestion(env, institutionId);
    await env.DB.prepare(
      `UPDATE sync_runs SET finished_at = ?1, publications_synced = ?2, status = 'ok' WHERE id = ?3`
    )
      .bind(new Date().toISOString(), summary.publicationsSynced, runId)
      .run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await env.DB.prepare(
      `UPDATE sync_runs SET finished_at = ?1, status = 'error', error_message = ?2 WHERE id = ?3`
    )
      .bind(new Date().toISOString(), message.slice(0, 1000), runId)
      .run();
    throw err;
  }
}

/**
 * Cron entry point - only syncs institutions flagged `auto_sync = 1` (just
 * UTB by default). Comparison universities are preloaded manually via
 * POST /api/admin/sync?institution=<id> instead: the free-plan 50-subrequest
 * cap is sized for one institution's ~2000 pubs (~10 requests) per
 * invocation, and syncing several unattended on the same schedule risks
 * blowing that budget on a larger university's dataset.
 */
export async function runWeeklySync(env: Env): Promise<void> {
  const institutions = await listAutoSyncInstitutions(env.DB);
  for (const institution of institutions) {
    await runSyncForInstitution(env, institution.id);
  }
}
