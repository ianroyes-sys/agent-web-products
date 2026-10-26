# Arsenal Index

**The resource layer for Huntsville defense contracting.**

A niche data refinery. It takes one niche's messy internet — every prime contract
award flowing through the Huntsville / Madison County, Alabama defense corridor —
and turns it into clean fuel for agents: resolved firms, a 24-month recompete
radar, market structure, and an API a machine can discover, parse, trust, and pay
for without a human in the loop.

An index by **Royz Media Group**.

---

## Why this exists

The human web monetized attention. You sold the impression, the click, the ad next
to the answer. That business needs eyeballs, and agents do not have eyeballs.

An agent has a task and a budget. It wants a fact it can act on, with provenance,
fresh enough to trust, in a shape it can parse on the first try — and it will pay
two cents for that and skip your site entirely. So the asset stops being traffic
and starts being a refined, defensible slice of the world nobody else cleaned up.

Huntsville is a good first slice: ~$113B of prime obligations, 426 resolved firms,
a genuinely underserved market, and a public-domain source that nobody has bothered
to make machine-legible.

## The product

| Surface | What it is |
| --- | --- |
| `/` | The thesis, live headline numbers, pricing |
| `/radar` | **The recompete radar** — 1,463 contracts expiring within 24 months, banded hot / warm / horizon |
| `/firms` | 426 tracked firms, searchable and filterable by tier, agency, NAICS |
| `/firms/[id]` | Firm profile: agency mix, NAICS mix, PSC, expiring work, **capability gap** |
| `/market` | Agency mix, NAICS concentration, monthly obligation movement |
| `/api-docs` | API + MCP reference and pricing. Doubles as the sales asset |

The recompete radar is the whole product. A contract with an end date is a seat
that is about to be empty; this is the list of seats, sorted by how soon you have
to move.

## Data

Real data from [USAspending.gov](https://www.usaspending.gov) API v2 (public
domain, no key). The refinery lives one level up in this repo and writes
`data/out/*.json`. Nothing in this app is mocked — every number on screen traces
back to an award ID you can open on USAspending.

```
data/out/index.json
  meta        generated, source, market, scope, lookback, totals
  firms[]     resolved prime recipients, ranked, with agency/NAICS/PSC rollups
  recompetes[] awards with a period of performance ending inside 24 months
  naics[]     categories by obligated value, with firm count and concentration
  agencies[]  funding agencies by obligated value
  movement[]  monthly obligated totals across the lookback
```

`scripts/sync-data.mjs` copies `data/out/*.json` into `src/data/` on `predev` and
`prebuild`, so the app is self-contained and deploys to Vercel without the parent
repo. If the refinery is absent, the sync falls back to the already-synced copy.

**To re-run the refinery**, run the generator in the repo root, then:

```bash
npm run sync-data   # or just npm run build, which syncs first
```

Every API response carries `meta.generated` and `meta.source`, so a stale copy is
always detectable by the caller.

## Local development

```bash
npm install
npm run dev      # http://localhost:4801
npm run build    # syncs data, then builds
npm run start    # production server on 4801
```

Copy `.env.example` to `.env.local`:

```bash
ARSENAL_API_KEYS=            # comma-separated allowlist; a valid key skips the 402
STRIPE_SECRET_KEY=           # TEST MODE; absent = CTAs degrade to request-access
STRIPE_PRICE_RADAR=          # your price ID — $299/mo
STRIPE_PRICE_INTELLIGENCE=   # your price ID — $799/mo
STRIPE_PRICE_AGENT_API=      # your price ID — $1,999/mo
X402_ENABLED=                # leave unset; see "Payment rails" below
NEXT_PUBLIC_SITE_URL=        # absolute origin used in llms.txt, MCP, Stripe redirects
```

## Payment rails

Two rails, different processors, different availability. They are presented as
distinct throughout the product — on `/api-docs#payment`, in `llms.txt`, in the
MCP descriptor, and in the `schemes` block of every 402 body.

**Rail one — `X-API-Key`, on a Stripe subscription. Available now.** For people
and integrators. Three tiers, backed by real test-mode prices on the Royz Media
Group account: Radar $299/mo, Intelligence $799/mo,
Agent API $1,999/mo. Price IDs are read from env, so a live-mode swap is config,
not code. `POST /api/checkout` opens a Stripe Checkout session using the REST API
over `fetch` — no SDK dependency.

Checkout runs in **test mode**: card `4242 4242 4242 4242`, any future expiry and
CVC. Nothing is ever charged.

**If Stripe is not configured, the CTA is never broken.** `PricingTable` is a
server component that checks for both the secret key *and* the plan's price ID at
render time, and emits a request-access mailto instead of a checkout button when
either is missing. `POST /api/checkout` independently answers `503` with a
`fallback` mailto for direct callers, and `CheckoutButton` swaps itself for the
same link if Stripe fails mid-request. Three layers, no dead button and no broken
redirect.

**Rail two — `X-Payment`, x402 per lookup. Not open yet.** For machine callers
with a budget and no account. Cloudflare's Monetization Gateway settles
peer-to-peer in stablecoins directly to a wallet — it does **not** run through
Stripe. It is waitlist-only and not generally available.

The 402 handshake is complete and advertises the per-lookup price today, so an
agent can discover the terms. Settlement is the missing piece, and
`X402_ENABLED` is off by default because of it: with no facilitator to verify a
proof against, accepting an unverified `X-Payment` header would let anyone who
read the docs walk past the paywall with a long random string. Machine callers
take the Agent API seat until the gateway opens.

## The agent layer

### REST

Free, no key:

```
GET /api/v1/market                 aggregates, concentration, movement
GET /api/v1/firms                  directory        ?q ?agency ?naics ?tier ?expiring ?limit ?offset
GET /api/v1/recompetes             15 most urgent   ?days ?agency ?naics ?band ?min_value ?q
GET /api/v1/naics                  categories       ?q ?limit ?offset
GET /api/v1/agencies               agencies         ?q ?limit ?offset
```

Paid:

```
GET /api/v1/recompetes?full=1      full radar        $0.02 / call
GET /api/v1/firms/{id}             full firm detail  $0.01 / call
GET /api/v1/export                 whole index       $2.50 / export  (?format=csv)
```

Per-call prices are the x402 rate card, quoted in the 402 body so agents can plan
against them. Today those resources unlock with a subscription key — see
**Payment rails**.

Checkout:

```
GET  /api/checkout                 which plans can take a subscription right now
POST /api/checkout { plan }        opens a Stripe Checkout session, or 503 + fallback
```

Every response is `{ meta, data }`. The meta block always carries `generated`,
`source`, `market`, `license`, and `tier` so an agent can judge freshness before
it acts.

### HTTP 402, per the x402 model

Ask for a paid resource with no credentials and you get a machine-readable price
and a retry hint rather than a signup wall:

```
$ curl -i https://arsenal-index.com/api/v1/recompetes?full=1

HTTP/1.1 402 Payment Required
WWW-Authenticate: x402 realm="arsenal-index", resource="recompetes.full", price="0.02", currency="USD"
X-Payment-Required: 0.02 USD per call

{
  "error": "payment_required",
  "price": { "amount": 0.02, "currency": "USD", "unit": "call" },
  "accepts": ["x402", "api_key"],
  "free_tier": { "recompete_rows": 15 },
  "docs": "/api-docs",
  "retry": "Retry with an X-Payment header (x402) or X-API-Key header."
}
```

Retry with `X-API-Key: <key>`. The `accepts` array lists both rails; the
`schemes` block carries a per-rail `status` so an agent does not burn a retry
finding out which one settles. All of this lives in one helper,
`src/lib/paywall.ts`.

The gate is real, not cosmetic: on `/radar`, rows past the free 15 are degraded
**on the server** before they are sent — incumbent name nulled, exact value
replaced by an order-of-magnitude bucket, description and deep link stripped.
There is nothing to un-blur in the page source.

### Discovery

```
GET /llms.txt                the agent-readable map of the whole resource
GET /.well-known/mcp.json    MCP discovery descriptor
```

### MCP

Five tools: `search_firms`, `get_firm`, `list_recompetes`, `market_summary`,
`capability_gap`. Both transports enforce the same payment rules — an unpaid call
to a paid tool returns a `payment_required` payload with the price, not a silent
failure.

**Streamable HTTP** — `POST /api/mcp`, JSON-RPC 2.0 (`initialize`, `tools/list`,
`tools/call`). No SDK dependency.

```bash
curl -s https://arsenal-index.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"capability_gap","arguments":{"firm_id":"the-boeing"}}}'
```

**stdio** — `mcp/server.mjs`, zero dependencies, reads the JSON directly. Works in
Claude Desktop today. Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "arsenal-index": {
      "command": "node",
      "args": [
        "/absolute/path/to/agent-web-products/apps/arsenal-index/mcp/server.mjs"
      ],
      "env": {
        "ARSENAL_PAID": "0"
      }
    }
  }
}
```

Set `ARSENAL_PAID=1` to unlock the paid tools locally. If the app has not been
synced, point the server at the refinery directly with `ARSENAL_INDEX_PATH`.

## Crawl, walk, run

**Crawl — where this is now.** One niche, one market, real public-domain data,
refined and published. Free aggregates for discovery, a 402 gate on the row-level
radar, MCP on two transports, and three real subscription tiers on Stripe test
mode. The API-key rail is enforced end to end; the x402 rail advertises its price
but is switched off until settlement can be verified.

**Walk.** Take the Monetization Gateway seat when the waitlist opens and turn on
`X402_ENABLED` behind real proof verification, so agents can buy one lookup
without holding a subscription. Flip Stripe to live mode and add a webhook that
issues API keys on `checkout.session.completed` instead of by hand. Re-run the
refinery on a schedule and publish a weekly delta — *what changed on the radar* is
a better product than the radar, because it is the thing you cannot get by looking
once. Add subcontract awards and FPDS modification history so an incumbent's true
hold on a contract is visible.

**Run.** The refinery is niche-agnostic. The same pipeline runs on any metro, any
NAICS family, any procurement corridor — Colorado Springs, Dayton, Huntsville's
space side, the shipbuilding corridor. Each becomes its own index with its own
accent color under the same house tokens. The moat is not the code; it is having
already cleaned up a slice of the world that agents now depend on.

## Design

Shared Royz Media Group tokens (`brand/tokens.css`) with one override: `--accent:
#f5a524`. Amber reads as ordnance and alert against the ink ground — a radar is a
warning surface, not a dashboard. Space Grotesk for display, JetBrains Mono for
every numeral, tabular figures on every dollar figure, compact values with the
full amount on hover.

No chart library. The movement chart is hand-rolled inline SVG so it follows the
theme instead of fighting it.

## Deploy notes

- Vercel, root directory `apps/arsenal-index`. `prebuild` syncs the data.
- `src/data/**` is traced into the serverless bundle via `outputFileTracingIncludes`
  — the JSON is read with `fs`, not imported, so tsc stays fast.
- `/.well-known/mcp.json` is served by a route handler behind a rewrite, because
  Next ignores dot-prefixed folders in `app/`.
- 426 firm pages are prerendered with `dynamicParams = false`: the firm set is
  closed, so an unknown slug 404s at the router.
- `/` and `/api-docs` use `revalidate = 300` because their CTAs depend on the
  Stripe env at render time. A pure build-time prerender freezes that decision,
  and Next's build cache will reuse the old HTML on redeploy since no source file
  changed — ISR re-renders on the server where the env is read fresh. Add the
  Stripe vars and the CTA corrects itself within five minutes, no redeploy.
- Set `NEXT_PUBLIC_SITE_URL` in production or `llms.txt`, the MCP descriptor, and
  the sitemap will advertise `localhost`.

## Caveats, stated plainly

- Values are **obligated amounts** as reported, not contract ceilings and not
  revenue.
- `days_out` measures from the index generation date to the current
  period-of-performance end date. Unexercised options can push that out — a row is
  a reason to look, not a solicitation.
- Coverage is prime recipients **headquartered in market**. Subcontractors,
  out-of-market primes performing locally, and classified work are not here.
- Derived work. The underlying federal spending data is public domain. Not
  affiliated with, or endorsed by, any government agency or any firm listed.
