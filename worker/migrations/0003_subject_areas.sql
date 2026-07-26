-- Scopus subject-area classification per publication (e.g. "Computer Science",
-- code "1700"). Not present in older synced rows until a re-sync with the
-- expanded FIELDS list in src/scopus/search.ts runs; NULL/absent until then.
CREATE TABLE publication_subject_areas (
  publication_id  TEXT NOT NULL REFERENCES publications(id),
  code            TEXT NOT NULL,
  abbrev          TEXT,
  name            TEXT NOT NULL,
  PRIMARY KEY (publication_id, code)
);
CREATE INDEX idx_pub_subject_areas_name ON publication_subject_areas(name);
