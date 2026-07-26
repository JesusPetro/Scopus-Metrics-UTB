import { Hono } from "hono";
import type { Env } from "../types/env";
import {
  growthByYear,
  documentTypeBreakdown,
  topPublishers,
  coauthorshipGraph,
  topJournals,
  subjectAreaBreakdown,
} from "../services/metrics";

export const statsRoutes = new Hono<{ Bindings: Env }>();

statsRoutes.get("/growth", async (c) => {
  const data = await growthByYear(c.env.DB);
  return c.json({ data });
});

statsRoutes.get("/document-types", async (c) => {
  const data = await documentTypeBreakdown(c.env.DB);
  return c.json({ data });
});

statsRoutes.get("/top-authors", async (c) => {
  const limit = Number(c.req.query("limit") ?? "20");
  const documentType = c.req.query("document_type") || undefined;
  const data = await topPublishers(c.env.DB, limit, documentType);
  return c.json({ data });
});

statsRoutes.get("/coauthorship", async (c) => {
  const data = await coauthorshipGraph(c.env.DB);
  return c.json({ data });
});

statsRoutes.get("/top-journals", async (c) => {
  const limit = Number(c.req.query("limit") ?? "10");
  const data = await topJournals(c.env.DB, limit);
  return c.json({ data });
});

statsRoutes.get("/subject-areas", async (c) => {
  const limit = Number(c.req.query("limit") ?? "12");
  const data = await subjectAreaBreakdown(c.env.DB, limit);
  return c.json({ data });
});
