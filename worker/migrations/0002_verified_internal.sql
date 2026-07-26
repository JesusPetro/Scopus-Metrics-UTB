-- Authoritative "is this really a UTB docente" flag, separate from the
-- per-publication `publication_authors.is_internal` (which just reflects
-- whatever afid Scopus recorded on that one paper - can be a courtesy/
-- secondary affiliation for prolific external researchers).
-- NULL = not yet determined, 1 = confirmed internal, 0 = confirmed not internal.
-- Set to 1 immediately for whitelisted authors (see src/data/knownAuthorIds.ts);
-- otherwise populated via POST /api/admin/verify-authors (Author Retrieval API).
ALTER TABLE authors ADD COLUMN verified_internal INTEGER;
