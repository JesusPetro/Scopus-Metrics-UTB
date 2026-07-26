import type { Env } from "../types/env";
import { runIngestion } from "../services/ingestion";

export async function runWeeklySync(env: Env): Promise<void> {
  const startedAt = new Date().toISOString();
  const { meta } = await env.DB.prepare(
    `INSERT INTO sync_runs (started_at, status) VALUES (?1, 'running')`
  )
    .bind(startedAt)
    .run();
  const runId = meta.last_row_id;

  try {
    const summary = await runIngestion(env);
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
