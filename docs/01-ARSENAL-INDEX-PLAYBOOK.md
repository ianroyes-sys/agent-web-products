# Arsenal Index — Operating Playbook

**Huntsville / Madison County, Alabama defense & aerospace GovCon data refinery**
A Royz Media Group company · Playbook version 1.0 · 2026-08-16

---

## 0. What we actually have

Everything in this playbook is built on one generated dataset. Do not cite a number that is not in this table or derived from the files listed at the bottom.

| Metric | Value | Source |
|---|---|---|
| Prime awards ingested | 6,000 | `meta.json` |
| Firms tracked (HQ in Madison County, AL) | 426 | `meta.json` |
| Total contract value represented | $113,472,822,943 | `meta.json` |
| Contracts expiring within 24 months | 1,463 | `meta.json` |
| Value of expiring contracts | $22,698,326,850 | `meta.json` |
| Lookback | 3 federal fiscal years | `refine.py` |
| Geography | FIPS 01089 — Huntsville, Madison, Redstone Arsenal | `refine.py` |
| Scope | Prime contract awards, types A/B/C/D, recipient HQ in-market | `refine.py` |
| Generated | 2026-08-16 | `meta.json` |

**Firm tiers** (by total contract value): 48 major (≥$250M), 107 mid ($25M–$250M), 271 small (<$25M).

**Recompete distribution** by time to expiry:

| Window | Contracts | Value |
|---|---:|---:|
| 0–90 days | 492 | $5.85B |
| 91–180 days | 259 | $3.88B |
| 181–365 days | 430 | $5.37B |
| 366–730 days | 282 | $7.60B |
| **Total** | **1,463** | **$22.70B** |

**Recompete value by awarding sub-agency** (top six):

| Sub-agency | Value | Contracts |
|---|---:|---:|
| Department of the Army | $10.96B | 554 |
| Department of the Air Force | $3.59B | 226 |
| Missile Defense Agency | $3.07B | 52 |
| NASA | $2.93B | 100 |
| Department of the Navy | $0.64B | 102 |
| Defense Logistics Agency | $0.36B | 175 |

**Total market by awarding agency:** DoD $90.40B across 4,895 awards and 342 firms; NASA $19.90B across 300 awards and 71 firms; GSA $1.38B; DHS $670.6M. The remaining seventeen agencies together account for under $1.2B.

---

## 1. The ladder: crawl → walk → run

Greg Isenberg's sequencing principle, applied literally: **sell the human version now, build the data now.** Every rung has to produce revenue or proof before the next one is built. Nothing on this ladder requires the rung above it to exist.

### Rung 1 — The report (crawl)

*A PDF a human makes and a human reads.*

- **What it is:** the Recompete Radar as a dated document. Q4 FY26 Huntsville Recompete Report — every contract expiring in the window, sorted by value, with incumbent, agency, NAICS, and expiry date.
- **Build cost:** near zero. The data exists; this is formatting.
- **Price:** $199–499 per report; free abridged version (top 15 rows) as the lead magnet.
- **Why it comes first:** it validates that anyone will pay before a single line of subscription infrastructure exists. If nobody buys the PDF, nobody buys the API.
- **Gate to rung 2:** 5 paying report buyers, or 3 buyers who ask "can I get this monthly."

### Rung 2 — The dashboard (walk)

*A login. Filters. Saved views. Alerts.*

- **What it is:** the web app already scaffolded at `apps/arsenal-index`. Firms, recompetes, agencies, NAICS, market movement. Free tier shows 15 recompete rows (`FREE_RECOMPETE_ROWS` in `paywall.ts`); paid unlocks the full 1,463.
- **The retention mechanic is alerts, not the dashboard.** "Three contracts in your NAICS expire in the next 90 days" is the email that makes the subscription renew. The dashboard is where they land after clicking.
- **Price:** $99–299/mo per seat, tiered (see `02-ICP-AND-PRICING.md`).
- **Gate to rung 3:** 10 paying subscribers, or one customer who asks for a data export more than twice.

### Rung 3 — The API (run, part one)

*Same data, no interface.*

- **What it is:** documented REST endpoints over the same JSON the dashboard reads. `/api/recompetes`, `/api/firms/{id}`, `/api/naics`, `/api/agencies`, `/api/export`.
- **Who buys:** the consultant who wants Huntsville recompetes inside their own client deliverable; the staffing firm that wants expiry dates in their ATS; the CRM integrator.
- **Price:** per-call or per-seat with a call allowance. Existing implemented prices in `paywall.ts`: `recompetes.full` $0.02/call, `firms.detail` $0.01/call, `export.bulk` $2.50/export.
- **Gate to rung 4:** any inbound request for programmatic access, or the first agent-originated request in the logs.

### Rung 4 — The MCP tool (run, part two)

*The agent-native face.*

- **What it is:** an MCP server exposing the dataset as named tools — `search_recompetes`, `get_firm`, `find_teaming_partners`, `naics_gap` — so that a capture manager's Claude or a BD team's internal agent can call Arsenal Index directly inside their workflow. Plus `/llms.txt` at the origin so agents can discover what is here and what it costs.
- **Why this matters more than the API:** an API is something a developer integrates once. An MCP tool is something an agent reaches for every time the question comes up. The unit of adoption drops from "engineering project" to "one sentence in a prompt."
- **Price:** included in paid tiers up to a call ceiling; metered above it.
- **Gate to rung 5:** MCP calls exceeding dashboard sessions, or any usage from a client we did not onboard.

### Rung 5 — Pay-per-lookup (the agent internet proper)

*x402. No account. No onboarding. Just price and proof.*

- **What it is:** an unauthenticated agent hits a paid resource, receives a machine-readable HTTP 402 stating the price and accepted schemes, retries with `X-Payment`, gets data. This is implemented today in `src/lib/paywall.ts`; what is missing is settlement.
- **Why it is last and why it still matters:** it will not be the revenue line in year one. It is the position. Being one of the few resources in a defensible niche that is already priced, documented, and machine-payable is what makes Arsenal Index the thing an agent routes to rather than around.
- **Blocker:** live Stripe. Currently test mode only, and the entity/EIN is not filed. Rung 5 cannot generate a dollar until both are resolved.

**Do not skip rungs.** The temptation with a working dataset is to build rung 4 first because it is the interesting engineering. The report is what tells you whether the interesting engineering has a buyer.

---

## 2. The 10 outputs

The discipline: one dataset, ten distinct products. Each answers a different question, for a different buyer, at a different price. Building ten outputs from one refinery is what turns a dataset into a business — it multiplies revenue per unit of ingestion work by ten without multiplying the ingestion work.

---

### Output 1 — Recompete Radar

**The flagship.**

- **Question it answers:** Which Huntsville contracts are coming up for re-award, when, who holds them now, and what are they worth?
- **The data:** all 1,463 expiring contracts with incumbent, value, agency, sub-agency, NAICS, expiry date, contract type, cleaned description, and a direct USAspending link.
- **Who buys:** capture managers, BD consultants, proposal shops, small and mid primes hunting displacement targets.
- **Delivery:** dashboard view with filters (window, agency, NAICS, value band) · weekly email digest · CSV export · API endpoint · MCP `search_recompetes`.
- **What it is worth:** this is the anchor of the $199–299/mo tier. A capture manager who wins one displacement off this list has paid for a decade of subscription. Free tier shows 15 rows; the other 1,448 are the product.
- **Proof points to lead with:** 492 contracts worth $5.85B expire within 90 days. The single largest is Beyond New Horizons, LLC at $910.2M, Air Force, expiring 2026-09-30. Northrop Grumman has two Army awards totaling $1.73B expiring in December 2026.

---

### Output 2 — Incumbent Vulnerability Report

- **Question it answers:** Which incumbents are exposed enough to be worth attacking?
- **The data:** per-firm concentration — what share of a firm's book sits with a single agency or sub-agency, how much of it expires inside 24 months, how many separate awards it is spread across. A firm with 90% of revenue in one sub-agency and a large expiry inside twelve months is structurally fragile in a way a diversified firm is not.
- **Findings in the current data:** 174 firms with over $5M in contract value draw more than 95% of it from a single agency. 104 firms above $10M draw more than 90% from a single sub-agency. Named examples with high expiry-to-total ratios: NTSI LLC — $184.1M total, $184.1M expiring (100%). H2 Technology Group, LLC — $116.2M total, $116.2M expiring. VetTech LLC — $107.6M, entirely expiring. Davidson Technologies — $186.6M total with $113.5M expiring across two awards.
- **Who buys:** competitors planning displacement; M&A and PE buyers assessing target durability; the incumbent themselves, defensively.
- **Delivery:** per-firm PDF, or a ranked list inside the dashboard.
- **What it is worth:** $499–1,500 per named target report, or bundled into the $299/mo tier. The defensive version sells to the incumbent at a premium — a firm looking at 100% of its book expiring is the easiest sale in the dataset, and it is a Legible referral at the same time.
- **Ethics line:** this is public federal data about federal awards. It is competitive intelligence, not surveillance. No personnel data, no non-public information, no ITAR/CUI/classified content ever enters this product. See `05-MOAT-AND-RISKS.md`.

---

### Output 3 — Teaming Target List

- **Question it answers:** Who should I team with to be credible on this pursuit?
- **The data:** firms matched on complementary NAICS, shared agency history, and non-overlapping capability, with each candidate's actual past performance in the relevant code. A small firm bidding a 541330 Engineering Services recompete needs a partner with real 541712 R&D past performance and a relationship at the awarding sub-agency; the dataset can identify both.
- **Findings in the current data:** 541715 (Physical/Engineering R&D) is the single largest recompete NAICS at $5.37B across 250 contracts — the deepest teaming pool. 541330 (Engineering Services) carries $3.04B across 147 contracts. 336413 (Aircraft Parts) has $1.72B spread across 232 contracts, meaning many small awards and many possible partners.
- **Who buys:** small primes and subs preparing bids; proposal consultants building partner slates for clients; large primes assembling small-business subcontract plans to satisfy their subcontracting goals.
- **Delivery:** filtered list export per pursuit; API `find_teaming_partners`; MCP tool.
- **What it is worth:** $299–999 per pursuit-specific list, or a core feature of the $299/mo tier. Highest perceived value of any output because it maps directly onto a bid the buyer is already writing.

---

### Output 4 — Capability Gap / NAICS-to-Add Report

- **Question it answers:** Which codes should I be registered and qualified in, given where the money in my market is actually moving?
- **The data:** the firm's current NAICS footprint versus the market's, weighted by expiring value. Where is there money in adjacent codes this firm could credibly claim but has never bid?
- **Findings in the current data:** the market spans 221 distinct NAICS codes. Concentration varies enormously — 541712 has 45 firms competing for $21.58B, while some high-value codes have almost no local competition. Codes with high expiring value and thin firm counts are the recommendation engine's output.
- **Who buys:** small and mid firms planning next fiscal year; GovCon consultants doing capability positioning; new market entrants.
- **Delivery:** per-firm report; annual or semi-annual refresh.
- **What it is worth:** $499–1,500 per report. Natural annual repurchase, which makes it a good subscription attach.

---

### Output 5 — Agency Concentration Map

- **Question it answers:** Where does the money in this market actually come from, and how concentrated is it?
- **The data:** value, award count, and firm count by agency and sub-agency, with year-over-year movement.
- **Findings in the current data:** DoD is $90.40B of the $113.47B market — 80% — across 4,895 awards and 342 of the 426 firms. NASA is $19.90B across only 300 awards and 71 firms, which makes it a much higher average award size and a materially different sales motion. GSA ($1.38B), DHS ($670.6M), and HHS ($230.2M) are the only other agencies above $200M. Seventeen agencies are below $200M combined.
- **Who buys:** economic development organizations; site selectors; firms deciding which agency to build a past-performance record with; anyone writing a market entry memo.
- **Delivery:** dashboard view, and a standalone annual "State of Huntsville GovCon" report.
- **What it is worth:** the annual report is the marketing asset, not the revenue line — give it away, gated behind an email, and use it as the top of the funnel for everything else. The interactive version lives in paid tiers.

---

### Output 6 — Market Movement Report

- **Question it answers:** Is this market accelerating or cooling, and where?
- **The data:** monthly obligated value across the window (`movement.json`), segmentable by agency and NAICS. 38 months of history in the current build.
- **Findings in the current data:** the series shows the expected federal fiscal-year-end spike — September 2025 is the largest month in the series at $1.486B, September 2023 at $787.2M, September 2024 at $803.1M. The most recent months (June–September 2026) show low values, but **this is a reporting-lag artifact, not a market collapse**, and must be labeled as such in every delivery. USAspending back-fills recent months for weeks after the fact. Never sell a "market is declining" narrative off the trailing edge of this series.
- **Who buys:** economic development, press, investors, firms doing annual planning.
- **Delivery:** monthly email; chart in dashboard; quarterly commentary post.
- **What it is worth:** primarily a content and credibility asset. It is what gets Arsenal Index quoted, and being the cited source is a moat (see `05-MOAT-AND-RISKS.md`). Monetize indirectly.

---

### Output 7 — Small-Business Set-Aside Map

- **Question it answers:** Where is the set-aside money, and which codes are realistically winnable by a small firm?
- **The data:** award value in codes and agencies where small-tier firms are actually winning, cross-referenced against expiring contracts. 271 of the 426 tracked firms are small-tier.
- **Honest limitation:** the current ingestion **does not carry the set-aside type field** (8(a), SDVOSB, WOSB, HUBZone, small business set-aside). Today this output is inferred from winner size, which is a proxy, not the real field. Adding set-aside type to the ingestion is a required build step before this output can be sold as a set-aside map rather than a small-business-activity map. Do not oversell it in the interim.
- **Who buys:** 8(a) and SDVOSB firms; small-business liaison officers; consultants serving small GovCon.
- **Delivery:** filtered dashboard view; quarterly report.
- **What it is worth:** $299–999 per report once the set-aside field is ingested. Lower until then, and it must be described accurately.

---

### Output 8 — New Entrant Watch

- **Question it answers:** Who just showed up in this market, and should I care?
- **The data:** firms whose first observed award falls inside a recent window, with value, agency, and NAICS.
- **Findings in the current data:** 90 firms have a first-seen date on or after 2024-01-01; 40 since 2025-01-01. Notable recent entrants by value: Sun Test Systems, Inc. (first seen 2025-03-14, $112.6M), Performance Drone Works LLC (2025-09-18, $17.9M), TC Technology Solutions, LLC (2025-01-29, $10.8M), Molrix, LLC (2026-05-15, $5.0M).
- **Caveat that must ship with the product:** "first seen" means first appearance in this three-year ingestion window, not company founding date or first-ever federal award. A firm dormant for four years that just won again will appear as new. Label it as "first observed in window."
- **Who buys:** incumbents watching for new competition; M&A scouts looking for fast-growing targets; staffing firms tracking who is about to hire; local economic development.
- **Delivery:** monthly email; dashboard filter.
- **What it is worth:** a strong subscription retention driver — it creates a reason to open the email every month. Also the single best free content hook on the list.

---

### Output 9 — Expiring Vehicle Alerts

- **Question it answers:** Did anything change in *my* slice this week?
- **The data:** the Recompete Radar, filtered to a subscriber's saved criteria — their NAICS codes, their agencies, their named competitors, their value band — pushed on a schedule rather than pulled.
- **Who buys:** everyone who buys Output 1. This is not a separate dataset; it is a delivery mode, and it is the reason the subscription renews.
- **Delivery:** email, Slack webhook, API webhook, MCP polling.
- **What it is worth:** this is the retention product. A dashboard someone forgets to open churns. An alert that lands the week a $180.7M Army contract held by IronMountain Solutions, LLC approaches its 2026-09-07 expiry does not. Bundle it into every paid tier; never sell it standalone.

---

### Output 10 — Competitor Award-Velocity Report

- **Question it answers:** Is a named competitor speeding up or slowing down, and where are they pointed?
- **The data:** per-firm award count and value over time, agency mix shift, NAICS mix shift, expiring exposure.
- **Findings in the current data:** velocity varies enormously and is a real signal. Torch Technologies Inc — 104 awards, $5.25B total, 16 contracts worth $2.48B expiring. Defense Systems and Solutions — 289 awards totaling $2.88B, with 125 contracts worth $1.44B expiring, a high-frequency, high-churn profile. Intuitive Research and Technology Corporation — 58 awards, $3.77B, 21 expiring worth $639.9M. Science and Engineering Services, LLC — 125 awards, $1.31B, 35 expiring worth $396.3M. Radiance Technologies Inc — 88 awards, $1.56B, 27 expiring worth $320.9M.
- **Who buys:** competitors; M&A and PE diligence; recruiters targeting a specific firm's staff; the firm itself for board reporting.
- **Delivery:** named-firm PDF; dashboard firm page; API `get_firm`.
- **What it is worth:** $499–1,500 per named competitor deep-dive; a batch of five competitors is the natural enterprise upsell.

---

### The ten at a glance

| # | Output | Primary buyer | Delivery | Price |
|---|---|---|---|---|
| 1 | Recompete Radar | Capture managers, BD consultants | Dashboard, digest, API, MCP | Core of $199–299/mo |
| 2 | Incumbent Vulnerability | Competitors, M&A, the incumbent | Per-firm PDF | $499–1,500 |
| 3 | Teaming Target List | Small primes, proposal shops | Per-pursuit export | $299–999 |
| 4 | Capability Gap / NAICS | Small & mid firms, consultants | Per-firm report | $499–1,500 |
| 5 | Agency Concentration Map | EDOs, market entrants, press | Free annual report + dashboard | Funnel asset |
| 6 | Market Movement | Investors, press, planners | Monthly email + chart | Credibility asset |
| 7 | Set-Aside Map | 8(a)/SDVOSB firms, SBLOs | Quarterly report | $299–999 *(after field is ingested)* |
| 8 | New Entrant Watch | Incumbents, M&A, staffing | Monthly email | Retention + free hook |
| 9 | Expiring Vehicle Alerts | All paid subscribers | Email, Slack, webhook | Bundled — the renewal driver |
| 10 | Award Velocity | Competitors, PE, recruiters | Named-firm PDF | $499–1,500 |

Note the pattern: three outputs are free or near-free (5, 6, 8) and exist to generate attention and email addresses. One is bundled and exists to prevent churn (9). One is the subscription anchor (1). Five are high-margin one-off reports that can be produced by hand today, before any of the software is finished (2, 3, 4, 7, 10). **The five one-off reports are the revenue in the first 90 days.**

---

## 3. Refresh cadence and the data operation

The moat is not the current snapshot. It is the accumulation. Every refresh that runs is a day of history a competitor starting later can never reconstruct.

| Task | Cadence | Effort |
|---|---|---|
| Full re-ingest (`refine.py`) | Weekly, Monday | Automated, ~20 min unattended |
| Snapshot archive to dated folder | Every run | Automated — **this is the moat; never skip it** |
| Diff against prior run → new awards, changed expiry dates, new entrants | Weekly | Automated |
| Alert dispatch to subscribers | Weekly, Tuesday | Automated once built |
| Manual QA on top 25 rows | Weekly | 20 min |
| Movement report commentary | Monthly | 45 min |

**The single most important operational instruction in this document:** start archiving dated snapshots immediately, before there is a single customer. Time-series data cannot be back-filled. USAspending serves current state; it does not serve "what did this record say in August 2026." Every week that passes without archiving is a week of moat permanently forfeited.

---

## 4. What to build next, in order

1. **Archive snapshots on every run.** One line of code. Highest return of anything on this list.
2. **Add set-aside type to ingestion.** Unlocks Output 7 honestly and improves Outputs 3 and 4.
3. **Raise the page cap above 60.** Currently truncated to the 6,000 largest awards; the long tail of small awards is where the small-business story lives.
4. **Weekly diff engine.** Prerequisite for Output 9, which is the retention product.
5. **Email capture + digest send.** The free tier is worthless without a list to send to.
6. **`/llms.txt` and the MCP descriptor.** Cheap, and it is how agents find us at all.
7. **Live Stripe.** Blocked on entity/EIN. Everything above can be built while that is pending; nothing above can be *charged for* until it clears.

---

*Data files: `data/out/meta.json`, `firms.json`, `recompetes.json`, `agencies.json`, `naics.json`, `movement.json`, `index.json`. Generator: `data/ingest/refine.py`. Generated 2026-08-16 from USAspending.gov API v2 (public domain, no key). App: `apps/arsenal-index`.*
