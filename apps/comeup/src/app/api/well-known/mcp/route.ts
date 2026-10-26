import { TOOLS } from "@/lib/agent/tools";
import { SITE, siteUrl } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Served at /.well-known/mcp.json via a rewrite in next.config.ts — Next
 * ignores dot-prefixed folders inside app/.
 */
export async function GET() {
  const origin = siteUrl();

  return Response.json(
    {
      name: "comeup",
      title: SITE.name,
      description: SITE.job,
      version: "0.1.0",
      protocolVersion: "2024-11-05",
      vendor: { name: SITE.parent, url: SITE.parentUrl },
      transports: [
        { type: "http", url: `${origin}/api/mcp`, note: "JSON-RPC over POST: initialize, tools/list, tools/call" },
        { type: "stdio", command: "node", args: ["mcp/server.mjs"], note: "Zero-dependency server in this repo" },
      ],
      tools: TOOLS,
      endpoints: {
        plan: `${origin}/api/v1/plan`,
        search: `${origin}/api/v1/archive/search`,
        llms: `${origin}/llms.txt`,
      },
      pricing: {
        free: "First plan free, no account.",
        monthly: "$19/mo unlimited plans.",
        pro: "$49/mo including API and MCP access.",
        licensing: `${origin}/pricing`,
      },
    },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}
