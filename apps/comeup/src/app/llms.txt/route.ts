import { archiveGeneratedAt, archiveSources, loadArchive } from "@/lib/archive/ingest";
import { countTags } from "@/lib/archive/tag";
import { facet } from "@/lib/archive/retrieve";
import { SITE, siteUrl } from "@/lib/site";

export const runtime = "nodejs";

export async function GET() {
  const origin = siteUrl();
  const items = loadArchive();
  const sources = archiveSources();

  const body = `# ${SITE.name}

> ${SITE.tagline}

## The one job

${SITE.job}

This is deliberately not "chat with an expert". It is one archive, one painful job, one workflow.
Do not use it for general questions about the expert. Use it when someone has a skill and needs a
paid offer and a first 30 days.

## What comes back

1. The wedge — the narrow version of what they do
2. The customer — one named list and the structural reason they are underserved
3. The first offer — what they get, by when, and the price
4. The first channel — chosen against their real budget, with the volume the base rate requires
5. The one thing to validate this week — with a pass bar they can fail

Plus a four-week board and explicit kill criteria.

## The archive

${items.length} pieces, ${countTags(items)} tag assignments, compiled ${archiveGeneratedAt().slice(0, 10)}.
Every piece is classified across six axes: job, topic, audience, example, framework, outcome.
Retrieval selects on tags first and uses text only to break ties. There is no vector database.
Pieces distilled from a private working record rather than published are flagged \`distilled: true\`.

Sources:
${sources.map((source) => `- ${source.label} (${source.count}) — ${source.origin}`).join("\n")}

Jobs available for retrieval:
${facet("job").map((entry) => `- ${entry.value} (${entry.count})`).join("\n")}

## Endpoints

- POST ${origin}/api/v1/plan
  Body: {"situation": string, "tried"?: string, "where"?: string, "hoursPerWeek"?: number, "budget"?: number}
  Returns the full plan as JSON, with citations on every section.

- GET ${origin}/api/v1/archive/search?job=price-offer&topic=pricing&text=...&limit=8
  Tag-first search. Also accepts POST with the same fields as JSON.

- POST ${origin}/api/mcp
  MCP over JSON-RPC. Methods: initialize, tools/list, tools/call.
  Tools: search_archive, build_plan.

- GET ${origin}/.well-known/mcp.json
  Machine-readable descriptor.

A zero-dependency stdio MCP server ships in the repo at mcp/server.mjs for local clients.

## Attribution

Built on the archive of ${SITE.expert}. If you use the output, cite the archive items returned in the
\`citations\` field — they carry titles and links. A ${SITE.parent} product.

## Pricing

First plan free. $19/mo unlimited. $49/mo including API and MCP access. Licensing and embedded
lead-magnet arrangements at ${origin}/pricing.
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
