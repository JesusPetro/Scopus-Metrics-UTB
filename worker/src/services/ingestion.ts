import type { Env } from "../types/env";
import { createScopusClient } from "../scopus/client";
import { fetchAffiliationPublications } from "../scopus/search";
import { upsertAuthor } from "../db/repositories/authors";
import { upsertPublication, replacePublicationAuthors, replacePublicationSubjectAreas } from "../db/repositories/publications";

export interface IngestionSummary {
  publicationsSynced: number;
  authorsSynced: number;
  totalReportedByScopus: number;
  pagesFetched: number;
  entryErrors: number;
}

export async function runIngestion(env: Env): Promise<IngestionSummary> {
  const client = createScopusClient(env);
  const { publications, totalReported, pagesFetched, entryErrors } = await fetchAffiliationPublications(
    client,
    env.SCOPUS_AFFILIATION_ID
  );

  const seenAuthors = new Map<string, string>(); // authorId -> fullName
  for (const pub of publications) {
    for (const author of pub.authors) {
      seenAuthors.set(author.authorId, author.fullName);
    }
  }

  // Authors must exist before publication_authors rows reference them (FK constraint).
  for (const [authorId, fullName] of seenAuthors) {
    await upsertAuthor(env.DB, authorId, fullName);
  }

  for (const pub of publications) {
    await upsertPublication(env.DB, pub);
    await replacePublicationAuthors(
      env.DB,
      pub.id,
      pub.authors.map((a) => ({ authorId: a.authorId, order: a.order, isInternal: a.isInternal }))
    );
    await replacePublicationSubjectAreas(env.DB, pub.id, pub.subjectAreas);
  }

  return {
    publicationsSynced: publications.length,
    authorsSynced: seenAuthors.size,
    totalReportedByScopus: totalReported,
    pagesFetched,
    entryErrors,
  };
}
