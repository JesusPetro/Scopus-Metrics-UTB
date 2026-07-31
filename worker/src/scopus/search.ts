import type { ScopusClient } from "./client";
import { SearchResultsEnvelope, parseEntry, type ParsedPublication } from "../types/scopus";
import { ScopusSchemaError } from "../lib/errors";

const SEARCH_URL = "https://api.elsevier.com/content/search/scopus/";
const PAGE_SIZE = 200;

// Cloudflare Workers (free plan) caps subrequests at 50 per invocation.
// A page every ~200 results keeps a full sync (~2000 publications) around
// 10 requests; this cap is just a safety margin so a runaway result set
// can never blow the budget in one scheduled run.
const MAX_PAGES = 40;

// "subject-area" was requested here too, but that field consistently makes the
// whole AF-ID query fail with a Scopus GENERAL_SYSTEM_ERROR (500) in production
// (confirmed by hitting the same query directly without it — 200 with all
// results). publication_subject_areas stays empty until this is resolved with
// Elsevier support or the entitlement changes.
const FIELDS = [
  "dc:identifier",
  "eid",
  "dc:title",
  "prism:publicationName",
  "prism:volume",
  "prism:issueIdentifier",
  "prism:coverDate",
  "prism:doi",
  "citedby-count",
  "subtypeDescription",
  "author",
  "afid",
  "openaccess",
].join(",");

export interface AffiliationSearchResult {
  publications: ParsedPublication[];
  totalReported: number;
  pagesFetched: number;
  entryErrors: number;
}

/**
 * Fetches every publication for a Scopus Affiliation ID, following the
 * API's cursor-based `link[@ref=next]` pagination. One logical query,
 * not one query per author - see worker architecture plan for why.
 */
export async function fetchAffiliationPublications(
  client: ScopusClient,
  affiliationId: string
): Promise<AffiliationSearchResult> {
  const query = `AF-ID ( ${affiliationId} )`;
  const publications: ParsedPublication[] = [];
  let entryErrors = 0;
  let totalReported = 0;
  let pagesFetched = 0;
  let nextUrl: string | null = SEARCH_URL;
  let params: Record<string, string> | undefined = {
    query,
    view: "STANDARD",
    field: FIELDS,
    cursor: "*",
    count: String(PAGE_SIZE),
  };

  while (nextUrl && pagesFetched < MAX_PAGES) {
    const response = await client.exec(nextUrl, params);
    params = undefined; // subsequent requests use the full URL Scopus gives us, no extra params

    const parsed = SearchResultsEnvelope.safeParse(response);
    if (!parsed.success) {
      throw new ScopusSchemaError(`Unexpected Scopus search-results shape: ${parsed.error.message}`);
    }

    const searchResults = parsed.data["search-results"];
    totalReported = Number(searchResults["opensearch:totalResults"]) || totalReported;
    pagesFetched += 1;

    for (const entry of searchResults.entry ?? []) {
      try {
        publications.push(parseEntry(entry, affiliationId));
      } catch {
        entryErrors += 1; // skip malformed entries, don't fail the whole sync
      }
    }

    const next = (searchResults.link ?? []).find((l) => l["@ref"] === "next");
    nextUrl = next?.["@href"] ?? null;

    if (!searchResults.entry || searchResults.entry.length === 0) {
      break;
    }
  }

  return { publications, totalReported, pagesFetched, entryErrors };
}
