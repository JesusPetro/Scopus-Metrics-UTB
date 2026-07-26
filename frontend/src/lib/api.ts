import type {
  AuthorRow,
  AuthorSummary,
  CoauthorshipGraph,
  DocumentTypeCount,
  PublicationRow,
  TopJournal,
  TopPublisher,
  YearCount,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface Page<T> {
  data: T;
  total: number;
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? res.statusText, res.status);
  }
  const body = await res.json();
  return body.data as T;
}

async function requestPage<T>(path: string): Promise<Page<T>> {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? res.statusText, res.status);
  }
  const body = await res.json();
  return { data: body.data as T, total: body.total as number };
}

export type PublicationSort = "date" | "citations" | "year" | "title";

export const api = {
  growth: () => request<YearCount[]>("/api/stats/growth"),
  documentTypes: () => request<DocumentTypeCount[]>("/api/stats/document-types"),
  topAuthors: (limit = 20) => request<TopPublisher[]>(`/api/stats/top-authors?limit=${limit}`),
  topJournals: (limit = 8) => request<TopJournal[]>(`/api/stats/top-journals?limit=${limit}`),
  coauthorship: () => request<CoauthorshipGraph>("/api/stats/coauthorship"),
  authors: (limit = 100, offset = 0) => request<AuthorRow[]>(`/api/authors?limit=${limit}&offset=${offset}`),
  authorSummary: (id: string) => request<AuthorSummary>(`/api/authors/${encodeURIComponent(id)}`),
  authorPublications: (id: string, limit = 50, offset = 0) =>
    requestPage<PublicationRow[]>(`/api/authors/${encodeURIComponent(id)}/publications?limit=${limit}&offset=${offset}`),
  publications: (
    opts: {
      year?: number;
      documentType?: string;
      sort?: PublicationSort;
      sortDir?: "asc" | "desc";
      limit?: number;
      offset?: number;
    } = {}
  ) => {
    const params = new URLSearchParams();
    if (opts.year) params.set("year", String(opts.year));
    if (opts.documentType) params.set("document_type", opts.documentType);
    if (opts.sort) params.set("sort", opts.sort);
    if (opts.sortDir) params.set("sort_dir", opts.sortDir);
    params.set("limit", String(opts.limit ?? 50));
    params.set("offset", String(opts.offset ?? 0));
    return requestPage<PublicationRow[]>(`/api/publications?${params.toString()}`);
  },
};
