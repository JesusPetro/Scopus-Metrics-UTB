import type { ScopusClient } from "./client";

const AUTHOR_URL = "https://api.elsevier.com/content/author/author_id";

/**
 * Looks up an author's current/primary affiliation via the Author Retrieval
 * API. Unlike the per-publication `afid` (which can be a secondary/courtesy
 * affiliation declared on one specific paper), `affiliation-current` is the
 * author's main profile affiliation in Scopus - a better signal for "does
 * this person actually work here". Defensive parsing: the exact shape of
 * `affiliation-current` varies (`@id` vs nested `institution-profile`).
 */
export async function fetchAuthorCurrentAffiliationId(
  client: ScopusClient,
  authorId: string
): Promise<string | null> {
  const response = await client.exec(`${AUTHOR_URL}/${authorId}`, {
    field: "affiliation-current",
  });

  const affiliation = response?.["author-retrieval-response"]?.[0]?.["affiliation-current"];
  if (!affiliation) return null;

  const id = affiliation["@id"] ?? affiliation["institution-profile"]?.["@id"] ?? null;
  return id ? String(id) : null;
}
