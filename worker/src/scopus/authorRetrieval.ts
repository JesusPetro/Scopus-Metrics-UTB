import type { ScopusClient } from "./client";

const AUTHOR_URL = "https://api.elsevier.com/content/author/author_id";

/**
 * Looks up an author's current affiliation(s) via the Author Retrieval API.
 * Unlike the per-publication `afid` (which can be a secondary/courtesy
 * affiliation declared on one specific paper), `affiliation-current` is the
 * author's profile affiliation(s) in Scopus - a better signal for "does this
 * person actually work here".
 *
 * Scopus reports multiple *simultaneous* current affiliations for authors
 * with more than one appointment (e.g. a cátedra docente teaching at two of
 * the universities we track) - this is a real, common case, not an edge
 * case to reject. The API collapses a single affiliation to a bare object
 * but returns an array when there's more than one (same quirk as `afid` on
 * search entries, see afidMatches in types/scopus.ts), so this always
 * normalizes to a list and callers should test *membership*, not equality
 * against one id - treating this as single-valued would incorrectly reject
 * one of the two true institutions for a legitimately dual-affiliated
 * author (same quirk as `afid` on search entries, see extractAfids in
 * types/scopus.ts).
 */
export async function fetchAuthorCurrentAffiliationIds(
  client: ScopusClient,
  authorId: string
): Promise<string[]> {
  const response = await client.exec(`${AUTHOR_URL}/${authorId}`, {
    field: "affiliation-current",
  });

  const raw = response?.["author-retrieval-response"]?.[0]?.["affiliation-current"];
  if (!raw) return [];

  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((affiliation) => affiliation?.["@id"] ?? affiliation?.["institution-profile"]?.["@id"] ?? null)
    .filter((id): id is string | number => id != null)
    .map((id) => String(id));
}
