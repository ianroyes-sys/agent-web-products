# Moat and Risks

**An honest assessment. Written to be shown to someone skeptical.**
Royz Media Group · 2026-08-16

---

## 1. Where the moat actually is

Four things are genuinely defensible. Everything else in this business is copyable in a weekend.

### 1.1 Accumulated, cleaned time-series — the only real one

USAspending.gov serves **current state**. It will tell you what an award record says today. It will not tell you what that record said on 2026-08-16, and it does not maintain a public change history at the granularity we care about.

That means:

- A competitor who starts in January 2027 can pull the same current snapshot we can.
- They **cannot** reconstruct what changed between August 2026 and January 2027.
- They cannot compute how often expiry dates slip, which incumbents get quiet extensions, which firms are accelerating, or which awards were modified and by how much.

Every weekly snapshot is a row in a table nobody else will ever be able to write. After twelve months, Arsenal Index can answer questions — *how often do Army recompetes in this NAICS actually slip past their stated expiry?* — that a new entrant cannot answer at any price, because the observations no longer exist to be made.

**This is the whole moat, and it costs approximately one line of code and a cron job.** It is also the only asset in this business that is destroyed by inaction rather than by competition. That asymmetry is why snapshot archiving is the first task in `04-90-DAY-PLAN.md` and the one metric with no acceptable shortfall.

Corollary: **the moat has not started yet.** As of 2026-08-16 there is one snapshot. The moat is a claim about the future that becomes true only through thirteen consecutive uneventful Mondays.

### 1.2 Local presence

Ian lives in Huntsville. This is worth more than it sounds in a defense town.

Huntsville GovCon runs on personal relationships, chapter meetings, and symposium hallways. AUSA Global Force in March and the Space & Missile Defense Symposium in August put the entire buyer set in one building. A remote data vendor emails into this market; a local operator shows up, gets introduced, and gets vouched for.

Limits, stated plainly: a college student with no track record starts near the bottom of the credibility ladder in a market full of retired colonels and twenty-year program veterans. Local presence is an advantage that must be *earned into* over months. It is not a head start; it is a lower cost of building one.

### 1.3 Vertical depth

Arsenal Index is not a worse GovWin. It answers one question — *what expires here, when, held by whom* — better than a broad platform answers it, for one metro, at a price a 30-person firm can approve without a committee.

Depth is defensible because it is *unattractive to the incumbent*. Deltek will not build a Madison-County-specific recompete product; the addressable revenue does not justify a roadmap slot. The same is true of every other national platform. The niche is protected by its own small size, which is exactly Isenberg's point about niche data refineries — and it is also the ceiling. See §3.4.

### 1.4 Becoming the citation source

The strategic prize. When an agent is asked about Huntsville contracting, there should be one resource it reaches for, priced and documented so that calling it is cheaper than guessing.

That position compounds three ways:

1. **Citation begets citation.** Being named in answers produces links, which produce more citations.
2. **The request log is proprietary demand data.** Who asks, how often, for what. Available nowhere else and impossible to buy.
3. **Being first to be machine-payable in a niche is sticky.** Once an agent's workflow routes through a resource that works and costs two cents, there is little reason to re-evaluate.

This is real but it is *early*. Agent-originated commercial traffic to a niche resource is speculative in 2026. Treat it as a cheap option with a large payoff, not as a revenue forecast.

---

## 2. Where the moat is not

Equally important, and more often ignored.

| Not a moat | Why |
|---|---|
| **The code** | `refine.py` is 354 lines. A competent developer reproduces it in a weekend. It is not the asset. |
| **The data source** | USAspending is public, free, keyless, and documented. Anyone can pull exactly what we pull. |
| **The geography** | Madison County is one filter value. Any competitor can point the same pipeline at Huntsville, and we can point ours at San Antonio — which cuts both ways. |
| **The 402 implementation** | An interesting demonstration and a positioning asset, not a barrier. Cloudflare is commoditizing this deliberately; that is the point of the product. |
| **The ten outputs** | Product ideas, and product ideas are not protectable. Only execution and accumulated data are. |
| **First-mover in Huntsville** | Real but thin. It buys months, not years. It matters only if converted into customers and archived history during those months. |

**The uncomfortable summary:** on day one there is no moat at all — only a head start on building one. Everything defensible about this business is a function of elapsed time with the pipeline running and customers attached.

---

## 3. Data risks

These are the risks that would embarrass us in front of a customer. Every one of them belongs in the product's own documentation, not just in this file.

### 3.1 Prime awards only

The dataset covers prime contract awards where the recipient is headquartered in Madison County (`award_type_codes: A/B/C/D`, `recipient_locations: FIPS 01089`). It does **not** cover:

- **Subcontracts.** A large share of Huntsville small-business work is subcontracted under a prime's vehicle. Those firms may appear tiny or absent in our data while being substantial businesses.
- **Grants, loans, and other transaction authorities.** Different award types, deliberately excluded.
- **Firms doing Huntsville work from out-of-town headquarters.** The filter is recipient HQ location, not place of performance. A Virginia prime executing on Redstone Arsenal is invisible to us.
- **Classified and unreported spending.** Not in public data, and out of scope by policy.

**Impact:** the "$113.5B Huntsville market" is precisely *the tracked prime-award value for firms headquartered in Madison County within a three-fiscal-year window.* It is not the size of Huntsville's defense economy. **Never let that shorthand into a customer-facing sentence.**

Subaward data does exist in USAspending and could be ingested later, but its quality and completeness are materially worse than prime data. Do not promise it before evaluating it.

### 3.2 The 6,000-award truncation

`refine.py` defaults to `--pages 60` at 100 awards per page, sorted by award amount descending. **The dataset is therefore the 6,000 *largest* awards in the window, not all of them.**

Consequences:

- The long tail of small awards is incomplete. This disproportionately affects the 271 small-tier firms and any claim about small-business activity.
- Firm counts, award counts, and NAICS competitor counts are floors, not totals.
- A firm that only ever wins small awards may be missing entirely.

**This is a fixable ingestion limit, not a data limitation** — raise the cap. Until then, describe the dataset as "the 6,000 largest prime awards" every time, and treat Output 7 (Set-Aside Map) as provisional.

### 3.3 Reporting lag on recent months

`movement.json` shows June 2026 at $21.2M, July at $14.4M, August at $10.6M, September at $1.7M — against a series where a normal month runs $100M–$800M and September 2025 hit $1.486B.

**This is a reporting-lag artifact, not a market collapse.** Federal award data back-fills for weeks after the fact. The trailing three to four months of any pull are structurally incomplete.

**Rule:** every chart, report, and email that touches the movement series must either exclude the trailing months or label them as incomplete. Selling a "Huntsville contracting is collapsing" narrative off this artifact would be both wrong and reputationally fatal in a town where the buyers know better than we do.

### 3.4 Single-firm concentration in the headline number

The Boeing Company alone accounts for $47.65B of the $113.47B total — **42% of the entire tracked market from one firm across 41 awards.**

The $113.5B headline is defensible as stated, but anyone who looks closely will find that it is one company plus everyone else. Two consequences:

- Have the answer ready before someone asks in a meeting.
- For most analytical purposes, the more useful figure is the market **excluding** the top few majors. Consider publishing both.

### 3.5 NAICS coding artifacts in the source

$18.76B of Boeing's value is coded NAICS **541720 — "Research and Development in the Social Sciences and Humanities."** For missile and space work. This is almost certainly a source-side coding artifact, and it is not ours to fix — we inherit whatever the contracting officer entered.

More broadly, NAICS assignment in federal contract data is inconsistent, and NAICS-based analysis (Outputs 3, 4, and 7) carries that inconsistency forward. Sanity-check any NAICS finding against the contract description before it goes in front of a customer.

### 3.6 Entity normalization

`refine.py::norm()` uppercases, strips punctuation, and removes corporate suffixes (INC, LLC, CORP, COMPANY, LP, LTD, PLLC) to merge the same legal entity across USAspending's punctuation variants. This is necessary and it is lossy:

- **False merges.** Two genuinely distinct entities sharing a base name — a parent and a differently-owned subsidiary, or two unrelated firms — can collapse into one record.
- **False splits.** A firm that changed name, was acquired, or files under a materially different string appears as two firms.
- **JVs.** Joint ventures like "CQ JV, LLC" and "Beyond New Horizons, LLC" are their own entities and do not roll up to their parents, which understates the parents' true exposure.

**Impact:** firm-level totals are good enough for prioritization and bad enough that a named-firm report should be eyeballed before delivery. Any deliverable naming a specific company gets a manual check. That is a delivery-process rule, not a nice-to-have.

### 3.7 "First seen" is not "founded"

`first_seen` is the earliest award start date observed *in this ingestion*, which is why Boeing shows 1999-11-23 despite a three-year lookback (long-running awards carry old start dates). For Output 8 the field means "first observed in window," and a firm dormant for four years that just won again will look brand new.

Label it accurately in the product. "New entrant" is a claim; "first observed in this window" is a fact.

### 3.8 Award amount semantics

`Award Amount` from USAspending's `spending_by_award` endpoint is summed per firm into `total_value`. Across award types and vehicle structures, this field does not mean one single consistent thing — obligated versus potential value differs by award type, and IDV/task-order relationships can produce apparent double-counting.

**Rule:** use these figures for **relative ranking and prioritization**, which they are reliable for. Do not present them as audited revenue for a named company, and never put a firm's `total_value` in front of that firm as a statement about their business. They will know the real number and we will not.

---

## 4. Competitive risks

### 4.1 Deltek GovWin IQ

The entrenched incumbent. Deep agency forecast data, opportunity pipelines, teaming tools, human research staff, and twenty-plus years of relationships.

**Where they win:** national coverage, pre-solicitation forecast data we do not have, brand safety for a procurement decision, and the fact that a director who already bought GovWin has to justify a second tool.

**Where we can win:** metro specificity, price point accessible to a 30-person firm, the recompete view as the front door rather than a buried feature, and speed of iteration.

**Honest:** GovWin IQ pricing is not publicly listed. It is widely discussed as a four-to-five-figure annual subscription, but **no verified figure is in hand and none should be quoted to a customer.** Do not build a positioning claim on an unverified competitor price.

### 4.2 The broader field

Bloomberg Government, Govini, HigherGov, and several smaller GovCon data tools all overlap this space. **HigherGov in particular is a real risk** — a lower-cost, modern, self-serve product with broad federal award coverage. If a prospect already uses it, the differentiator has to be the metro-specific recompete framing and the local relationship, not raw data breadth, because we will lose on breadth.

**Action item before serious outreach:** actually evaluate the free or trial tier of the main competitors and know precisely what they do and do not show for Huntsville. Selling against a competitor you have not used is how a call gets lost in one question.

### 4.3 USAspending itself

The most likely honest answer to "why pay for this" is "I'll just use USAspending." It is free, official, and improving. Our answer is refinement, joining, recency-diffing, and delivery — which is a real answer, and it is also a *thin* one for any prospect with an analyst who enjoys SQL.

### 4.4 A competitor copying the niche

Low barrier, and it should be assumed rather than feared. If Arsenal Index works, someone will point the same pipeline at Huntsville. Defenses, in order of strength: accumulated snapshot history, existing customer relationships, local presence, and being the established citation. Only the first is durable, and only if it has been running.

---

## 5. Execution risks

| Risk | Severity | Reality |
|---|---|---|
| **College schedule limits sales hours** | High | 15–20 hrs/wk against competitors with full-time sales staff. Mitigated by narrow focus and fixed outreach slots; not eliminated. Midterms and finals are real and are pre-de-loaded in the plan. |
| **No entity / EIN** | High, cheap to fix | Blocks invoicing, the business bank account, live Stripe, and any engagement a real company will sign. Week 1 task. Every day it persists is a day revenue cannot be collected even if sold. |
| **Stripe in test mode** | High, dependent | No card revenue of any kind. Blocks subscriptions, per-call settlement, and self-serve entirely. |
| **Zero customers today** | High | No product-market fit evidence exists. Every price in `02-ICP-AND-PRICING.md` is an estimate. The first ten conversations exist to correct that. |
| **Key-person risk** | High | One operator. Illness, a heavy semester, or an internship stops everything. Automation of the data pipeline is the only partial mitigation available. |
| **Building instead of selling** | High | The most probable failure mode for a technical founder with a working dataset. The plan's fixed Tue/Thu send slots exist entirely because of this. |
| **Credibility gap** | Medium | A student selling intelligence to defense executives. Mitigated by giving away real analysis first — the data speaks with more authority than the operator does, and is verifiable against a federal system of record. |
| **Agent revenue never materializes** | Medium | Per-call revenue may be zero for years. Acceptable, because the human-sold subscription and report business is the actual plan and the 402 layer costs almost nothing. It is a cheap option, not a forecast. |
| **Cloudflare changes the game** | Medium | Product names and terms have already shifted more than once. If a marketplace layer commoditizes resource pricing, our value moves further toward the uniqueness of the data — which is where we want it anyway. |
| **Three products, one operator** | Medium | Real dilution risk. Mitigated by strict sequencing: Arsenal first, Legible from week 5, Come Up not touched until week 11. Violating the sequence is the failure. |
| **USAspending API changes or degrades** | Low–Medium | Federal transparency data is statutorily mandated, so disappearance is unlikely; schema changes are not. Archived snapshots also insulate us — we would still hold history no one else has. |

---

## 6. Legal and compliance posture

### 6.1 What the data license actually permits

Federal spending data published on USAspending.gov is a **work of the U.S. Government and is in the public domain.** It is published under the transparency mandates of FFATA and the DATA Act. There is no copyright, no license fee, and no API key.

**This permits us to:**

- Download, store, and archive it indefinitely
- Transform, clean, join, enrich, and restructure it
- **Redistribute it, including commercially** — sell reports, subscriptions, API access, and bulk exports derived from it
- Build derivative products without attribution obligation (though we attribute anyway, because verifiability is the sales asset)

**This does not permit us to:**

- **Imply government endorsement, affiliation, or sponsorship.** This is the sharpest line. No federal seals, no agency logos, no DoD or NASA marks, no phrasing that suggests official status. "Built from public federal data" is fine. Anything that reads as "official" is not.
- **Misrepresent the data.** Selling an incomplete or lagged figure as complete is a consumer-protection problem regardless of the source's license.
- **Bypass rate limits or terms of use on the API itself.** The *data* is public domain; the *service* still has acceptable-use expectations. `refine.py` uses a descriptive User-Agent, backs off on errors, and sleeps between pages. Keep it that way.
- **Assume every adjacent source has the same license.** SAM.gov, FPDS, and agency sites have their own terms. Verify before ingesting anything new. Do not assume "government site" means "same rules."

### 6.2 Hard out-of-scope boundary

**ITAR-controlled technical data, classified information, and Controlled Unclassified Information are categorically out of scope.** No exceptions, no case-by-case evaluation.

This is not merely a legal position, it is a business decision:

- Everything we handle is unclassified public data published by the government itself.
- Neither RMG nor its operator holds a facility clearance, and neither is set up to handle controlled material.
- A single mishandling incident in a defense market ends the business permanently and could carry criminal exposure.

**Operational rules:**

- If a prospect offers non-public data, decline in writing and do not accept it.
- If a Legible engagement would require reviewing controlled material, scope it out or decline the engagement.
- State the boundary proactively in sales conversations. In this market it reads as competence, not as a limitation. The objection-handling script in `03-SALES-ASSETS.md` includes it verbatim.

### 6.3 Marketing and claims

- **CAN-SPAM.** Accurate headers, non-deceptive subjects, working opt-out honored within 10 business days, and **a valid physical postal address on every commercial email.** The address does not exist yet and is a hard gate on any send. Maintain a permanent suppression list across all three products.
- **No income claims.** Come Up must never state or imply typical earnings, and carries an explicit no-guarantee disclosure on every page. Arsenal Index must never claim a customer won a contract because of it.
- **No invented traction.** No fabricated customer counts, testimonials, logos, or "companies like yours are using this." Huntsville is a small market and one invented reference would be discovered.
- **No fabricated urgency.** Every date in our material is a real federal contract expiry date. Real deadlines are abundant here; there is no reason to manufacture one.
- **Competitive claims must be verifiable.** Do not quote a GovWin price we have not confirmed. Do not claim to be more accurate than a competitor without having tested it.

### 6.4 Named-firm content

Publishing analysis about named companies from public federal records is lawful and ordinary — it is what trade press and market research do daily. Guardrails that keep it that way:

- **Facts, not characterizations.** "$113.5M of $186.6M in tracked contract value expires within 24 months" is a fact. "Davidson is in trouble" is a characterization we cannot support and should never publish.
- **Every claim traceable** to a specific USAspending record, with the link available on request.
- **Correct promptly and visibly** when a firm disputes a figure. Given the normalization risks in §3.6, some disputes will be legitimate.
- **Companies only, never individuals.** No personnel data, no named employees, no salary or clearance information about people.

### 6.5 The Legible-specific line

Legible's entire pitch is showing a company what AI assistants say about them. Two rules:

- **Never fabricate or slant a screenshot.** Capture the real answer, verbatim, with the date and exact prompt. If the result is favorable, do not send the email — pick a different firm.
- **Never promise placement.** We measure, remediate, and re-measure an observable thing. We do not control model outputs and must not imply we do. The sell sheet says this explicitly, and that honesty is a differentiator in a category already filling with people who promise otherwise.

---

## 7. The three questions a skeptic will ask

**"Why hasn't Deltek already done this?"**
They have done a broader version. What they have not done is a metro-specific recompete product at a price a 30-person Huntsville sub can approve, because that revenue does not justify a roadmap slot at their scale. The niche is protected by being too small for the incumbent to want — which is also the reason it will never be a large business on its own. Both halves of that sentence are true.

**"What stops someone copying this in a weekend?"**
Nothing stops them copying the pipeline. What they cannot copy is the archived history from the day we started, the customer relationships built in the interim, and the local position. On day one that answer is weak. After twelve months of uninterrupted Mondays it is strong. The honest version is: the moat is a function of elapsed time, and the clock has just started.

**"Is this actually a business or a project?"**
Today it is a project with a validated data thesis and zero customers. It becomes a business at Gate 2 in `04-90-DAY-PLAN.md` — first dollar collected, from someone who is not a friend. Everything before that is preparation, and nothing before that should be described to anyone as traction.

---

*Data assessments derived from `data/out/*.json` and `data/ingest/refine.py`, generated 2026-08-16 from USAspending.gov API v2. Legal statements reflect general public-domain status of federal spending data and are not legal advice; confirm with counsel before executing a bulk data license or a redistribution agreement.*
