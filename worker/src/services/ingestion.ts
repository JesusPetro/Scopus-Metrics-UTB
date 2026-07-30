import type { Env } from "../types/env";
import { createScopusClient } from "../scopus/client";
import { fetchAffiliationPublications } from "../scopus/search";
import { upsertAuthor, upsertAuthorInstitution } from "../db/repositories/authors";
import { getInstitution, getWhitelistedAuthorIds } from "../db/repositories/institutions";
import {
  upsertPublication,
  replacePublicationAuthors,
  replacePublicationAuthorInstitutions,
  replacePublicationSubjectAreas,
} from "../db/repositories/publications";

export interface IngestionSummary {
  institutionId: string;
  publicationsSynced: number;
  authorsSynced: number;
  totalReportedByScopus: number;
  pagesFetched: number;
  entryErrors: number;
}

export async function runIngestion(env: Env, institutionId: string): Promise<IngestionSummary> {
  const institution = await getInstitution(env.DB, institutionId);
  if (!institution) {
    throw new Error(`Unknown institution: ${institutionId}`);
  }

  const client = createScopusClient(env);
  const { publications, totalReported, pagesFetched, entryErrors } = await fetchAffiliationPublications(
    client,
    institution.scopusAffiliationId
  );

  const seenAuthors = new Map<string, string>(); // authorId -> fullName
  for (const pub of publications) {
    for (const author of pub.authors) {
      seenAuthors.set(author.authorId, author.fullName);
    }
  }

  const whitelist = await getWhitelistedAuthorIds(env.DB, institutionId);

  // Authors must exist before publication_authors rows reference them (FK constraint).
  for (const [authorId, fullName] of seenAuthors) {
    await upsertAuthor(env.DB, authorId, fullName);
    await upsertAuthorInstitution(env.DB, authorId, institutionId, whitelist.has(authorId));
  }

  for (const pub of publications) {
    await upsertPublication(env.DB, pub);
    await replacePublicationAuthors(
      env.DB,
      pub.id,
      pub.authors.map((a) => ({ authorId: a.authorId, order: a.order }))
    );
    await replacePublicationAuthorInstitutions(
      env.DB,
      pub.id,
      institutionId,
      pub.authors.map((a) => ({ authorId: a.authorId, isInternal: a.isInternal }))
    );
    await replacePublicationSubjectAreas(env.DB, pub.id, pub.subjectAreas);
  }

  return {
    institutionId,
    publicationsSynced: publications.length,
    authorsSynced: seenAuthors.size,
    totalReportedByScopus: totalReported,
    pagesFetched,
    entryErrors,
  };
}
