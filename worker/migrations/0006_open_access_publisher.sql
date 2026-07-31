ALTER TABLE publications ADD COLUMN open_access_publisher TEXT;

-- Backfill from data already ingested - pure string match on the DOI we
-- already stored, no re-fetch from Scopus needed. Superseded by 0007, which
-- drops this column in favor of Scopus's own OA categories.
UPDATE publications SET open_access_publisher = 'MDPI' WHERE doi LIKE '10.3390/%';
