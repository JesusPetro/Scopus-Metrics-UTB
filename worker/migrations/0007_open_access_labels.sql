-- 0006 originally added open_access_publisher (a DOI-prefix guess, MDPI-only)
-- and was already applied before the approach changed to use Scopus's own
-- OA categories via the `freetoreadLabel` field. This migration corrects the
-- schema: drop the old guess column, add the real one.
--
-- No backfill here: this data only exists in Scopus, not in what we already
-- stored (raw_json from before this migration has no freetoreadLabel field).
-- Existing rows get it on their next full sync (POST /api/admin/sync), since
-- ingestion re-fetches and upserts every publication each run.
ALTER TABLE publications DROP COLUMN open_access_publisher;
ALTER TABLE publications ADD COLUMN open_access_labels TEXT;
