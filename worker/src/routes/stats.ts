import { Hono } from "hono";
import type { Context } from "hono";
import type { Env } from "../types/env";
import { getDefaultInstitution, getInstitution } from "../db/repositories/institutions";
import {
  growthByYear,
  documentTypeBreakdown,
  topPublishers,
  coauthorshipGraph,
  topJournals,
  subjectAreaBreakdown,
} from "../services/metrics";

export const statsRoutes = new Hono<{ Bindings: Env }>();

/** Resolves ?institution=<id>, falling back to the institution flagged is_default. Returns null (already responded) if unresolvable. */
async function resolveInstitutionId(c: Context<{ Bindings: Env }>): Promise<string | null> {
  const requested = c.req.query("institution");
  if (requested) {
    const institution = await getInstitution(c.env.DB, requested);
    if (!institution) return null;
    return institution.id;
  }
  const fallback = await getDefaultInstitution(c.env.DB);
  return fallback?.id ?? null;
}

statsRoutes.get("/growth", async (c) => {
  const institutionId = await resolveInstitutionId(c);
  if (!institutionId) return c.json({ error: "Unknown institution" }, 404);
  const documentType = c.req.query("document_type") || undefined;
  const data = await growthByYear(c.env.DB, institutionId, documentType);
  return c.json({ data });
});

statsRoutes.get("/document-types", async (c) => {
  const institutionId = await resolveInstitutionId(c);
  if (!institutionId) return c.json({ error: "Unknown institution" }, 404);
  const data = await documentTypeBreakdown(c.env.DB, institutionId);
  return c.json({ data });
});

statsRoutes.get("/top-authors", async (c) => {
  const institutionId = await resolveInstitutionId(c);
  if (!institutionId) return c.json({ error: "Unknown institution" }, 404);
  const limit = Number(c.req.query("limit") ?? "20");
  const documentType = c.req.query("document_type") || undefined;
  const data = await topPublishers(c.env.DB, institutionId, limit, documentType);
  return c.json({ data });
});

statsRoutes.get("/coauthorship", async (c) => {
  const institutionId = await resolveInstitutionId(c);
  if (!institutionId) return c.json({ error: "Unknown institution" }, 404);
  const data = await coauthorshipGraph(c.env.DB, institutionId);
  return c.json({ data });
});

statsRoutes.get("/top-journals", async (c) => {
  const institutionId = await resolveInstitutionId(c);
  if (!institutionId) return c.json({ error: "Unknown institution" }, 404);
  const limit = Number(c.req.query("limit") ?? "10");
  const data = await topJournals(c.env.DB, institutionId, limit);
  return c.json({ data });
});

statsRoutes.get("/subject-areas", async (c) => {
  const institutionId = await resolveInstitutionId(c);
  if (!institutionId) return c.json({ error: "Unknown institution" }, 404);
  const limit = Number(c.req.query("limit") ?? "12");
  const data = await subjectAreaBreakdown(c.env.DB, institutionId, limit);
  return c.json({ data });
});
