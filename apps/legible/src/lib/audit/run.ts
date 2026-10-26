/* The orchestrator. Crawl, score, weight, prescribe. */

import { crawl, type AuditContext } from "./crawl.ts";
import {
  DIMENSION_WEIGHTS,
  GOVCON_WEIGHT,
  fogDimension,
  scoreComparable,
  scoreCurrent,
  scoreDiscoverable,
  scoreParseable,
  scorePriced,
  scoreProven,
} from "./dimensions.ts";
import { fogIndex } from "./fog.ts";
import { buildAgentView, buildFixes } from "./fixes.ts";
import { scoreGovCon } from "./govcon.ts";
import { grade } from "./scorer.ts";
import { AUDIT_VERSION, type AuditOptions, type AuditReport } from "./types.ts";

export async function runAudit(domainInput: string, options: AuditOptions = {}): Promise<AuditReport> {
  const started = Date.now();
  const progress = options.onProgress ?? (() => {});

  const ctx = await crawl(domainInput, {
    timeoutMs: options.timeoutMs,
    extraPaths: options.extraPaths,
    onProgress: progress,
  });

  const company = options.company ?? guessCompany(ctx);
  const location = options.location ?? "Huntsville, Alabama";
  const notes: string[] = [];

  const reachable = ctx.page("/")?.record.ok === true;
  if (!reachable) {
    notes.push(
      `The homepage did not return usable HTML (${ctx.page("/")?.record.error ?? `HTTP ${ctx.page("/")?.record.status}`}). Every score below reflects what a non-rendering agent could actually retrieve, which is the same view most assistants have.`,
    );
  }

  progress("scoring");
  const fog = fogIndex(ctx.allText, ctx.page("/")?.record.url);
  const dimensions = [
    scoreDiscoverable(ctx),
    scoreParseable(ctx),
    scorePriced(ctx),
    scoreComparable(ctx, fog),
    scoreProven(ctx),
    scoreCurrent(ctx),
    fogDimension(fog),
  ];

  const govcon = scoreGovCon(ctx, company, location);

  const weighted =
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) + govcon.score * GOVCON_WEIGHT;
  const totalWeight = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0) + GOVCON_WEIGHT;
  const score = Math.round(weighted / totalWeight);

  const fixes = buildFixes(dimensions, govcon, fog);
  const agentView = buildAgentView(dimensions, govcon, company);

  const unanswerable = agentView.filter((q) => q.answerable === "no").length;
  const headline = buildHeadline(company, score, unanswerable, agentView.length, govcon.signals.filter((s) => !s.found && s.weight === "critical").length);

  if (ctx.htmlPages().length <= 1) {
    notes.push("Only the homepage returned HTML. Scores are computed from a thinner sample than a full crawl would give.");
  }
  notes.push(
    "Every score is the ratio of points earned to points available across the checks listed under each dimension. No curve, no judgment call after the fact.",
  );
  notes.push(
    "This audit reads the site the way a non-rendering agent does: fetch, parse, extract. No browser, no JavaScript execution.",
  );

  return {
    id: reportId(ctx.domain, ctx.generated),
    version: AUDIT_VERSION,
    domain: ctx.domain,
    siteUrl: ctx.siteUrl,
    company,
    location,
    generated: ctx.generated.toISOString(),
    durationMs: Date.now() - started,
    score,
    grade: grade(score),
    headline,
    dimensions,
    govcon,
    fog,
    pages: [...ctx.pages.values()].map((p) => p.record).sort((a, b) => a.path.localeCompare(b.path)),
    fixes,
    agentView,
    notes,
  };
}

export function reportId(domain: string, when: Date): string {
  const day = when.toISOString().slice(0, 10);
  return `${domain.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${day}`;
}

function buildHeadline(
  company: string,
  score: number,
  unanswerable: number,
  totalQuestions: number,
  missingCritical: number,
): string {
  if (unanswerable === 0 && missingCritical === 0) {
    return `${company} answers every buyer question an agent asks. Scoring ${score}, it survives automated qualification.`;
  }
  return `An agent asked ${totalQuestions} standard buyer questions about ${company} today. It could not answer ${unanswerable} of them${
    missingCritical > 0 ? `, and ${missingCritical} hard-filter field${missingCritical === 1 ? " is" : "s are"} missing entirely` : ""
  }. Legibility score: ${score}.`;
}

function guessCompany(ctx: AuditContext): string {
  for (const page of ctx.htmlPages()) {
    for (const node of page.parsed?.jsonLd ?? []) {
      const type = node["@type"];
      const isOrg =
        (typeof type === "string" && /Organization|Corporation|LocalBusiness/i.test(type)) ||
        (Array.isArray(type) && type.some((t) => typeof t === "string" && /Organization|LocalBusiness/i.test(t)));
      const name = node["name"];
      if (isOrg && typeof name === "string" && name.trim().length > 1) return trimTagline(name);
    }
  }

  const ogSiteName = /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i.exec(
    ctx.page("/")?.result.body ?? "",
  )?.[1];
  if (ogSiteName) return trimTagline(ogSiteName);

  const title = trimTagline(ctx.homepage?.title ?? "");
  if (title.length >= 3 && title.length <= 60) return title;

  const base = ctx.domain.split(".")[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Site titles carry taglines. "Radiance Technologies - Concepts to
    Capabilities" is a slogan, not an entity, and it poisons every prompt
    the battery renders. */
function trimTagline(name: string): string {
  const head = name.split(/\s+[|–—•·]\s+|\s+-\s+|\s*:\s+/)[0]?.trim() ?? name.trim();
  return head.length >= 3 ? head : name.trim();
}
