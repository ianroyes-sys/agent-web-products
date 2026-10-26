/**
 * The two tools this archive exposes, defined once and reused by the MCP
 * endpoint, the well-known descriptor, and llms.txt. One archive, one job —
 * so there are two tools and there will not be twelve.
 */

import { browse, retrieve } from "@/lib/archive/retrieve";
import { buildPlan, validateInput } from "@/lib/plan/compose";
import { AUDIENCES, JOBS, TOPICS } from "@/lib/archive/types";

export const TOOLS = [
  {
    name: "search_archive",
    description:
      "Search Ian Royes' builder archive with tag-first retrieval. Select by job (the painful job the reader is stuck on), topic, and audience before text. Returns cited items with their tag matches. Use this when you need the source material rather than a plan.",
    inputSchema: {
      type: "object",
      properties: {
        job: { type: "string", enum: [...JOBS], description: "The job to retrieve against. The strongest signal." },
        topics: { type: "array", items: { type: "string", enum: [...TOPICS] } },
        audience: { type: "array", items: { type: "string", enum: [...AUDIENCES] } },
        text: { type: "string", description: "Free text. Used only to break ties inside the tag-qualified set." },
        limit: { type: "integer", minimum: 1, maximum: 25, default: 8 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "build_plan",
    description:
      "The workflow. Given someone's situation — what they can do, what they've got, where they are, hours per week and money available — return a first-30-days plan: the wedge, the customer, the first offer with a price, the first distribution channel, the one thing to validate this week, a four-week board, and the conditions under which to stop. Every section cites the archive items behind it.",
    inputSchema: {
      type: "object",
      properties: {
        situation: { type: "string", description: "What they can do, what they have, where they are. Required, at least a sentence." },
        tried: { type: "string", description: "What they have already tried. Shapes the diagnosis." },
        where: { type: "string" },
        hoursPerWeek: { type: "integer", minimum: 1, maximum: 80, default: 10 },
        budget: { type: "integer", minimum: 0, description: "Dollars available up front. Zero is a valid answer." },
      },
      required: ["situation"],
      additionalProperties: false,
    },
  },
] as const;

export type ToolName = (typeof TOOLS)[number]["name"];

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.filter((entry): entry is string => typeof entry === "string");
  return list.length > 0 ? list : undefined;
}

export async function callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  if (name === "search_archive") {
    const job = typeof args.job === "string" ? args.job : undefined;
    const text = typeof args.text === "string" ? args.text : undefined;
    const limit = Number.isFinite(Number(args.limit)) ? Math.min(25, Math.max(1, Number(args.limit))) : 8;

    const hits = retrieve({
      job: job as never,
      topics: asStringArray(args.topics) as never,
      audience: asStringArray(args.audience) as never,
      text,
      limit,
    });

    // A tag query with no matches is a real answer; fall back to plain text
    // browse only so the caller gets something to work with.
    const results =
      hits.length > 0
        ? hits.map((hit) => ({
            id: hit.item.id,
            title: hit.item.title,
            source: hit.item.source,
            url: hit.item.url,
            distilled: Boolean(hit.item.derived),
            pull: hit.item.pull,
            matchedOn: hit.matchedOn,
            tags: hit.item.tags,
            excerpt: hit.item.body.slice(0, 1200),
          }))
        : browse({ q: text }).slice(0, limit).map((item) => ({
            id: item.id,
            title: item.title,
            source: item.source,
            url: item.url,
            distilled: Boolean(item.derived),
            pull: item.pull,
            matchedOn: ["text-only"],
            tags: item.tags,
            excerpt: item.body.slice(0, 1200),
          }));

    return {
      content: [{ type: "text", text: JSON.stringify({ query: { job, text, limit }, count: results.length, results }, null, 2) }],
    };
  }

  if (name === "build_plan") {
    const parsed = validateInput(args);
    if (!parsed.ok) {
      return { content: [{ type: "text", text: JSON.stringify({ error: parsed.error }) }], isError: true };
    }
    const { plan } = await buildPlan(parsed.input);
    return { content: [{ type: "text", text: JSON.stringify(plan, null, 2) }] };
  }

  return { content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }], isError: true };
}
