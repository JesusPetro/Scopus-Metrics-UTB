import { z } from "zod";
import { ScopusSchemaError } from "../lib/errors";

// Scopus's raw JSON is notoriously loose (fields come and go), so we only
// validate the envelope shape strictly. Individual entry fields are pulled
// out defensively in `parseEntry` below, instead of a rigid per-entry schema.
export const SearchResultsEnvelope = z.object({
  "search-results": z.object({
    "opensearch:totalResults": z.string(),
    entry: z.array(z.record(z.string(), z.any())).optional().default([]),
    link: z
      .array(z.object({ "@ref": z.string(), "@href": z.string().optional() }))
      .optional()
      .default([]),
  }),
});

export interface ParsedAuthor {
  authorId: string;
  fullName: string;
  order: number;
  isInternal: boolean;
}

export interface ParsedSubjectArea {
  code: string;
  abbrev: string | null;
  name: string;
}

export interface ParsedPublication {
  id: string;
  title: string;
  doi: string | null;
  coverDate: string | null;
  year: number;
  documentType: string | null;
  sourceTitle: string | null;
  citedByCount: number;
  authors: ParsedAuthor[];
  subjectAreas: ParsedSubjectArea[];
  raw: Record<string, unknown>;
}

/**
 * Scopus returns `subject-area` as a single object when there's exactly one,
 * or an array when there are several - normalize to an array either way.
 */
function parseSubjectAreas(entry: Record<string, any>): ParsedSubjectArea[] {
  const raw = entry["subject-area"];
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((s) => ({
      code: String(s?.["@code"] ?? ""),
      abbrev: s?.["@abbrev"] ?? null,
      name: String(s?.["$"] ?? "").trim(),
    }))
    .filter((s) => s.code && s.name);
}

function extractAfids(author: Record<string, any>): string[] {
  const afid = author["afid"];
  if (!afid) return [];
  const list = Array.isArray(afid) ? afid : [afid];
  return list.map((a) => String(a?.["$"] ?? a));
}

/**
 * Extracts the fields we actually use from a raw Scopus search entry.
 * Throws ScopusSchemaError if the entry is missing what we need to identify it
 * (id/title) - anything else missing just becomes null/empty rather than failing
 * the whole ingestion run.
 */
export function parseEntry(entry: Record<string, any>, affiliationId: string): ParsedPublication {
  const id: string | undefined = entry["dc:identifier"] ?? entry["eid"];
  const title: string | undefined = entry["dc:title"];

  if (!id || !title) {
    throw new ScopusSchemaError(
      `Entry missing required id/title: ${JSON.stringify(entry).slice(0, 200)}`
    );
  }

  const coverDate: string | null = entry["prism:coverDate"] ?? null;
  const year = coverDate ? Number(coverDate.slice(0, 4)) : NaN;
  if (Number.isNaN(year)) {
    throw new ScopusSchemaError(`Entry ${id} has no usable prism:coverDate`);
  }

  const rawAuthors: Record<string, any>[] = Array.isArray(entry["author"]) ? entry["author"] : [];

  // Scopus can list the same author more than once in one entry's author
  // array when they hold more than one affiliation - each occurrence carries
  // a different afid for the same authid (this is the dual-affiliation /
  // cátedra-en-dos-universidades case). Collapse by authorId and union their
  // afids, otherwise two ParsedAuthor rows for the same (publication, author)
  // pair violate publication_authors' unique key at insert time.
  const byAuthorId = new Map<string, { fullName: string; order: number; afids: string[] }>();
  rawAuthors.forEach((a, idx) => {
    const authorId = String(a["authid"] ?? "");
    if (!authorId) return;
    const afids = extractAfids(a);
    const existing = byAuthorId.get(authorId);
    if (existing) {
      existing.afids.push(...afids);
    } else {
      byAuthorId.set(authorId, { fullName: String(a["authname"] ?? "Unknown"), order: idx + 1, afids });
    }
  });

  const authors: ParsedAuthor[] = Array.from(byAuthorId.entries()).map(([authorId, v]) => ({
    authorId,
    fullName: v.fullName,
    order: v.order,
    isInternal: v.afids.includes(affiliationId),
  }));

  return {
    id: String(id),
    title,
    doi: entry["prism:doi"] ?? null,
    coverDate,
    year,
    documentType: entry["subtypeDescription"] ?? null,
    sourceTitle: entry["prism:publicationName"] ?? null,
    citedByCount: Number(entry["citedby-count"] ?? 0),
    authors,
    subjectAreas: parseSubjectAreas(entry),
    raw: entry,
  };
}
