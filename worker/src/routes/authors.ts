import { Hono } from "hono";
import type { Env } from "../types/env";
import { listAuthors } from "../db/repositories/authors";
import { countPublications, listPublications } from "../db/repositories/publications";
import { getAuthorSummary } from "../services/metrics";

export const authorRoutes = new Hono<{ Bindings: Env }>();

authorRoutes.get("/", async (c) => {
  const limit = Number(c.req.query("limit") ?? "100");
  const offset = Number(c.req.query("offset") ?? "0");
  const institutionId = c.req.query("institution") || undefined;
  const data = await listAuthors(c.env.DB, limit, offset, institutionId);
  return c.json({ data });
});

authorRoutes.get("/:id", async (c) => {
  const summary = await getAuthorSummary(c.env.DB, c.req.param("id"));
  if (!summary) return c.json({ error: "Author not found" }, 404);
  return c.json({ data: summary });
});

authorRoutes.get("/:id/publications", async (c) => {
  const limit = Number(c.req.query("limit") ?? "50");
  const offset = Number(c.req.query("offset") ?? "0");
  const authorId = c.req.param("id");
  const [data, total] = await Promise.all([
    listPublications(c.env.DB, { authorId, limit, offset }),
    countPublications(c.env.DB, { authorId }),
  ]);
  return c.json({ data, total });
});
