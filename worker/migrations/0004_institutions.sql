-- Multi-institution support: everything that used to assume a single
-- university (UTB, via env.SCOPUS_AFFILIATION_ID + the hardcoded whitelist in
-- src/data/knownAuthorIds.ts) becomes data-driven so new universities can be
-- added without touching code or redeploying.

CREATE TABLE institutions (
  id                     TEXT PRIMARY KEY,   -- slug, e.g. 'utb'
  name                   TEXT NOT NULL,
  scopus_affiliation_id  TEXT NOT NULL UNIQUE,
  is_default             INTEGER NOT NULL DEFAULT 0,
  -- Whether the weekly cron auto-syncs this institution. Off by default for
  -- newly-added comparison universities: the free-plan 50-subrequest cap is
  -- already sized for one institution's ~2000 pubs (~10 requests) per
  -- invocation, so syncing several on the same schedule risks blowing the
  -- budget. Comparison universities are meant to be preloaded via manual
  -- POST /api/admin/sync?institution=<id> instead.
  auto_sync              INTEGER NOT NULL DEFAULT 0
);

INSERT INTO institutions (id, name, scopus_affiliation_id, is_default, auto_sync) VALUES
  ('utb', 'Universidad Tecnológica de Bolívar', '60103889', 1, 1);

-- Per-institution manual whitelist, replaces the single global
-- KNOWN_AUTHOR_IDS Set in src/data/knownAuthorIds.ts (now superseded - safe
-- to delete that file). Membership always wins and is sticky, same semantics
-- as before, just scoped per institution now.
-- No FK on author_id -> authors(id): whitelist entries are meant to be valid
-- ahead of any sync (a known docente not yet ingested, or a fresh/local DB
-- with an empty authors table), same as the plain string Set this replaces.
CREATE TABLE institution_author_whitelist (
  institution_id  TEXT NOT NULL REFERENCES institutions(id),
  author_id       TEXT NOT NULL,
  PRIMARY KEY (institution_id, author_id)
);

INSERT INTO institution_author_whitelist (institution_id, author_id) VALUES
  ('utb', '57156565000'), ('utb', '14622047600'), ('utb', '24329839300'), ('utb', '57194034904'),
  ('utb', '57193533853'), ('utb', '24537991200'), ('utb', '36142156300'), ('utb', '57039103600'),
  ('utb', '56674579200'), ('utb', '57210822856'), ('utb', '57191333650'), ('utb', '7005142049'),
  ('utb', '57193012270'), ('utb', '55649334800'), ('utb', '26325154200'), ('utb', '55872162200'),
  ('utb', '35788581800'), ('utb', '57024211000'), ('utb', '56801043600'), ('utb', '56380539800'),
  ('utb', '57188841051'), ('utb', '57202285682'), ('utb', '57350116000'), ('utb', '58525252300'),
  ('utb', '57192930752'), ('utb', '57200615582'), ('utb', '58660078000'), ('utb', '57190688459'),
  ('utb', '57208719994'), ('utb', '55258973100'), ('utb', '57203321995'), ('utb', '57220927199'),
  ('utb', '57193252278'), ('utb', '57322375300'), ('utb', '57205400052'), ('utb', '57758796500'),
  ('utb', '56581610900'), ('utb', '57392556500'), ('utb', '56682785300'), ('utb', '57219403758'),
  ('utb', '57197327858'), ('utb', '57196040759'), ('utb', '57220077867'), ('utb', '57750422100'),
  ('utb', '57223851529'), ('utb', '57189892062'), ('utb', '57205658483'), ('utb', '58068307100'),
  ('utb', '57197807415'), ('utb', '57918628600'), ('utb', '57222278899'), ('utb', '7195913974'),
  ('utb', '57218294431'), ('utb', '57206773929'), ('utb', '58068069000'), ('utb', '57216868622'),
  ('utb', '57930663300'), ('utb', '58523557700'), ('utb', '57204842254'), ('utb', '58618811100'),
  ('utb', '57201036449'), ('utb', '57209248085'), ('utb', '57212006168'), ('utb', '57427876200'),
  ('utb', '57204847841'), ('utb', '57195913859'), ('utb', '57218297655'), ('utb', '57222223605'),
  ('utb', '57221229836'), ('utb', '58803522300'), ('utb', '55783129400'), ('utb', '57903699900'),
  ('utb', '58954857900'), ('utb', '57202159706'), ('utb', '57219626251'), ('utb', '57215557867'),
  ('utb', '57219506381'), ('utb', '58134344400'), ('utb', '58917134900'), ('utb', '58153979500'),
  ('utb', '58868256900'), ('utb', '57918232800'), ('utb', '59987226300');

-- Replaces the single global `authors.verified_internal` column: whether an
-- author is confirmed-internal is a property of the (author, institution)
-- pair, not the author alone - a cátedra docente can be legitimately
-- verified_internal=1 at two institutions at once. NULL = not yet
-- determined, same as before.
CREATE TABLE author_institutions (
  author_id          TEXT NOT NULL REFERENCES authors(id),
  institution_id     TEXT NOT NULL REFERENCES institutions(id),
  verified_internal  INTEGER,
  PRIMARY KEY (author_id, institution_id)
);

INSERT INTO author_institutions (author_id, institution_id, verified_internal)
  SELECT id, 'utb', verified_internal FROM authors WHERE verified_internal IS NOT NULL;

ALTER TABLE authors DROP COLUMN verified_internal;

-- publication_authors.is_internal used to mean "this authorship's afid
-- matched the one affiliation we tracked". With several institutions each
-- running their own AF-ID search, the same publication can legitimately be
-- ingested by more than one institution's sync (e.g. a paper co-authored
-- across two of the compared universities), and each sync's is_internal
-- reading is only meaningful relative to the institution that computed it.
-- Keeping a single is_internal column on publication_authors meant a second
-- institution's sync would silently overwrite the first institution's
-- reading for shared authorships. Split the raw authorship fact (who wrote
-- what, in what order) from the institution-relative internal flag.
CREATE TABLE publication_author_institutions (
  publication_id  TEXT NOT NULL REFERENCES publications(id),
  author_id       TEXT NOT NULL REFERENCES authors(id),
  institution_id  TEXT NOT NULL REFERENCES institutions(id),
  is_internal     INTEGER NOT NULL,
  PRIMARY KEY (publication_id, author_id, institution_id)
);
CREATE INDEX idx_pub_author_inst_institution ON publication_author_institutions(institution_id);

INSERT INTO publication_author_institutions (publication_id, author_id, institution_id, is_internal)
  SELECT publication_id, author_id, 'utb', is_internal FROM publication_authors;

ALTER TABLE publication_authors DROP COLUMN is_internal;

-- Track which institution each sync run was for (nullable for old rows,
-- which all predate multi-institution support and were implicitly UTB).
ALTER TABLE sync_runs ADD COLUMN institution_id TEXT REFERENCES institutions(id);
UPDATE sync_runs SET institution_id = 'utb' WHERE institution_id IS NULL;
