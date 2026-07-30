import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env";
import { statsRoutes } from "./routes/stats";
import { authorRoutes } from "./routes/authors";
import { publicationRoutes } from "./routes/publications";
import { runWeeklySync, runSyncForInstitution } from "./jobs/weeklySync";
import { verifyPendingAuthors } from "./services/authorVerification";
import { listInstitutions } from "./db/repositories/institutions";
import { ScopusError } from "./lib/errors";

const app = new Hono<{ Bindings: Env }>();

const ALLOWED_ORIGINS = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/(?:[\w-]+\.)?scopus-metrics-frontend\.pages\.dev$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && ALLOWED_ORIGINS.some((re) => re.test(origin)) ? origin : ""),
  })
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/stats", statsRoutes);
app.route("/api/authors", authorRoutes);
app.route("/api/publications", publicationRoutes);

// Institutions available for the university selector / comparison picker.
app.get("/api/institutions", async (c) => {
  const data = await listInstitutions(c.env.DB);
  return c.json({ data });
});

// Manual trigger for a sync - useful for local testing since `scheduled()`
// isn't hit by normal HTTP requests, and it's how comparison universities
// (auto_sync = 0) get preloaded/refreshed on demand. Requires ?institution=
// explicitly rather than defaulting to "all institutions", so a call here
// can never silently blow the 50-subrequest budget by fanning out over every
// registered university at once. Fine to leave open for a non-commercial
// research project; add auth here if this ever goes public.
app.post("/api/admin/sync", async (c) => {
  const institutionId = c.req.query("institution");
  if (!institutionId) {
    return c.json({ error: "institution query param is required, e.g. ?institution=utb" }, 400);
  }
  await runSyncForInstitution(c.env, institutionId);
  return c.json({ status: "sync completed", institution: institutionId });
});

// Verifies candidate-internal authors for one institution (flagged by a
// paper's afid but not on that institution's manual whitelist) against the
// Author Retrieval API's current-affiliation data. Batched (default 40)
// because of the 50-subrequest cap - call repeatedly until `remaining` is 0.
app.post("/api/admin/verify-authors", async (c) => {
  const institutionId = c.req.query("institution");
  if (!institutionId) {
    return c.json({ error: "institution query param is required, e.g. ?institution=utb" }, 400);
  }
  const limit = Number(c.req.query("limit") ?? "40");
  const data = await verifyPendingAuthors(c.env, institutionId, limit);
  return c.json({ data });
});

app.onError((err, c) => {
  if (err instanceof ScopusError) {
    return c.json({ error: err.message }, 502);
  }
  console.error(err);
  return c.json({ error: "Internal error" }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runWeeklySync(env));
  },
};
