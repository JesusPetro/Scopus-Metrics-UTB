-- 0007 added open_access_labels expecting Scopus's fine-grained OA categories
-- (Gold/Hybrid/Green/Bronze) via `freetoreadLabel` - that field turned out to
-- be undocumented for the bulk Search API query and never populated. Settling
-- on the documented, reliable field instead: `openaccess`, a per-article 0/1
-- flag (not a statement about the journal as a whole).
ALTER TABLE publications DROP COLUMN open_access_labels;
ALTER TABLE publications ADD COLUMN open_access INTEGER NOT NULL DEFAULT 0;
