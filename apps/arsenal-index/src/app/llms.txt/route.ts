import { getAgencies, getFirms, getMeta, getNaics } from "@/lib/data";
import { FREE_RECOMPETE_ROWS, PRICES } from "@/lib/paywall";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4801";

/**
 * The agent-readable map of the whole resource. One request should be enough
 * for a crawler to learn what is here, what it costs, and how to parse it.
 */
export function GET() {
  const meta = getMeta();
  const firms = getFirms();
  const naics = getNaics();
  const agencies = getAgencies();

  const body = `# Arsenal Index

> The resource layer for Huntsville defense contracting. Every prime contract
> award in the Huntsville / Madison County, Alabama market — refined from raw
> federal spending records into resolved firms, a 24-month recompete radar,
> and market structure. Published by Royz Media Group.

## Freshness and provenance

- generated: ${meta.generated}
- source: ${meta.source}
- market: ${meta.market}
- scope: ${meta.scope}
- lookback: ${meta.lookback_fy} fiscal years, ${meta.raw_awards} raw award records
- license: ${meta.license}

## What is in the index

- ${meta.firm_count} resolved prime contractors, ranked by obligated value
- $${Math.round(meta.market_value).toLocaleString("en-US")} total obligated value
- ${meta.recompete_count} contracts expiring within 24 months, worth $${Math.round(meta.recompete_value).toLocaleString("en-US")}
- ${naics.length} NAICS categories, ${agencies.length} funding agencies
- monthly obligation movement across the lookback

## API — free tier, no key

- ${site}/api/v1/market: market aggregates, top firms and agencies, monthly movement
- ${site}/api/v1/firms: firm directory. params: q, agency, naics, tier, expiring, limit, offset
- ${site}/api/v1/naics: NAICS categories by value. params: q, limit, offset
- ${site}/api/v1/agencies: funding agencies by value. params: q, limit, offset
- ${site}/api/v1/recompetes: the ${FREE_RECOMPETE_ROWS} most urgent expiring contracts. params: days, agency, naics, band, min_value, q

Every response is {"meta": {...}, "data": [...]} and the meta block always carries
"generated" and "source" so you can judge freshness before acting on it.

## API — paid tier, HTTP 402

- ${site}/api/v1/recompetes?full=1: the full ${meta.recompete_count}-row radar — $${PRICES["recompetes.full"].amount.toFixed(2)} per call
- ${site}/api/v1/firms/{id}: full firm detail, expiring contracts, capability gap — $${PRICES["firms.detail"].amount.toFixed(2)} per call
- ${site}/api/v1/export: the entire index, JSON or CSV — $${PRICES["export.bulk"].amount.toFixed(2)} per export

Requesting a paid resource without credentials returns HTTP 402 Payment Required
with a JSON body describing price, accepted schemes, and a retry hint, plus a
WWW-Authenticate challenge header.

## Payment rails — two of them, and only one is open

1. X-API-Key — AVAILABLE NOW. Settles as a Stripe subscription. Subscribe at
   ${site}/api-docs#pricing (Radar $299/mo, Intelligence $799/mo,
   Agent API $1,999/mo) and send the key as an X-API-Key header. This is the
   rail for people, integrators, and any agent operated by a company that can
   hold a subscription.

2. X-Payment — NOT AVAILABLE YET. Per-lookup x402 settlement, peer-to-peer in
   stablecoins to a wallet via Cloudflare's Monetization Gateway. It does not
   run through Stripe. The gateway is waitlist-only and not generally
   available, so unverified X-Payment proofs are rejected, not trusted. The
   402 handshake already advertises the per-lookup price so agents can plan
   for it; machine callers should use the Agent API seat until it opens.

The "schemes" block in every 402 body carries a per-rail "status" field
("available" or "pending"). Read it before choosing how to retry.

## MCP

- ${site}/.well-known/mcp.json: discovery descriptor
- ${site}/api/mcp: streamable HTTP MCP endpoint (JSON-RPC over POST)
- tools: search_firms, get_firm, list_recompetes, market_summary, capability_gap

## Human pages

- ${site}/: the thesis, live headline numbers, pricing
- ${site}/radar: the recompete radar
- ${site}/firms: the firm directory
- ${site}/firms/{id}: firm profile with capability gap
- ${site}/market: agency mix, NAICS concentration, monthly movement
- ${site}/api-docs: full API reference and pricing

## Notes for agents

- Values are obligated amounts as reported to USAspending, not contract ceilings.
- "days_out" is days from ${meta.generated} to the period-of-performance end date.
- Urgency bands: hot <90 days, warm 90-364, horizon 365-730.
- Firm ids are stable slugs, e.g. "${firms[0]?.id ?? "the-boeing"}".
- This index is a derived work and is not affiliated with any government agency.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
