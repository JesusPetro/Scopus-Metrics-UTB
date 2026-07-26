import { Hono } from "hono";
import type { Env } from "../types/env";
import { countPublications, listPublications, type PublicationSort } from "../db/repositories/publications";

export const publicationRoutes = new Hono<{ Bindings: Env }>();

const VALID_SORTS: PublicationSort[] = ["date", "citations", "year", "title"];

publicationRoutes.get("/", async (c) => {
  const year = c.req.query("year");
  const documentType = c.req.query("document_type") ?? undefined;
  const subjectArea = c.req.query("subject_area") ?? undefined;
  const sortParam = c.req.query("sort");
  const sort = VALID_SORTS.includes(sortParam as PublicationSort) ? (sortParam as PublicationSort) : undefined;
  const sortDir = c.req.query("sort_dir") === "asc" ? "asc" : "desc";
  const limit = Number(c.req.query("limit") ?? "50");
  const offset = Number(c.req.query("offset") ?? "0");

  const filter = {
    year: year ? Number(year) : undefined,
    documentType,
    subjectArea,
  };

  const [data, total] = await Promise.all([
    listPublications(c.env.DB, { ...filter, sort, sortDir, limit, offset }),
    countPublications(c.env.DB, filter),
  ]);
  return c.json({ data, total });
});
