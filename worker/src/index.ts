import { Hono } from "hono";
import type { Env } from "./types/env";
import { statsRoutes } from "./routes/stats";
import { authorRoutes } from "./routes/authors";
import { publicationRoutes } from "./routes/publications";
import { runWeeklySync } from "./jobs/weeklySync";
import { verifyPendingAuthors } from "./services/authorVerification";
import { ScopusError } from "./lib/errors";

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/stats", statsRoutes);
app.route("/api/authors", authorRoutes);
app.route("/api/publications", publicationRoutes);

// Manual trigger for the weekly sync - useful for local testing since
// `scheduled()` isn't hit by normal HTTP requests. Fine to leave open for a
// non-commercial research project; add auth here if this ever goes public.
app.post("/api/admin/sync", async (c) => {
  await runWeeklySync(c.env);
  return c.json({ status: "sync completed" });
});

// Verifies candidate-internal authors (flagged by a paper's afid but not on
// the manual whitelist) against the Author Retrieval API's current-affiliation
// data. Batched (default 40) because of the 50-subrequest cap - call
// repeatedly until `remaining` is 0.
app.post("/api/admin/verify-authors", async (c) => {
  const limit = Number(c.req.query("limit") ?? "40");
  const data = await verifyPendingAuthors(c.env, limit);
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
