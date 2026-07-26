// Mirrors worker/src/services/metrics.ts, worker/src/db/repositories/*.ts response shapes exactly.

export interface YearCount {
  year: number;
  count: number;
}

export interface DocumentTypeCount {
  document_type: string | null;
  count: number;
}

export interface TopPublisher {
  author_id: string;
  full_name: string;
  publication_count: number;
}

export interface TopJournal {
  source_title: string;
  count: number;
}

export interface CoauthorshipNode {
  authorId: string;
  fullName: string;
  publicationCount: number;
}

export interface CoauthorshipEdge {
  authorA: string;
  authorB: string;
  weight: number;
}

export interface CoauthorshipGraph {
  nodes: CoauthorshipNode[];
  edges: CoauthorshipEdge[];
}

export interface AuthorSummary {
  authorId: string;
  fullName: string;
  publicationCount: number;
  totalCitations: number;
  hIndex: number;
}

export interface AuthorRow {
  id: string;
  full_name: string;
  orcid: string | null;
}

export interface PublicationRow {
  id: string;
  title: string;
  doi: string | null;
  cover_date: string | null;
  year: number;
  document_type: string | null;
  source_title: string | null;
  cited_by_count: number;
}
