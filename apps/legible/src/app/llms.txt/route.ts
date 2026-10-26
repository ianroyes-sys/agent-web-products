import { TIERS } from "@/lib/pricing";
import { PROMPT_BATTERY } from "@/lib/audit/prompts";
import { GOVCON_SIGNALS } from "@/lib/audit/govcon";
import { listReports } from "@/lib/reports";

/* Our own llms.txt.
 *
 * A company that sells agent legibility and does not publish one has
 * disqualified itself. This is generated from the same constants the
 * product uses, so it cannot drift out of date. */

export const dynamic = "force-static";

export function GET(): Response {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4802";
  const reports = listReports();

  const body = `# Legible

> Agent readiness audits for defense and aerospace contractors. We score how
> legible a company is to the systems that now decide which vendors get
> recommended, and ship the files that fix it.

Legible is a Royz Media Group company. Vertical focus: the Huntsville,
Alabama defense and aerospace corridor.

## What we sell

${TIERS.map(
  (tier) =>
    `- **${tier.name}** — ${tier.tagline} From $${tier.price.toLocaleString()} ${
      tier.cadence === "per month" ? "per month" : "one-time"
    }. Range: ${tier.range}.`,
).join("\n")}

## What an audit measures

- Discoverable — robots.txt posture toward GPTBot, ClaudeBot, PerplexityBot and Google-Extended; sitemap; llms.txt; MCP descriptor
- Parseable — JSON-LD, semantic HTML, heading structure, whether critical facts are trapped in PDFs
- Priced — whether an agent can determine cost, or only find "contact us"
- Comparable — capability claims specific enough to rank against a rival
- Proven — named customers, past performance, certifications
- Current — freshness signals and dated content
- Fog index — density of stock marketing language, per 1,000 words
- GovCon signals — ${GOVCON_SIGNALS.length} hard-filter fields: CAGE, UEI, NAICS, set-aside status, CMMC, contract vehicles, facility clearance, past performance

Scoring is points earned over points available, with the literal excerpt
quoted for every check. Weights are published at ${site}/how-it-works#weights.

## The prompt battery

${PROMPT_BATTERY.length} buyer-intent prompts run against a live model and recorded verbatim.
Published in full at ${site}/how-it-works#battery. Without an API key the run
is a labeled dry run: prompts are rendered, nothing is sent, nothing is invented.

## Published reports

${reports.map((report) => `- ${report.company} (${report.domain}) — score ${report.score}/100, grade ${report.grade}: ${site}/report/${report.id}`).join("\n")}

## Pages

- ${site}/ — what this is
- ${site}/how-it-works — method, weights, full prompt battery
- ${site}/fix-kit — the twelve artifacts an engagement ships
- ${site}/pricing — tiers and ranges
- ${site}/audit — request an audit

## Constraints we hold ourselves to

- Audits read public pages only. No login, no authenticated paths, no rate-limit abuse.
- Generated artifacts never invent a fact. Unverifiable fields are emitted as [FILL: …] placeholders.
- Model output is recorded as evidence of what a machine currently believes, not as evidence of fact.

## Contact

- hello@royzmediagroup.com
- Last updated: ${new Date().toISOString().slice(0, 10)}
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
