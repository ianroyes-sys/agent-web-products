import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import PricingTable from "@/components/PricingTable";
import { SectionHead, Stat } from "@/components/Stat";
import { getFirms, getMeta } from "@/lib/data";
import { FREE_RECOMPETE_ROWS, PRICES } from "@/lib/paywall";
import { TOOLS } from "@/lib/tools";
import { num, usd, usdFull } from "@/lib/format";

export const metadata: Metadata = {
  title: "API & MCP reference",
  description:
    "REST endpoints, HTTP 402 payment handshake, llms.txt, and MCP tools for the Arsenal Index. Free aggregates, metered row-level access.",
};

/**
 * This page renders the pricing CTAs, which depend on the Stripe env at render
 * time. A pure build-time prerender bakes that decision in and does not notice
 * when the key is added later — Next's build cache will happily reuse the old
 * HTML because no source file changed. ISR re-renders on the server, where the
 * env is read fresh, so the CTA self-corrects without a redeploy.
 */
export const revalidate = 300;

interface Endpoint {
  method: string;
  path: string;
  tier: "free" | "paid";
  blurb: string;
  params?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/market",
    tier: "free",
    blurb: "Market aggregates: total value, concentration, top agencies and firms, monthly movement.",
  },
  {
    method: "GET",
    path: "/api/v1/firms",
    tier: "free",
    blurb: "Firm directory in summary form, ranked by obligated value.",
    params: "q, agency, naics, tier, expiring, limit, offset",
  },
  {
    method: "GET",
    path: "/api/v1/firms/{id}",
    tier: "paid",
    blurb: "Full firm detail: agency and NAICS rollups, PSC mix, expiring contracts, capability gap, peers.",
  },
  {
    method: "GET",
    path: "/api/v1/recompetes",
    tier: "free",
    blurb: `The ${FREE_RECOMPETE_ROWS} most urgent expiring contracts. Filterable, always sorted soonest first.`,
    params: "days, agency, naics, band, min_value, q",
  },
  {
    method: "GET",
    path: "/api/v1/recompetes?full=1",
    tier: "paid",
    blurb: "The complete radar. Also triggered by limit>15 or any offset.",
    params: "limit (max 2000), offset, + all free filters",
  },
  {
    method: "GET",
    path: "/api/v1/naics",
    tier: "free",
    blurb: "NAICS categories by obligated value, with firm count and market share.",
    params: "q, limit, offset",
  },
  {
    method: "GET",
    path: "/api/v1/agencies",
    tier: "free",
    blurb: "Funding agencies by obligated value, with firm count and market share.",
    params: "q, limit, offset",
  },
  {
    method: "GET",
    path: "/api/v1/export",
    tier: "paid",
    blurb: "The entire index in one response. JSON bundle, or the radar as CSV.",
    params: "format=json|csv",
  },
  {
    method: "GET",
    path: "/llms.txt",
    tier: "free",
    blurb: "Plain-text map of the whole resource, for crawlers and agents.",
  },
  {
    method: "GET",
    path: "/.well-known/mcp.json",
    tier: "free",
    blurb: "MCP discovery descriptor: transports, tools, prices.",
  },
  {
    method: "POST",
    path: "/api/mcp",
    tier: "free",
    blurb: "Streamable-HTTP MCP endpoint. JSON-RPC 2.0: initialize, tools/list, tools/call.",
  },
  {
    method: "GET",
    path: "/api/checkout",
    tier: "free",
    blurb: "Which plans can take a subscription right now, and where to write if one cannot.",
  },
  {
    method: "POST",
    path: "/api/checkout",
    tier: "free",
    blurb: "Opens a Stripe Checkout session for a plan. 503 with a fallback address if unconfigured.",
    params: "plan=radar|intelligence|agent_api",
  },
];

export default function ApiDocsPage() {
  const meta = getMeta();
  const sampleFirm = getFirms()[0];

  return (
    <div className="wrap-wide py-10 md:py-14">
      <header className="fade-up max-w-[68ch]">
        <p className="eyebrow">Reference</p>
        <h1 className="mt-3 text-[clamp(30px,5.4vw,48px)] font-semibold leading-[1.06]">
          Built to be queried by something that isn&rsquo;t a person
        </h1>
        <p className="mt-4 text-[16px] leading-[1.65] text-[var(--color-muted)]">
          Nine HTTP surfaces, five MCP tools, one payment handshake. No signup for the free tier, no
          SDK for the paid one, and provenance on every response so an agent can decide whether to
          trust the answer before it acts on it.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <span className="pill pill-live">
            <span className="dot" />
            Generated {meta.generated}
          </span>
          <span className="pill">{num(meta.firm_count)} firms</span>
          <span className="pill">{num(meta.recompete_count)} recompetes</span>
          <span className="pill" title={usdFull(meta.market_value)}>
            {usd(meta.market_value)} indexed
          </span>
        </div>
      </header>

      {/* ------------------------------------------------------ Quickstart */}
      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHead
            eyebrow="Quickstart"
            title="Thirty seconds, no key"
            blurb="Every free endpoint answers unauthenticated. Start with the map, then walk into the rows."
          />
          <div className="mt-6 space-y-3">
            <Stat
              label="Step one"
              value={<span className="text-[19px]">GET /llms.txt</span>}
              sub="Learn the shape of the index, the price list, and the retry rules in one request."
            />
            <Stat
              label="Step two"
              value={<span className="text-[19px]">GET /api/v1/recompetes</span>}
              sub={`The ${FREE_RECOMPETE_ROWS} most urgent expiring contracts, free, sorted soonest first.`}
              accent
            />
          </div>
        </div>

        <div className="space-y-4">
          <CodeBlock label="Free — filtered radar">
{`curl -s "https://arsenal-index.com/api/v1/recompetes?band=hot&naics=541330" \\
  | jq '.data[] | {incumbent, value, end_date, days_out}'`}
          </CodeBlock>
          <CodeBlock label="Paid — full radar with a key">
{`curl -s "https://arsenal-index.com/api/v1/recompetes?full=1&limit=2000" \\
  -H "X-API-Key: $ARSENAL_KEY" | jq '.meta'

{
  "generated": "${meta.generated}",
  "source": "USAspending.gov API v2",
  "tier": "paid",
  "count": ${meta.recompete_count},
  "total": ${meta.recompete_count}
}`}
          </CodeBlock>
        </div>
      </section>

      {/* ------------------------------------------------------- Endpoints */}
      <section id="endpoints" className="mt-16">
        <SectionHead
          eyebrow="Endpoints"
          title="The surface"
          blurb="Responses are always {meta, data}. The meta block carries generated, source, market, license, tier, count, and total."
        />

        <div className="card mt-8 overflow-hidden">
          <div className="scroll-x">
            <table className="tbl min-w-[860px]">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>Verb</th>
                  <th style={{ width: 250 }}>Path</th>
                  <th style={{ width: 70 }}>Tier</th>
                  <th>Returns</th>
                  <th style={{ width: 230 }}>Parameters</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((e) => (
                  <tr key={e.method + e.path}>
                    <td className="num text-[11.5px] text-[var(--color-faint)]">{e.method}</td>
                    <td className="num text-[12.5px] text-[var(--color-chalk)]">{e.path}</td>
                    <td>
                      <span
                        className="tag"
                        style={
                          e.tier === "paid"
                            ? { color: "var(--accent)", borderColor: "var(--accent-line)" }
                            : { color: "var(--color-live)", borderColor: "color-mix(in oklab, var(--color-live) 32%, transparent)" }
                        }
                      >
                        {e.tier}
                      </span>
                    </td>
                    <td className="text-[13px] text-[var(--color-body)]">{e.blurb}</td>
                    <td className="num text-[11.5px] text-[var(--color-faint)]">{e.params ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Payment */}
      <section id="payment" className="mt-16">
        <SectionHead
          eyebrow="Payment"
          title="Two rails, and only one of them is open"
          blurb="Paid access settles two different ways for two different kinds of caller. They are not interchangeable, they do not share a payment processor, and today only one of them can actually take your money."
        />

        {/* The two rails, stated before any code — a caller should know which
            one applies to them before they read a single header. */}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div
            className="rounded-2xl border p-6"
            style={{
              borderColor: "color-mix(in oklab, var(--color-live) 34%, transparent)",
              background: "color-mix(in oklab, var(--color-live) 5%, var(--color-surface))",
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="band-dot" style={{ background: "var(--color-live)" }} />
              <span className="eyebrow" style={{ color: "var(--color-live)" }}>
                Rail one · available now
              </span>
            </div>
            <h3 className="mt-3 text-[19px] font-semibold">API key, on a Stripe subscription</h3>
            <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--color-muted)]">
              For people and for integrators — anything with a company behind it. Subscribe to a tier,
              get a key, send it as{" "}
              <code className="num text-[var(--color-chalk)]">X-API-Key</code>. A valid key
              short-circuits the 402 entirely, on both REST and MCP.
            </p>
            <dl className="mt-5 space-y-2 border-t border-[var(--color-line-soft)] pt-4 text-[12.5px]">
              {[
                ["Settles through", "Stripe — card, invoice, standard receipts"],
                ["Billing", "Monthly subscription, per seat"],
                ["Header", "X-API-Key"],
                ["Status", "Live in test mode today"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-[var(--color-faint)]">{k}</dt>
                  <dd className="num text-right text-[var(--color-body)]">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href="#pricing" className="btn btn-ghost mt-6 h-9 w-full text-[13px]">
              See the tiers
            </Link>
          </div>

          <div
            className="rounded-2xl border p-6"
            style={{
              borderColor: "var(--color-line)",
              background: "var(--color-surface)",
            }}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="band-dot" style={{ background: "var(--color-warn)" }} />
              <span className="eyebrow" style={{ color: "var(--color-warn)" }}>
                Rail two · not open yet
              </span>
              <span className="tag" style={{ color: "var(--color-warn)", borderColor: "var(--accent-line)" }}>
                waitlist
              </span>
            </div>
            <h3 className="mt-3 text-[19px] font-semibold">x402, per lookup, agent to wallet</h3>
            <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--color-muted)]">
              For machine callers with a budget and no account. Cloudflare&rsquo;s Monetization Gateway
              settles peer-to-peer in stablecoins directly to a wallet — it does not touch Stripe, and
              it is a different rail end to end, not a payment method inside the first one.
            </p>
            <dl className="mt-5 space-y-2 border-t border-[var(--color-line-soft)] pt-4 text-[12.5px]">
              {[
                ["Settles through", "Peer-to-peer stablecoin, to a wallet"],
                ["Billing", `Per lookup, from $${PRICES["firms.detail"].amount.toFixed(2)}`],
                ["Header", "X-Payment"],
                ["Status", "Waitlist-only, not generally available"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-[var(--color-faint)]">{k}</dt>
                  <dd className="num text-right text-[var(--color-body)]">{v}</dd>
                </div>
              ))}
            </dl>
            <p
              className="mt-5 rounded-lg border p-3 text-[11.5px] leading-[1.55] text-[var(--color-muted)]"
              style={{ borderColor: "var(--color-line)", background: "var(--color-ink)" }}
            >
              The 402 handshake below is implemented and returns the price today, so an agent can
              already discover the terms. Settlement is what is missing: until the gateway opens there
              is no facilitator to verify a proof against, so unverified{" "}
              <code className="num">X-Payment</code> headers are rejected rather than trusted. Machine
              callers should take the Agent API seat in the meantime.
            </p>
          </div>
        </div>

        <h3 className="mt-12 text-[17px] font-semibold">The handshake</h3>
        <p className="mt-2 max-w-[68ch] text-[13.5px] leading-[1.65] text-[var(--color-muted)]">
          Ask for a paid resource without credentials and the answer is a machine-readable price and a
          retry hint rather than a signup wall. The <code className="num">accepts</code> array lists
          both rails; the <code className="num">schemes</code> block says which one is actually
          settling, so an agent does not burn a retry finding out.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <CodeBlock label="Request without credentials">
{`GET /api/v1/firms/${sampleFirm?.id ?? "the-boeing"} HTTP/1.1
Host: arsenal-index.com`}
          </CodeBlock>

          <CodeBlock label="402 Payment Required" tone="accent">
{`HTTP/1.1 402 Payment Required
WWW-Authenticate: x402 realm="arsenal-index",
  resource="firms.detail", price="${PRICES["firms.detail"].amount}", currency="USD"
X-Payment-Required: ${PRICES["firms.detail"].amount} USD per call

{
  "error": "payment_required",
  "resource": "firms.detail",
  "price": { "amount": ${PRICES["firms.detail"].amount}, "currency": "USD", "unit": "call" },
  "accepts": ["x402", "api_key"],
  "schemes": {
    "api_key": {
      "status": "available",
      "header": "X-API-Key",
      "settlement": "Stripe subscription",
      "subscribe": "/api-docs#pricing"
    },
    "x402": {
      "status": "pending",
      "header": "X-Payment",
      "settlement": "peer-to-peer stablecoin, via Cloudflare
                     Monetization Gateway",
      "note": "Waitlist-only, not generally available."
    }
  },
  "free_tier": { "recompete_rows": ${FREE_RECOMPETE_ROWS} },
  "docs": "/api-docs",
  "retry": "Retry with an X-API-Key header. The x402 rail is not
            settling yet — see /api-docs#payment."
}`}
          </CodeBlock>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              t: "X-API-Key",
              d: "The live rail. Validated against a server-side allowlist; a valid key short-circuits the 402 entirely, on REST and on both MCP transports.",
            },
            {
              t: "X-Payment",
              d: "The x402 proof, presented on the retry of the exact request that got the 402 — no session, no cookie, no account. Rejected until settlement is verifiable.",
            },
            {
              t: "What stays free",
              d: `Every aggregate endpoint and the ${FREE_RECOMPETE_ROWS} most urgent recompete rows. Free access is what makes the index discoverable, so it is not a trial — it does not expire.`,
            },
          ].map((c) => (
            <div key={c.t} className="card p-5">
              <p className="num text-[12.5px] text-[var(--accent)]">{c.t}</p>
              <p className="mt-2.5 text-[13px] leading-[1.6] text-[var(--color-muted)]">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- MCP */}
      <section id="mcp" className="mt-16">
        <SectionHead
          eyebrow="MCP"
          title="Five tools, two transports"
          blurb="Streamable HTTP for hosted agents, stdio for Claude Desktop. Same tools, same payment rules — unpaid calls to paid tools return a payment_required payload instead of failing silently."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="card overflow-hidden">
            <div className="scroll-x">
              <table className="tbl min-w-[420px]">
                <thead>
                  <tr>
                    <th style={{ width: 160 }}>Tool</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {TOOLS.map((t) => (
                    <tr key={t.name}>
                      <td className="num align-top text-[12.5px] text-[var(--accent)]">{t.name}</td>
                      <td className="text-[13px] leading-[1.55] text-[var(--color-body)]">
                        {t.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <CodeBlock label="Claude Desktop — stdio">
{`{
  "mcpServers": {
    "arsenal-index": {
      "command": "node",
      "args": [
        "/absolute/path/to/apps/arsenal-index/mcp/server.mjs"
      ]
    }
  }
}`}
            </CodeBlock>
            <CodeBlock label="Hosted agent — streamable HTTP">
{`curl -s https://arsenal-index.com/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"capability_gap",
                 "arguments":{"firm_id":"${sampleFirm?.id ?? "the-boeing"}"}}}'`}
            </CodeBlock>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Coverage */}
      <section id="coverage" className="mt-16">
        <SectionHead
          eyebrow="Coverage & method"
          title="What this index does and does not claim"
          blurb="A data product is only worth what its caveats are worth. Here are ours, stated plainly."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            {
              t: "Source",
              d: `${meta.source}. Public domain at the source; this index is a derived work. ${meta.license}`,
            },
            {
              t: "Scope",
              d: `${meta.scope}, in ${meta.market}, over ${meta.lookback_fy} fiscal years — ${num(meta.raw_awards)} raw award records resolved into ${num(meta.firm_count)} firms.`,
            },
            {
              t: "Values",
              d: "Obligated amounts as reported, not contract ceilings and not revenue. A large ceiling with small obligations will read small here, correctly.",
            },
            {
              t: "Expiration",
              d: `days_out is measured from ${meta.generated} to the current period-of-performance end date. Unexercised options can push that date out; treat a row as a reason to look, not a solicitation.`,
            },
            {
              t: "Who is missing",
              d: "Subcontractors, out-of-market primes performing locally, and classified work. Prime recipients headquartered in-market are the unit of analysis.",
            },
            {
              t: "Refresh",
              d: "The refinery re-runs against USAspending and republishes the index. Every response carries the generated date so a stale copy is always detectable.",
            },
          ].map((c) => (
            <div key={c.t} className="card p-5">
              <p className="eyebrow">{c.t}</p>
              <p className="mt-2.5 text-[13.5px] leading-[1.65] text-[var(--color-muted)]">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- Pricing */}
      <section id="pricing" className="mt-16">
        <SectionHead
          eyebrow="Pricing"
          title="Free to look. Paid to act on it."
          blurb="Aggregates stay open because they make the index findable. Row-level access is the thing worth money, so that is the thing behind the key. Every tier includes an API key that works on REST and on both MCP transports."
        />
        <div className="mt-9">
          <PricingTable />
        </div>

        <div className="card mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[58ch] text-[13.5px] leading-[1.65] text-[var(--color-muted)]">
            Need a different market? The refinery is niche-agnostic — the same pipeline runs on any
            metro, any NAICS family, any procurement corridor.
          </p>
          <Link href="/radar" className="btn btn-primary flex-none">
            See it working
          </Link>
        </div>
      </section>
    </div>
  );
}
