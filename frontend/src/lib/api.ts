import type {
  AuthorRow,
  AuthorSummary,
  CoauthorshipGraph,
  DocumentTypeCount,
  Institution,
  PublicationRow,
  TopJournal,
  TopPublisher,
  YearCount,
} from "./types";

// Override with VITE_API_BASE in frontend/.env.local (e.g.
// http://localhost:8787) to point the dev server at `wrangler dev` instead
// of production - useful whenever local-only backend work (migrations, new
// routes) hasn't been deployed yet.
const API_BASE = import.meta.env.VITE_API_BASE ?? "https://scopus-metrics-worker.utb-research.workers.dev";

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
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? res.statusText, res.status);
  }
  const body = await res.json();
  return body.data as T;
}

async function requestPage<T>(path: string): Promise<Page<T>> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? res.statusText, res.status);
  }
  const body = await res.json();
  return { data: body.data as T, total: body.total as number };
}

export type PublicationSort = "date" | "citations" | "year" | "title";

export const api = {
  institutions: () => request<Institution[]>("/api/institutions"),
  growth: (institutionId?: string, documentType?: string) => {
    const params = new URLSearchParams();
    if (institutionId) params.set("institution", institutionId);
    if (documentType) params.set("document_type", documentType);
    const qs = params.toString();
    return request<YearCount[]>(`/api/stats/growth${qs ? `?${qs}` : ""}`);
  },
  documentTypes: (institutionId?: string) => {
    const params = new URLSearchParams();
    if (institutionId) params.set("institution", institutionId);
    const qs = params.toString();
    return request<DocumentTypeCount[]>(`/api/stats/document-types${qs ? `?${qs}` : ""}`);
  },
  topAuthors: (limit = 20, documentType?: string, institutionId?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (documentType) params.set("document_type", documentType);
    if (institutionId) params.set("institution", institutionId);
    return request<TopPublisher[]>(`/api/stats/top-authors?${params.toString()}`);
  },
  topJournals: (limit = 8, institutionId?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (institutionId) params.set("institution", institutionId);
    return request<TopJournal[]>(`/api/stats/top-journals?${params.toString()}`);
  },
  coauthorship: (institutionId?: string) => {
    const params = new URLSearchParams();
    if (institutionId) params.set("institution", institutionId);
    const qs = params.toString();
    return request<CoauthorshipGraph>(`/api/stats/coauthorship${qs ? `?${qs}` : ""}`);
  },
  authors: (limit = 100, offset = 0) => request<AuthorRow[]>(`/api/authors?limit=${limit}&offset=${offset}`),
  authorSummary: (id: string) => request<AuthorSummary>(`/api/authors/${encodeURIComponent(id)}`),
  authorPublications: (id: string, limit = 50, offset = 0) =>
    requestPage<PublicationRow[]>(`/api/authors/${encodeURIComponent(id)}/publications?limit=${limit}&offset=${offset}`),
  publications: (
    opts: {
      year?: number;
      documentType?: string;
      institutionId?: string;
      sort?: PublicationSort;
      sortDir?: "asc" | "desc";
      limit?: number;
      offset?: number;
    } = {}
  ) => {
    const params = new URLSearchParams();
    if (opts.year) params.set("year", String(opts.year));
    if (opts.documentType) params.set("document_type", opts.documentType);
    if (opts.institutionId) params.set("institution", opts.institutionId);
    if (opts.sort) params.set("sort", opts.sort);
    if (opts.sortDir) params.set("sort_dir", opts.sortDir);
    params.set("limit", String(opts.limit ?? 50));
    params.set("offset", String(opts.offset ?? 0));
    return requestPage<PublicationRow[]>(`/api/publications?${params.toString()}`);
  },
};
