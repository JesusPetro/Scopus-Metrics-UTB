-- Docentes (autores identificados como pertenecientes a la universidad)
CREATE TABLE authors (
  id            TEXT PRIMARY KEY,   -- Scopus Author ID
  full_name     TEXT NOT NULL,
  orcid         TEXT,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Publicaciones (una fila por documento Scopus, sin importar cuantos autores tenga)
CREATE TABLE publications (
  id                TEXT PRIMARY KEY,   -- Scopus ID / EID
  title             TEXT NOT NULL,
  doi               TEXT,
  cover_date        TEXT,
  year              INTEGER NOT NULL,
  document_type     TEXT,
  source_title      TEXT,
  cited_by_count    INTEGER DEFAULT 0,
  raw_json          TEXT,
  created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at        TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_publications_year ON publications(year);

-- Junction: que docentes participaron en que publicacion (incluye coautores externos)
CREATE TABLE publication_authors (
  publication_id  TEXT NOT NULL REFERENCES publications(id),
  author_id       TEXT NOT NULL REFERENCES authors(id),
  author_order    INTEGER,
  is_internal     INTEGER NOT NULL,
  PRIMARY KEY (publication_id, author_id)
);
CREATE INDEX idx_pub_authors_author ON publication_authors(author_id);

-- Log de cada corrida de ingesta
CREATE TABLE sync_runs (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at          TEXT NOT NULL,
  finished_at         TEXT,
  publications_synced INTEGER,
  status              TEXT,
  error_message       TEXT
);
