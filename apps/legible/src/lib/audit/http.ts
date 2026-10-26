/* Network layer. Deliberately boring: fetch, a timeout, a byte cap.
   No headless browser. If a page only exists after JavaScript runs, that
   is not a limitation of this tool — it is the finding. Most agents that
   read the web today read it exactly the way this file does. */

const UA =
  "Mozilla/5.0 (compatible; LegibleAudit/0.1; +https://legible.royzmediagroup.com/how-it-works)";

/** 800 KB. Past this, nothing useful is left to score. */
const MAX_BYTES = 800_000;

export interface FetchResult {
  url: string;
  finalUrl: string;
  ok: boolean;
  status: number;
  body: string;
  contentType: string;
  bytes: number;
  ms: number;
  lastModified?: string;
  error?: string;
}

export async function fetchText(url: string, timeoutMs = 12_000): Promise<FetchResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const contentType = res.headers.get("content-type") ?? "";
    let body = "";
    if (res.body) {
      const raw = await res.text();
      body = raw.length > MAX_BYTES ? raw.slice(0, MAX_BYTES) : raw;
    }

    return {
      url,
      finalUrl: res.url || url,
      ok: res.ok,
      status: res.status,
      body,
      contentType,
      bytes: body.length,
      ms: Date.now() - started,
      lastModified: res.headers.get("last-modified") ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      url,
      finalUrl: url,
      ok: false,
      status: 0,
      body: "",
      contentType: "",
      bytes: 0,
      ms: Date.now() - started,
      error: message === "This operation was aborted" ? `timeout after ${timeoutMs}ms` : message,
    };
  }
}

/** Run tasks with a concurrency ceiling so we never hammer a client's site. */
export async function pooled<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

/**
 * Some sites answer on the apex, some only on www, some only over http.
 * Resolve once so every later request hits a host we know responds.
 */
export async function resolveBase(domain: string, timeoutMs = 12_000): Promise<FetchResult> {
  const candidates = [`https://${domain}`, `https://www.${domain}`, `http://${domain}`];
  let last: FetchResult | undefined;

  for (const candidate of candidates) {
    const res = await fetchText(candidate, timeoutMs);
    if (res.ok && res.body.length > 0) return res;
    last = res;
  }

  return (
    last ?? {
      url: `https://${domain}`,
      finalUrl: `https://${domain}`,
      ok: false,
      status: 0,
      body: "",
      contentType: "",
      bytes: 0,
      ms: 0,
      error: "unreachable",
    }
  );
}
