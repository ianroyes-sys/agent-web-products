# The Agent Internet

**Royz Media Group — portfolio thesis**
Prepared 2026-08-16 · Ian Royes, sole operator · Huntsville, Alabama

---

## 1. The old bargain

For roughly twenty-five years the web ran on one unwritten trade:

> *You may take my content for free. In exchange, you send me a human.*

Google crawled a page and returned a click. The click carried a person. The person could see an ad, subscribe, buy something, or at minimum count as a number a media buyer would pay for. Content was the cost of acquiring attention, and attention was the product being sold. Nobody signed this agreement, but every business model on the consumer internet — publishing, SEO, affiliate, content marketing, most of DTC — was built on top of it.

The bargain worked because crawling and traffic were coupled. You could not have one without the other.

## 2. What breaks

An AI agent decouples them.

An agent reads the page, extracts the answer, and returns that answer to its user inside a chat window. The page was consumed. The visit never happened. There is no impression, no session, no cookie, no email capture, no retargeting pixel — nothing that the last two decades of internet business assumed would arrive alongside the crawl.

The crawl-to-visit ratio has been moving in one direction for every publisher who has measured it. The direction of travel is not in dispute; the exact ratio varies by site and by crawler, and any specific number should be pulled from your own logs rather than borrowed from a headline.

So the site owner faces three options:

1. **Block the agents.** Preserves nothing. The answer gets synthesized from a competitor who did not block, and you lose even the citation.
2. **Let them take it free.** The 2015 bargain without the payment side of it. Pure cost.
3. **Charge for the request itself.**

Option three is the whole thesis. If the visit is never coming back, then the visit was never the asset. **The request was the asset the entire time.** We just had no way to bill for it.

## 3. Cloudflare's stack

Cloudflare sits in front of a very large share of the web, which makes it the only party positioned to change the default. Its stack, in the order a site owner encounters it:

| Layer | What it does |
|---|---|
| **AI Crawl Control** | Visibility and policy. Shows which AI crawlers hit your origin, how often, and lets you allow, block, or price them per bot. You cannot charge for what you cannot see, so this is step zero. |
| **Pay Per Crawl** | The billing primitive. A crawler that wants a resource either presents payment or gets refused. The site publishes a price; the crawler decides. |
| **Monetization Gateway / marketplace layer** | The clearing house. Instead of every publisher negotiating with every AI lab, the network aggregates supply and demand and settles centrally. |
| **x402** | The open protocol underneath. |

Cloudflare's product names and commercial terms have moved more than once. Before quoting any of this to a customer, verify it against Cloudflare's current documentation — do not cite from this memo.

## 4. x402, and why HTTP 402 matters

HTTP status code 402 is `Payment Required`. It has been in the HTTP specification since the beginning and was reserved for a future that never arrived. Every other code got used. 402 sat there for thirty years as a placeholder for micropayments nobody could make work, because micropayments needed a human to approve each one, and humans will not approve four hundred nineteen-cent decisions.

**Agents will.** That is the entire unlock.

The x402 flow is intentionally boring:

```
1. Agent  → GET /api/recompetes                    (no credential)
2. Server → 402 Payment Required
            { price: 0.02, currency: "USD", unit: "call",
              accepts: ["x402", "api_key"], pay_to: ... }
3. Agent  → GET /api/recompetes    X-Payment: <proof>
4. Server → 200 OK  { data }
```

Three properties make this different from every previous micropayment attempt:

- **Machine-readable price.** The 402 body describes the cost in a format the agent can parse and reason about without a human in the loop.
- **No account, no onboarding, no sales cycle.** The agent does not sign up, get provisioned, or negotiate an MSA. It pays and proceeds. First contact to first dollar is one round trip.
- **No psychological friction.** A human weighing $0.02 spends more than two cents' worth of attention deciding. An agent operating under a budget does arithmetic. If the answer is worth more than the price, it pays, every time, without resentment.

Arsenal Index already implements this handshake. `apps/arsenal-index/src/lib/paywall.ts` returns a machine-readable 402 with per-resource pricing and accepts either an `X-Payment` proof or a self-issued `X-API-Key`. Settlement is Stripe's job and is not yet live — see the caveat in §8.

## 5. Websites become resource layers

Follow the logic to its end and the shape of a website changes.

The human web optimized for **persuasion**: hero images, social proof, scarcity timers, funnels. Every element existed to move a person's emotional state toward a purchase.

The agent web optimizes for **retrieval**: is the resource correct, is it current, is it structured, is it addressable, is it cheap enough to call without deliberation. An agent is immune to a hero image. It cannot be persuaded, only satisfied.

Practically, a site in this world has three faces:

- a **human face** — the marketing site, the dashboard, the report;
- a **machine face** — `/llms.txt`, structured endpoints, an MCP server, a documented 402 price list;
- a **ledger** — what was asked, by whom, how often, at what price. This is the new analytics, and it is also the new moat, because request logs describe demand more honestly than any survey.

Greg Isenberg's filter for whether any of this applies to you:

> **What resource does an agent need badly enough, often enough, and reliably enough to pay for?**

And the data filter, which is the sharper of the two — the underlying data must be all five of:

| Filter | Why it matters |
|---|---|
| **Valuable** | Somebody's revenue depends on the answer. |
| **Repeated** | One-time lookups do not build a business. Subscriptions need recurrence. |
| **Changing** | Static data gets scraped once and never paid for again. Change is what forces the re-query. |
| **Fragmented** | If it lives in one clean place, that place already owns it. |
| **Annoying** | Friction is the margin. If it were pleasant to get, everyone would already have it. |

## 6. Where the money actually is

The naive read of "agents pay for data" is: become a publisher and collect crawl fees. That is the worst version of this business. Crawl fees are commodity pricing on commodity content, and the aggregators will compress them.

The good version is the opposite end: **build a resource so specific that an agent cannot synthesize it from the open web, and so operationally load-bearing that the buyer's revenue depends on having it.** Niche beats broad. Depth beats breadth. Recency beats archive.

That is the filter all three RMG products were selected against.

## 7. The portfolio

Three products, one thesis, deliberately staggered so that each funds the next.

### Arsenal Index — the resource layer

A niche data refinery for Huntsville / Madison County, Alabama defense and aerospace contracting, built on USAspending.gov, which is public domain and requires no API key.

Current state of the refined dataset (`data/out/meta.json`, generated 2026-08-16):

| Metric | Value |
|---|---|
| Prime awards ingested | 6,000 |
| Huntsville-headquartered firms tracked | 426 |
| Total contract value represented | $113.5B |
| Contracts expiring within 24 months | 1,463 |
| Value of those expiring contracts | $22.7B |

The flagship output is the **Recompete Radar**: every one of those 1,463 expiring contracts with its incumbent, dollar value, awarding agency and sub-agency, NAICS code, and exact expiry date. It is a dated list of moments when money changes hands, in one metro, refreshed on a schedule.

Against the five-part data filter:

- **Valuable** — a single recompete on this list can be worth eight or nine figures.
- **Repeated** — capture teams check pipeline weekly, not annually.
- **Changing** — expiry dates move, options get exercised, new awards land every month.
- **Fragmented** — the raw data is spread across USAspending, SAM.gov, agency forecasts, and FPDS, none of which are joined.
- **Annoying** — USAspending contract descriptions arrive as raw fixed-width DoD extract strings stuffed with `!` delimiters. Turning that into a readable sentence is literally the refining step (`data/ingest/refine.py`, `clean_description`).

Five for five. This is why it is first.

### Legible — the services layer

Agent-readiness audits for the same 426 firms. When a program manager, a prime's teaming lead, or a junior analyst asks an AI assistant "who in Huntsville does hardware-in-the-loop missile simulation," a specific set of companies gets named and the rest do not exist. Most Huntsville primes and subs have never checked which group they are in.

Legible checks, produces the transcript, fixes what is fixable, and then measures the same questions monthly. Pricing: $3–10K for the audit, $10–20K for large firms, $500–1,500/mo for the recurring measurement.

Legible is the cash-flow product. It converts fastest because the deliverable can be shown before it is bought, and it shares a target list with Arsenal Index — the same 426 firms, approached with a different offer.

### Come Up — the leverage layer

Ian's own accumulated expertise — roughly thirty shipped iOS apps, client delivery across churches, nonprofits, and artists — compressed into one job-specific agent tool: *turn what you know into a paid offer and your first thirty days*. $19–49/mo.

Come Up is deliberately last. It is the only one of the three whose demand is not already proven by an existing budget line, and it is the one that most benefits from Arsenal Index and Legible having generated public proof first.

### How they fit

| | Arsenal Index | Legible | Come Up |
|---|---|---|---|
| **Type** | Data / API / agent resource | Services → recurring | Product / subscription |
| **Buyer** | Sellers into the niche, then firms, then agents | The 426 firms | Individual operators |
| **Revenue shape** | $/mo + $/call | $3–20K + $500–1,500/mo | $19–49/mo |
| **Time to first dollar** | Fastest — data is built | Fast — sell the screenshot | Slowest |
| **Role in portfolio** | The moat | The cash flow | The scale |

The connective tissue is the target list. The same 426-firm dataset that Arsenal Index sells *about* is the list Legible sells *to*. One research effort, two revenue lines. Come Up then packages the operating method that produced both.

## 8. What is not true yet

Stated plainly, because this document may go to a funder or a client:

- **No revenue.** Zero customers across all three products as of 2026-08-16.
- **No entity.** The Royz Media Group LLC filing and EIN are not on file. Every contract, invoice, and W-9 below a certain size can technically be executed as a sole proprietor, but the audit and retainer work in Legible should not start before the entity exists. This is the single cheapest blocker to clear.
- **Stripe is in test mode.** No live payment can be accepted today. This gates the Arsenal Index subscription tier, the per-call settlement, and every Legible invoice. Card-not-present revenue is blocked until this is resolved; a check or ACH invoice is the interim path and requires the entity first.
- **The 402 handshake is implemented; settlement is not.** The gate returns correct machine-readable 402s and honors self-issued API keys. Actual money movement against `X-Payment` proofs is unfinished.
- **The dataset has known limits.** It covers prime awards only, is currently truncated to the 6,000 largest awards in the window, and inherits USAspending's reporting lag. Full treatment in `05-MOAT-AND-RISKS.md`.
- **Operator capacity is one person, part-time.** Ian is a full-time college student. The plan in `04-90-DAY-PLAN.md` is built around roughly 15–20 working hours a week, not 40.

## 9. The bet in one paragraph

The human internet monetized attention, and attention is now being intercepted before it reaches the site. The agent internet monetizes useful resources, and the request itself is the billable event. The winners will not be the biggest content libraries; they will be narrow, current, well-structured resources that a machine will pay for repeatedly because the answer is load-bearing and cannot be synthesized elsewhere. Huntsville GovCon recompete data is exactly that shape — $22.7B of contract value with dates attached, in a metro of 426 tracked firms, derived from public-domain federal data that is free to redistribute. Arsenal Index builds the resource, Legible sells the services that fund it, and Come Up packages the method. The differentiated asset is not the code; it is the cleaned time-series that accumulates from the day ingestion starts and cannot be back-filled by anyone who begins later.

---

*Sources: `data/out/meta.json`, `data/out/firms.json`, `data/out/recompetes.json`, `data/out/agencies.json`, generated 2026-08-16 from USAspending.gov API v2. Underlying federal spending data is public domain. Cloudflare product descriptions are from public announcements and must be re-verified against current documentation before external use.*
