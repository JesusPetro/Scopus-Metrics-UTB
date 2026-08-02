import type { Env } from "../types/env";
import {
  ScopusAuthError,
  ScopusConnectionError,
  ScopusRateLimitError,
  ScopusResponseError,
  ScopusSchemaError,
} from "../lib/errors";

const MIN_REQUEST_INTERVAL_MS = 1000;

export interface ScopusClient {
  exec(url: string, params?: Record<string, string>): Promise<any>;
}

/**
 * Creates a Scopus/Elsevier HTTP client. Deliberately a factory, not a
 * module-level singleton (the Python version instantiated `elsClient` at
 * import time and validated credentials there, which broke every import
 * when the API key was missing) - callers build it explicitly per request.
 */
export function createScopusClient(env: Env): ScopusClient {
  if (!env.ELSEVIER_APIKEY) {
    throw new ScopusAuthError("Missing ELSEVIER_APIKEY binding/secret.");
  }

  let lastRequestAt = 0;

  async function throttle(): Promise<void> {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
    }
  }

  async function exec(url: string, params?: Record<string, string>): Promise<any> {
    await throttle();

    const target = new URL(url);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        target.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      "X-ELS-APIKey": env.ELSEVIER_APIKEY,
      "User-Agent": "scopus-metrics-utb-worker",
      Accept: "application/json",
    };
    if (env.ELSEVIER_INSTTOKEN) {
      headers["X-ELS-Insttoken"] = env.ELSEVIER_INSTTOKEN;
    }

    let response: Response;
    try {
      response = await fetch(target.toString(), { headers });
    } catch (err) {
      lastRequestAt = Date.now();
      throw new ScopusConnectionError(`Network error while requesting Elsevier API: ${err}`);
    }
    lastRequestAt = Date.now();

    if (response.ok) {
      const bodyText = await response.text();
      try {
        return JSON.parse(bodyText);
      } catch (err) {
        throw new ScopusSchemaError(
          `Response was not valid JSON (status ${response.status}). Body preview: ${bodyText.slice(0, 500)}. Parse error: ${err}`
        );
      }
    }

    const body = await response.text();
    const base = `HTTP ${response.status} from ${target.toString()}. Response: ${body.slice(0, 500)}`;

    if (response.status === 401 || response.status === 403) {
      throw new ScopusAuthError(`Invalid apikey or insttoken (${response.status}). ${base}`);
    }
    if (response.status === 429) {
      // Elsevier reports quota state on every response via these headers -
      // surface them here since the developer portal doesn't reliably show
      // per-key quota/reset time, and this is the only place that does.
      const limit = response.headers.get("X-RateLimit-Limit");
      const remaining = response.headers.get("X-RateLimit-Remaining");
      const resetRaw = response.headers.get("X-RateLimit-Reset");
      const resetAt = resetRaw ? new Date(Number(resetRaw) * 1000).toISOString() : null;
      const quotaInfo = resetAt
        ? ` Quota resets at ${resetAt} (limit=${limit ?? "?"}, remaining=${remaining ?? "?"}).`
        : "";
      throw new ScopusRateLimitError(`Rate limit reached (429).${quotaInfo} ${base}`);
    }
    if (response.status >= 500) {
      throw new ScopusConnectionError(`Elsevier responded with ${response.status}. ${base}`);
    }
    throw new ScopusResponseError(response.status, base);
  }

  return { exec };
}
