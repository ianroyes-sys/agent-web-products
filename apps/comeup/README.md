# Come Up

**You already know enough. This tells you what to do with it.**

One archive, one painful job, one workflow.

The job: *you have a skill and no plan — turn what you already know into a paid offer, and get your
first 30 days.* You paste your situation and the app returns the wedge, the customer, the first offer
with a price, the first distribution channel, and the one thing to validate this week, plus a
four-week board and the conditions under which you should stop. Every section cites the specific
archive pieces it drew on.

This is deliberately **not** "chat with an expert." A chat box is too broad to be a product, and
pouring an archive into a vector store is a search box with confidence. The value here is the
structure: the archive is classified across six axes and retrieval selects on tags before it ever
looks at text.

A **Royz Media Group** company. Part of the Agent Internet product line, alongside Arsenal Index and
Legible.

---

## Run it

```bash
npm install
npm run ingest      # rebuild src/data/archive.json from source (optional — the output is committed)
npm run dev         # http://localhost:4803
npm run build
```

`src/data/archive.json` is committed, so the app builds, runs and deploys with no filesystem access,
no network and no database. `npm run ingest` only needs to run when the sources change.

### Environment

Everything is optional. Nothing breaks without it.

| Variable | Effect when set | Behaviour when unset |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | `/plan` is composed by `claude-sonnet-5`, grounded strictly in the retrieved items | The deterministic template engine runs and the result is labelled `template` |
| `STRIPE_SECRET_KEY` | Paid tiers open Stripe Checkout (**test mode only** right now) | The same buttons capture a waitlist email instead of a broken checkout |
| `NEXT_PUBLIC_SITE_URL` | Used in `llms.txt`, the MCP descriptor, canonical URLs and Stripe redirects | Falls back to `http://localhost:4803` |

Waitlist entries are currently written to the server log as a single JSON line
(`{"event":"comeup.waitlist",...}`). Wire a real store before this takes real signups.

---

## The archive pipeline

Three stages, split so that only the first one needs a machine with the source material on it.

### 1. Extract — `scripts/build-archive.mjs`

Zero-dependency Node. Reads the real sources, redacts as a safety net, and writes raw records to
`src/data/archive.json`. A missing source produces a warning, never a crash.

| Source | Where it comes from |
| --- | --- |
| Everything But College | `~/Developer/everything-but-college` — the finished long-form essay (split per section), six Field Notes drafts, the Ledger template, the compiled 30-day timeline, the money plan, the 28-note bank, and the publication brief |
| Substack, published | `ianroyz.substack.com` public archive API, fetched at ingest time. Paywalled posts contribute title, subtitle and link only |
| The Channel | `~/Developer/omega/data/vlog.json` — the thesis, three layers, five rules, the funnel and twelve episode ideas |
| Ledger | `~/Developer/omega/data/business.json` — the hand-maintained revenue record |
| Build log | `data/seed/build-lessons.json` — lessons distilled by hand from a private build record |

Flags: `--no-net` skips the Substack fetch, `--enrich` adds an optional model tagging pass when
`ANTHROPIC_API_KEY` is set (rule tags always stand on their own).

**Distilled vs published.** Anything not lifted from something publishable carries `derived: true`
and renders with a `distilled` marker everywhere it is cited, so a reader always knows whether they
can go and read the original. Sensitive material — identifiers, infrastructure references, client
names — is excluded at authoring time rather than redacted afterwards; `redact()` in the extractor is
the second line of defence, not the first.

### 2. Tag — `src/lib/archive/tag.ts`

Six axes, closed vocabularies, deterministic weighted keyword rules. No API key, no network.

| Axis | Vocabulary |
| --- | --- |
| `job` | find-wedge, pick-customer, price-offer, get-distribution, validate, first-client, ship-fast, stay-broke-proof, build-audience, keep-going |
| `topic` | idea, market, wedge, distribution, pricing, mvp, community, moat, examples |
| `audience` | student, solo-builder, creator, freelancer, agency-owner, first-time-founder, career-switcher |
| `example` | named concrete cases |
| `framework` | named reusable methods — return-equation, six-loops, money-ladder, zero-api-rule, cold-email-math… |
| `outcome` | first-invoice, recurring-revenue, shipped, app-store-rejection, no-reply, scrapped, pivoted… |

Each axis has a score floor and a cap, so items don't end up tagged with everything. A hand-set
(seeded) axis is authoritative and the rules are skipped for it — curator routing decisions are not
quietly overridden by keyword matches.

### 3. Retrieve — `src/lib/archive/retrieve.ts`

Tag-first. A job match is worth 100, a topic 26, a framework 22, an audience 12, an outcome 10, and
text relevance is hard-capped at 20 — below a single topic match — so a keyword pile-up can never
outrank correct classification. If a query specifies tags and nothing matches, retrieval returns
nothing rather than padding with vaguely similar prose.

The plan runs **five separate queries, one per section**, threading an exclusion set so no item is
cited twice, and it varies the framework hints by the reader's actual constraints — someone with no
money and no publishing surface gets the cold-email arithmetic in the distribution slot, someone with
a list gets the publishing doctrine. That is the difference a vector dump cannot express.

## Adding a source

1. Add an extractor function in `scripts/build-archive.mjs` that pushes records via `add({...})` and
   calls `noteSource(...)` when it's done. Give each record an `id`, `title`, `kind`, `body`, and
   optional `pull`, `url`, `date` and `seedTags`.
2. Or, for hand-written material, append to `data/seed/build-lessons.json`.
3. Run `npm run ingest`, then `npm run build`.

New tag values must be added to the vocabularies in `src/lib/archive/types.ts` **and** given rules in
`src/lib/archive/tag.ts` — values outside the closed vocabulary are dropped at tag time on purpose.

---

## The agent layer

The creator gets paid when the knowledge is used, which only happens if other software can call it.

| Endpoint | What it does |
| --- | --- |
| `GET /llms.txt` | What this is, the one job, the archive shape, and the endpoints, in plain text |
| `GET /.well-known/mcp.json` | Machine-readable descriptor, including both transports |
| `POST /api/mcp` | MCP over JSON-RPC: `initialize`, `tools/list`, `tools/call` |
| `POST /api/v1/plan` | The workflow as JSON |
| `GET|POST /api/v1/archive/search` | Tag-first search, with `matchedOn` and the tag/text score split |

Two tools, and there will not be twelve: `search_archive` and `build_plan`.

```bash
curl -X POST http://localhost:4803/api/v1/plan \
  -H 'content-type: application/json' \
  -d '{"situation":"I can edit video and I have no clients","hoursPerWeek":8,"budget":0}'

curl "http://localhost:4803/api/v1/archive/search?job=price-offer&topic=pricing&limit=3"
```

### Claude Desktop

`mcp/server.mjs` is a zero-dependency stdio server that forwards to a running deployment. Add to
`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "comeup": {
      "command": "node",
      "args": ["/absolute/path/to/apps/comeup/mcp/server.mjs"],
      "env": { "COMEUP_ORIGIN": "https://your-deployment.example" }
    }
  }
}
```

Leave `COMEUP_ORIGIN` unset to talk to `http://localhost:4803`.

---

## Design

Shared house tokens from `../../brand/tokens.css`, copied into `src/app/globals.css`. Ink ground,
`--accent: #2e52ff` (RMG royal — this is the house-brand product, so it carries the parent accent
rather than a sibling colour). Space Grotesk and JetBrains Mono via `next/font/google`. The only
decorative device in the system is the diagonal cut; it appears in the wordmark, the section rules
and the empty state, and nowhere else.

## Deploying

Standard Next.js. `npm run build` needs no environment variables. Set `NEXT_PUBLIC_SITE_URL` on the
host so `llms.txt`, the MCP descriptor and the Stripe redirects carry the real origin. `npm run
ingest` is a local step — do not wire it into the build, since the sources only exist on the
maintainer's machine.

## Notes and limits

- Stripe is **test mode only**. Do not point a live key at this without reviewing the checkout flow
  and adding webhook handling — there is currently no subscription state, so the paid tiers gate
  nothing yet.
- The waitlist writes to the server log only.
- The `/plan` composer path requires `ANTHROPIC_API_KEY`; every failure mode falls back to the
  template engine and says so in the response.
