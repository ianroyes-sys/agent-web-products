/* The crawl.

   We probe a fixed set of paths that a buyer-facing agent would try, then
   add up to four more that the homepage navigation actually points at.
   A 404 is not an error condition here. A missing /pricing IS the finding,
   and it gets recorded with the same care as a page that exists. */

import { fetchText, normalizeDomain, pooled, resolveBase, type FetchResult } from "./http.ts";
import { parseHtml, type ParsedHtml } from "./html.ts";
import type { PageRecord } from "./types.ts";

/** Paths every agent-facing buyer journey touches. */
export const STANDARD_PATHS = [
  "/pricing",
  "/about",
  "/services",
  "/contact",
  "/docs",
  "/faq",
  "/capabilities",
  "/past-performance",
  "/contract-vehicles",
  "/certifications",
  "/news",
] as const;

/** Machine-facing descriptors. These are the ones that are almost never there. */
export const MACHINE_FILES = [
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/.well-known/mcp.json",
  "/ai.txt",
] as const;

/** Nav labels worth chasing when the guessed path 404s. */
const NAV_HINTS =
  /(pricing|rates?|capabilit|about|who we are|services|solutions|contact|past performance|contract vehicle|certif|quality|compliance|news|insights|blog|faq)/i;

export interface Fetched {
  record: PageRecord;
  result: FetchResult;
  parsed?: ParsedHtml;
}

export interface Quote {
  quote: string;
  source: string;
}

export class AuditContext {
  readonly domain: string;
  readonly siteUrl: string;
  readonly origin: string;
  readonly pages = new Map<string, Fetched>();
  readonly generated = new Date();

  constructor(domain: string, siteUrl: string) {
    this.domain = domain;
    this.siteUrl = siteUrl;
    this.origin = new URL(siteUrl).origin;
  }

  get homepage(): ParsedHtml | undefined {
    return this.pages.get("/")?.parsed;
  }

  page(path: string): Fetched | undefined {
    return this.pages.get(path);
  }

  /** Body text of a machine file (robots.txt and friends), or "". */
  raw(path: string): string {
    const page = this.pages.get(path);
    return page && page.result.ok ? page.result.body : "";
  }

  has(path: string): boolean {
    return this.pages.get(path)?.record.ok === true;
  }

  /** Every HTML page that actually returned content. */
  htmlPages(): Fetched[] {
    return [...this.pages.values()].filter(
      (p) => p.parsed !== undefined && p.record.ok && p.record.bytes > 0,
    );
  }

  /** All visible text across the site, for site-wide term searches. */
  get allText(): string {
    return this.htmlPages()
      .map((p) => p.parsed?.text ?? "")
      .join("\n\n");
  }

  get allHtml(): string {
    return this.htmlPages()
      .map((p) => p.result.body)
      .join("\n\n");
  }

  /**
   * Find a verbatim excerpt for a pattern anywhere on the site.
   * Returns the quote plus the URL it came from, so the report can cite it.
   */
  find(pattern: RegExp, radius = 100): Quote | undefined {
    for (const page of this.htmlPages()) {
      const text = page.parsed?.text ?? "";
      const re = new RegExp(pattern.source, pattern.flags.replace(/g/g, ""));
      const match = re.exec(text);
      if (!match) continue;
      const start = Math.max(0, match.index - radius);
      const end = Math.min(text.length, match.index + match[0].length + radius);
      const slice = text.slice(start, end).replace(/\s+/g, " ").trim();
      return {
        quote: `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`,
        source: page.record.url,
      };
    }
    return undefined;
  }

  /** First capture group of a pattern found anywhere on the site. */
  capture(pattern: RegExp): { value: string; source: string } | undefined {
    for (const page of this.htmlPages()) {
      const re = new RegExp(pattern.source, pattern.flags.replace(/g/g, ""));
      const match = re.exec(page.parsed?.text ?? "");
      if (match) {
        return { value: (match[1] ?? match[0]).trim(), source: page.record.url };
      }
    }
    return undefined;
  }

  countMatches(pattern: RegExp): number {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    return (this.allText.match(re) ?? []).length;
  }
}

function record(path: string, result: FetchResult, discovered = false): PageRecord {
  return {
    path,
    url: result.finalUrl || result.url,
    status: result.status,
    ok: result.ok && result.bytes > 0,
    bytes: result.bytes,
    ms: result.ms,
    contentType: result.contentType.split(";")[0] ?? "",
    error: result.error,
    discovered: discovered || undefined,
  };
}

export interface CrawlOptions {
  timeoutMs?: number;
  extraPaths?: string[];
  onProgress?: (message: string) => void;
}

export async function crawl(domainInput: string, options: CrawlOptions = {}): Promise<AuditContext> {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const domain = normalizeDomain(domainInput);
  const progress = options.onProgress ?? (() => {});

  progress(`resolving ${domain}`);
  const home = await resolveBase(domain, timeoutMs);
  const siteUrl = home.ok ? home.finalUrl : `https://${domain}/`;
  const ctx = new AuditContext(domain, siteUrl);

  ctx.pages.set("/", {
    record: record("/", home),
    result: home,
    parsed: home.body ? parseHtml(home.body) : undefined,
  });

  const paths = [...STANDARD_PATHS, ...MACHINE_FILES, ...(options.extraPaths ?? [])];
  progress(`probing ${paths.length} paths`);

  await pooled(paths, 5, async (path) => {
    const result = await fetchText(new URL(path, ctx.origin).toString(), timeoutMs);
    const isHtml = result.contentType.includes("html") || /^\s*<(?:!doctype|html)/i.test(result.body);
    ctx.pages.set(path, {
      record: record(path, result),
      result,
      parsed: result.ok && isHtml && result.body ? parseHtml(result.body) : undefined,
    });
  });

  // Second pass: chase the navigation for anything our guesses missed.
  const discovered = discoverPaths(ctx);
  if (discovered.length > 0) {
    progress(`following ${discovered.length} nav links`);
    await pooled(discovered, 4, async (path) => {
      const result = await fetchText(new URL(path, ctx.origin).toString(), timeoutMs);
      const isHtml = result.contentType.includes("html");
      ctx.pages.set(path, {
        record: record(path, result, true),
        result,
        parsed: result.ok && isHtml && result.body ? parseHtml(result.body) : undefined,
      });
    });
  }

  return ctx;
}

function discoverPaths(ctx: AuditContext): string[] {
  const home = ctx.homepage;
  if (!home) return [];

  const found: string[] = [];
  for (const link of home.links) {
    if (found.length >= 4) break;
    if (!NAV_HINTS.test(link.text) && !NAV_HINTS.test(link.href)) continue;

    let path: string;
    try {
      const url = new URL(link.href, ctx.origin);
      if (url.origin !== ctx.origin) continue;
      path = url.pathname.replace(/\/+$/, "") || "/";
    } catch {
      continue;
    }

    if (path === "/" || ctx.pages.has(path) || found.includes(path)) continue;
    if (/\.(pdf|jpe?g|png|zip|docx?)$/i.test(path)) continue;
    found.push(path);
  }
  return found;
}
