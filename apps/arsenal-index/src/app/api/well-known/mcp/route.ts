import { getMeta } from "@/lib/data";
import { PRICES } from "@/lib/paywall";
import { PLANS } from "@/lib/plans";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4801";

/** Served at /.well-known/mcp.json via a rewrite in next.config.ts. */
export function GET() {
  const meta = getMeta();

  return Response.json(
    {
      schema_version: "2025-06-18",
      name: "arsenal-index",
      display_name: "Arsenal Index",
      description:
        "Huntsville, Alabama defense contracting: resolved prime contractors, a 24-month recompete radar, NAICS and agency market structure.",
      publisher: meta.publisher,
      documentation: `${site}/api-docs`,
      llms_txt: `${site}/llms.txt`,
      data: {
        generated: meta.generated,
        source: meta.source,
        market: meta.market,
        firm_count: meta.firm_count,
        recompete_count: meta.recompete_count,
        license: meta.license,
      },
      transports: [
        {
          type: "streamable-http",
          url: `${site}/api/mcp`,
        },
        {
          type: "stdio",
          command: "node",
          args: ["mcp/server.mjs"],
          note: "Zero-dependency local server. See the README for the Claude Desktop snippet.",
        },
      ],
      tools: [
        { name: "search_firms", description: "Search tracked firms by name, NAICS, agency, or tier." },
        { name: "get_firm", description: "Full profile for one firm, including expiring contracts." },
        { name: "list_recompetes", description: "Contracts expiring in the next 24 months." },
        { name: "market_summary", description: "Market aggregates, concentration, and movement." },
        { name: "capability_gap", description: "NAICS codes the market spends on that a firm does not hold." },
      ],
      payment: {
        free_tier: ["market_summary", "search_firms", "capability_gap", "list_recompetes (15 rows)"],
        // Two rails, different processors, different availability.
        rails: [
          {
            scheme: "api_key",
            status: "available",
            header: "X-API-Key",
            settlement: "Stripe subscription",
            billing: "monthly",
            plans: PLANS.map((p) => ({ id: p.id, name: p.name, price: p.price, cadence: p.cadence })),
            subscribe: `${site}/api-docs#pricing`,
          },
          {
            scheme: "x402",
            status: "pending",
            header: "X-Payment",
            settlement: "peer-to-peer stablecoin, via Cloudflare Monetization Gateway",
            billing: "per lookup",
            prices: PRICES,
            note: "Waitlist-only, not generally available. Unverified proofs are rejected until settlement can be verified.",
          },
        ],
      },
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
