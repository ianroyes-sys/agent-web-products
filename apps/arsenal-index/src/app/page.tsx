import Link from "next/link";
import BandBadge from "@/components/BandBadge";
import CodeBlock from "@/components/CodeBlock";
import PricingTable from "@/components/PricingTable";
import { Stat, SectionHead } from "@/components/Stat";
import { getAgencies, getFirms, getMeta, getNaics, getRecompetes } from "@/lib/data";
import { band, daysOutLabel, num, shortDate, tidy, usd, usdFull } from "@/lib/format";

const STAGES: { step: string; title: string; body: string }[] = [
  {
    step: "01",
    title: "Pull the mess",
    body: "Every prime award record for the market out of USAspending — 6,000 rows of inconsistent recipient names, duplicated parents, and free-text scope.",
  },
  {
    step: "02",
    title: "Resolve the entities",
    body: "Collapse name variants into firms, keep subsidiaries distinct, attach agency, sub-agency, NAICS and PSC rollups, and trace every dollar back to an award ID.",
  },
  {
    step: "03",
    title: "Compute what matters",
    body: "Period-of-performance end dates become a 24-month recompete radar. NAICS coverage becomes a capability gap. Raw data becomes an answer.",
  },
  {
    step: "04",
    title: "Open clean doors",
    body: "REST with provenance on every response, llms.txt, an MCP server, and an HTTP 402 handshake so an agent can pay for the paid half without a human in the loop.",
  },
];

/**
 * Carries the pricing CTAs, whose shape depends on the Stripe env at render
 * time. Same reasoning as /api-docs: ISR so the CTA re-resolves on the server
 * instead of being frozen into a build artifact.
 */
export const revalidate = 300;

export default function Home() {
  const meta = getMeta();
  const recompetes = getRecompetes();
  const firms = getFirms();
  const agencies = getAgencies();
  const naics = getNaics();

  const teaser = recompetes.slice(0, 6);
  // Inclusive upper bound, matching the ?days= API filter and the published
  // figures in docs/. An off-by-one here means the site and the outreach quote
  // different numbers, which is the one mistake a data product cannot make.
  const hot = recompetes.filter((r) => r.days_out <= 90);

  return (
    <>
      {/* ---------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-[var(--color-line)]">
        <div className="grid-ground" />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-[0.14]"
          style={{ background: "radial-gradient(circle, var(--accent), transparent 62%)" }}
        />

        <div className="wrap-wide relative py-16 md:py-24">
          <div className="fade-up flex flex-wrap items-center gap-2.5">
            <span className="pill pill-live">
              <span className="dot" />
              Index live · {meta.generated}
            </span>
            <span className="pill">{meta.market}</span>
            <span className="pill">Public-domain source</span>
          </div>

          <h1 className="fade-up mt-7 max-w-[19ch] text-[clamp(38px,7.6vw,74px)] font-semibold leading-[0.98] tracking-[-0.03em]">
            The resource layer for Huntsville defense contracting.
          </h1>

          <p className="fade-up mt-6 max-w-[62ch] text-[clamp(16px,2vw,19px)] leading-[1.6] text-[var(--color-muted)]">
            One niche&rsquo;s messy internet, refined into clean fuel for agents.{" "}
            <span className="num text-[var(--color-chalk)]">{num(meta.raw_awards)}</span> raw federal
            award records became{" "}
            <span className="num text-[var(--color-chalk)]">{num(meta.firm_count)}</span> resolved
            firms, a live recompete radar, and an API a machine can pay for by itself.
          </p>

          <div className="fade-up mt-9 flex flex-wrap gap-3">
            <Link href="/radar" className="btn btn-primary">
              Open the recompete radar
            </Link>
            <Link href="/api-docs" className="btn btn-ghost">
              Read the API
            </Link>
          </div>

          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Firms tracked"
              value={num(meta.firm_count)}
              sub={`Prime recipients headquartered in market, ranked to #${firms.length}.`}
            />
            <Stat
              label="Market value"
              value={usd(meta.market_value)}
              title={usdFull(meta.market_value)}
              sub={`${meta.lookback_fy} fiscal years of obligated prime awards.`}
            />
            <Stat
              label="Expiring in 24mo"
              value={num(meta.recompete_count)}
              accent
              sub={`Worth ${usd(meta.recompete_value)}. This is the whole product.`}
            />
            {/* Matches the radar's Hot band, the ?days=90 API filter, and the
                published figure in docs/ — all inclusive of day 90. */}
            <Stat
              label="Inside 90 days"
              value={num(hot.length)}
              sub="Contracts expiring within the next 90 days, inclusive."
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Thesis */}
      <section className="wrap-wide py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="eyebrow">The thesis</p>
            <h2 className="mt-3 max-w-[20ch] text-[clamp(26px,4.2vw,42px)] font-semibold leading-[1.08]">
              The human web monetized attention. The agent web monetizes useful resources.
            </h2>
          </div>

          <div className="prose-block max-w-[58ch] self-end">
            <p>
              For twenty years the way to make money online was to interrupt a person: sell the
              impression, sell the click, sell the ad next to the answer. That business needs eyeballs,
              and agents do not have eyeballs.
            </p>
            <p>
              What an agent has is a task and a budget. It does not want a page — it wants a fact it can
              act on, with provenance, fresh enough to trust, in a shape it can parse on the first try.
              It will happily pay two cents for that and skip the site entirely.
            </p>
            <p>
              So the asset is no longer traffic. The asset is a refined, defensible slice of the world
              that nobody else has bothered to clean up. Arsenal Index is one slice: every dollar of
              prime contracting flowing through the Huntsville defense corridor, refined until a machine
              can act on it.
            </p>
          </div>
        </div>

        {/* Refinery pipeline */}
        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s) => (
            <div key={s.step} className="bg-[var(--color-surface)] p-6">
              <span className="num text-[11px] tracking-[0.14em] text-[var(--accent)]">{s.step}</span>
              <h3 className="mt-3 text-[16px] font-semibold">{s.title}</h3>
              <p className="mt-2.5 text-[13.5px] leading-[1.6] text-[var(--color-muted)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------- Radar teaser */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-ink)]">
        <div className="wrap-wide py-20 md:py-24">
          <SectionHead
            eyebrow="The killer feature"
            title="The recompete radar"
            blurb={
              <>
                A contract with an end date is a seat that is about to be empty.{" "}
                <span className="num text-[var(--color-chalk)]">{num(meta.recompete_count)}</span> of
                them expire in the next 24 months, carrying{" "}
                <span className="num text-[var(--color-chalk)]" title={usdFull(meta.recompete_value)}>
                  {usd(meta.recompete_value)}
                </span>
                . Sorted by how soon you have to move.
              </>
            }
            right={
              <Link href="/radar" className="btn btn-ghost">
                Open the full radar
              </Link>
            }
          />

          <div className="card mt-9 overflow-hidden">
            <div className="scroll-x">
              <table className="tbl min-w-[760px]">
                <thead>
                  <tr>
                    <th style={{ width: 108 }}>Window</th>
                    <th>Incumbent</th>
                    <th className="r" style={{ width: 110 }}>
                      Value
                    </th>
                    <th style={{ width: 112 }}>Expires</th>
                    <th>Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {teaser.map((r) => (
                    <tr key={r.award_id + r.end_date}>
                      <td>
                        <span className="flex items-center gap-2">
                          <BandBadge band={band(r.days_out)} compact />
                          <span className="num text-[12.5px] text-[var(--color-body)]">
                            {daysOutLabel(r.days_out)}
                          </span>
                        </span>
                      </td>
                      <td className="max-w-[240px]">
                        <Link
                          href={`/firms/${r.incumbent_key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                          className="block truncate font-medium text-[var(--color-chalk)] transition-colors hover:text-[var(--accent)]"
                          title={r.incumbent}
                        >
                          {r.incumbent}
                        </Link>
                      </td>
                      <td className="num r text-[var(--color-chalk)]" title={usdFull(r.value)}>
                        {usd(r.value)}
                      </td>
                      <td className="num text-[12.5px] text-[var(--color-body)]">
                        {shortDate(r.end_date)}
                      </td>
                      <td className="max-w-[320px]">
                        <span className="block truncate text-[13px] text-[var(--color-body)]">
                          {tidy(r.description) || r.naics_label}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-[var(--color-faint)]">
                          {r.sub_agency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--color-line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12.5px] text-[var(--color-muted)]">
                Showing the 6 most urgent of{" "}
                <span className="num text-[var(--color-chalk)]">{num(meta.recompete_count)}</span>.
                Fifteen rows are free, forever.
              </p>
              <Link href="/radar" className="btn btn-primary h-9 text-[13px]">
                See all {num(meta.recompete_count)}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Agent layer */}
      <section className="wrap-wide py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div>
            <SectionHead
              eyebrow="Built for machines first"
              title="Clean doors, not a nicer website"
              blurb="A human-readable page is the byproduct here. The product is a set of surfaces an agent can find, parse, trust, and pay for without ever rendering a pixel."
            />

            <ul className="mt-8 space-y-5">
              {[
                {
                  t: "REST with provenance",
                  d: "Six endpoints, every response carrying generated, source, market, and license so an agent can judge freshness before it acts.",
                },
                {
                  t: "llms.txt",
                  d: "A plain-text map of the whole resource at the root, so a crawler learns the shape of the index in one request.",
                },
                {
                  t: "MCP, two ways",
                  d: "A streamable-HTTP endpoint at /api/mcp and a zero-dependency stdio server for Claude Desktop. Five tools, no SDK.",
                },
                {
                  t: "HTTP 402",
                  d: "Ask for a paid resource without credentials and you get a machine-readable price and a retry hint, not a signup wall.",
                },
              ].map((item) => (
                <li key={item.t} className="flex gap-4">
                  <span
                    className="mt-[7px] h-[7px] w-[7px] flex-none rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                  <div>
                    <p className="text-[14.5px] font-medium text-[var(--color-chalk)]">{item.t}</p>
                    <p className="mt-1 max-w-[46ch] text-[13.5px] leading-[1.6] text-[var(--color-muted)]">
                      {item.d}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <Link href="/api-docs" className="btn btn-ghost mt-8">
              Full API reference
            </Link>
          </div>

          <div className="space-y-4">
            <CodeBlock label="Free tier — market summary">
{`$ curl https://arsenal-index.com/api/v1/market

{
  "meta": {
    "generated": "${meta.generated}",
    "source": "USAspending.gov API v2",
    "market": "Huntsville / Madison County, Alabama",
    "tier": "free"
  },
  "data": {
    "market_value": ${Math.round(meta.market_value)},
    "firm_count": ${meta.firm_count},
    "recompete_count": ${meta.recompete_count},
    "agencies": ${agencies.length},
    "naics": ${naics.length}
  }
}`}
            </CodeBlock>

            <CodeBlock label="Paid tier — the 402 handshake" tone="accent">
{`$ curl -i https://arsenal-index.com/api/v1/recompetes?limit=500

HTTP/1.1 402 Payment Required
WWW-Authenticate: x402 realm="arsenal-index", price="0.02"

{
  "error": "payment_required",
  "price": { "amount": 0.02, "currency": "USD", "unit": "call" },
  "accepts": ["x402", "api_key"],
  "schemes": {
    "api_key": { "status": "available" },
    "x402":    { "status": "pending"   }
  },
  "docs": "/api-docs"
}`}
            </CodeBlock>

            <p className="text-[12px] leading-[1.6] text-[var(--color-faint)]">
              The handshake is live and returns the price today. Settlement is the part that is
              staged: keys on a Stripe subscription work now, and per-lookup x402 opens when
              Cloudflare&rsquo;s Monetization Gateway does — it is waitlist-only, not generally
              available.{" "}
              <Link href="/api-docs#payment" className="text-[var(--accent)]">
                Both rails, side by side
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Pricing */}
      <section id="pricing" className="border-t border-[var(--color-line)] bg-[var(--color-ink)]">
        <div className="wrap-wide py-20 md:py-24">
          <SectionHead
            eyebrow="Pricing"
            title="Free to look. Paid to act on it."
            blurb="Aggregates stay open because they make the index discoverable. The row-level radar is the thing worth money, so that is the thing behind the key."
          />
          <div className="mt-10">
            <PricingTable />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- CTA */}
      <section className="wrap-wide py-20 md:py-28">
        <div
          className="relative overflow-hidden rounded-3xl border p-8 md:p-14"
          style={{
            borderColor: "var(--accent-line)",
            background:
              "linear-gradient(135deg, color-mix(in oklab, var(--accent) 11%, var(--color-surface)), var(--color-ink))",
          }}
        >
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-[340px] w-[340px] rounded-full opacity-25"
            style={{ background: "radial-gradient(circle, var(--accent), transparent 65%)" }}
          />
          <div className="relative max-w-[46ch]">
            <p className="eyebrow">Start here</p>
            <h2 className="mt-3 text-[clamp(26px,4.4vw,40px)] font-semibold leading-[1.08]">
              {num(meta.recompete_count)} contracts are about to come up for grabs.
            </h2>
            <p className="mt-4 text-[15.5px] leading-[1.65] text-[var(--color-muted)]">
              The first fifteen are open right now — no key, no signup, no email. Look at what is
              expiring in your NAICS this quarter and decide whether the rest is worth two cents.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/radar" className="btn btn-primary">
                Open the radar
              </Link>
              <Link href="/firms" className="btn btn-ghost">
                Browse {num(meta.firm_count)} firms
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
