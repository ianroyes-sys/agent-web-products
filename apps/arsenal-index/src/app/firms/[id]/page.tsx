import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BandBadge from "@/components/BandBadge";
import BarList from "@/components/BarList";
import { Stat, SectionHead } from "@/components/Stat";
import { capabilityGap, firmPeers, firmRecompetes, getFirm, getFirms } from "@/lib/data";
import { band, daysOutLabel, num, pct, shortDate, tidy, usd, usdFull } from "@/lib/format";

/**
 * The whole directory is prerendered. 426 pages of static JSON is cheap and
 * it means an agent crawling the site never waits on a cold render.
 *
 * The firm set is closed — anything outside it is genuinely not in the index,
 * so unknown slugs 404 at the router instead of rendering a cached miss.
 */
export const dynamicParams = false;

export function generateStaticParams(): { id: string }[] {
  return getFirms().map((f) => ({ id: f.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const firm = getFirm(id);
  if (!firm) return { title: "Firm not found" };
  return {
    title: firm.name,
    description: `${firm.name}: ${usdFull(firm.total_value)} across ${firm.award_count} prime awards in the Huntsville defense market, led by ${firm.top_agency}.`,
  };
}

export default async function FirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const firm = getFirm(id);
  if (!firm) notFound();

  const expiring = firmRecompetes(firm);
  const gaps = capabilityGap(firm);
  const peers = firmPeers(firm);
  const activeShare = firm.total_value > 0 ? firm.active_value / firm.total_value : 0;
  const concentration =
    firm.total_value > 0 && firm.agencies.length > 0 ? firm.agencies[0].value / firm.total_value : 0;

  return (
    <div className="wrap-wide py-10 md:py-14">
      <nav className="mb-6 flex items-center gap-2 text-[12.5px] text-[var(--color-faint)]">
        <Link href="/firms" className="transition-colors hover:text-[var(--color-chalk)]">
          Firms
        </Link>
        <span>/</span>
        <span className="num">#{firm.rank}</span>
      </nav>

      <header className="fade-up">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="tag" style={{ color: "var(--accent)", borderColor: "var(--accent-line)" }}>
            {firm.tier}
          </span>
          <span className="pill">Rank #{firm.rank} of {num(getFirms().length)}</span>
          <span className="pill">
            Active {shortDate(firm.first_seen)} → {shortDate(firm.last_seen)}
          </span>
          {firm.expiring_count > 0 ? (
            <span className="pill" style={{ borderColor: "var(--accent-line)", color: "var(--accent)" }}>
              {firm.expiring_count} expiring
            </span>
          ) : null}
        </div>

        <h1 className="mt-5 max-w-[24ch] text-[clamp(28px,5vw,44px)] font-semibold leading-[1.06]">
          {firm.name}
        </h1>
        <p className="mt-4 max-w-[64ch] text-[15.5px] leading-[1.65] text-[var(--color-muted)]">
          {num(firm.award_count)} prime awards worth{" "}
          <span className="num text-[var(--color-chalk)]" title={usdFull(firm.total_value)}>
            {usd(firm.total_value)}
          </span>
          , led by {firm.top_agency}
          {concentration > 0.6
            ? ` — which is ${pct(concentration, 0)} of everything they hold, a single-customer profile.`
            : ` across ${firm.agencies.length} agencies.`}
        </p>
      </header>

      <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total awarded"
          value={usd(firm.total_value)}
          title={usdFull(firm.total_value)}
          sub={`${num(firm.award_count)} prime awards in the lookback.`}
        />
        <Stat
          label="Still active"
          value={usd(firm.active_value)}
          title={usdFull(firm.active_value)}
          accent
          sub={`${pct(activeShare, 0)} of their book has a live period of performance.`}
        />
        <Stat
          label="Expiring in 24mo"
          value={firm.expiring_count > 0 ? usd(firm.expiring_value) : "None"}
          title={firm.expiring_count > 0 ? usdFull(firm.expiring_value) : undefined}
          sub={
            firm.expiring_count > 0
              ? `${firm.expiring_count} contracts come up for recompete.`
              : "No periods of performance ending inside the window."
          }
        />
        <Stat
          label="NAICS footprint"
          value={num(firm.naics.length)}
          sub={`Distinct codes billed. Widest: ${firm.naics[0]?.code ?? "—"}.`}
        />
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <SectionHead eyebrow="Customer mix" title="Who buys from them" />
          <div className="mt-6">
            <BarList
              rows={firm.agencies.slice(0, 6).map((a) => ({ label: a.name, value: a.value }))}
            />
          </div>
          {firm.sub_agencies.length > 0 ? (
            <>
              <hr className="rule my-6" />
              <p className="eyebrow">Buying offices</p>
              <ul className="mt-3.5 space-y-2">
                {firm.sub_agencies.slice(0, 6).map((s) => (
                  <li key={s.name} className="flex items-baseline justify-between gap-4">
                    <span className="truncate text-[13.5px] text-[var(--color-body)]">{s.name}</span>
                    <span
                      className="num flex-none text-[12.5px] text-[var(--color-muted)]"
                      title={usdFull(s.value)}
                    >
                      {usd(s.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section className="card p-6">
          <SectionHead eyebrow="Capability" title="What they actually do" />
          <div className="mt-6">
            <BarList
              rows={firm.naics.slice(0, 6).map((n) => ({
                label: `${n.code} — ${n.label}`,
                value: n.value,
              }))}
              emptyLabel="No NAICS breakdown reported on these awards."
            />
          </div>
          {firm.psc.length > 0 ? (
            <>
              <hr className="rule my-6" />
              <p className="eyebrow">Product & service codes</p>
              <div className="mt-3.5 flex flex-wrap gap-2">
                {firm.psc.slice(0, 10).map((p) => (
                  <span key={p.code} className="tag" title={usdFull(p.value)}>
                    {p.code} · {usd(p.value)}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </section>
      </div>

      {/* Capability gap — the analytic payload of the page. */}
      <section className="mt-6">
        <div
          className="card overflow-hidden p-6"
          style={{ borderColor: "color-mix(in oklab, var(--accent) 22%, var(--color-line))" }}
        >
          <SectionHead
            eyebrow="Capability gap"
            title="Where this market spends and they do not compete"
            blurb={
              <>
                NAICS codes with real, multi-firm demand in {`${num(getFirms().length)}`}-firm
                Huntsville where {firm.name} has no recorded prime award. Adjacency, not advice — but
                it is the shortest list of places a teaming call is worth making.
              </>
            }
          />

          {gaps.length === 0 ? (
            <p className="mt-6 text-[14px] text-[var(--color-muted)]">
              No meaningful gap: this firm already holds awards across every high-volume NAICS code in
              the market.
            </p>
          ) : (
            <div className="scroll-x mt-6">
              <table className="tbl min-w-[720px]">
                <thead>
                  <tr>
                    <th style={{ width: 92 }}>NAICS</th>
                    <th>Category</th>
                    <th className="r" style={{ width: 120 }}>
                      Market value
                    </th>
                    <th className="r" style={{ width: 90 }}>
                      Firms in
                    </th>
                    <th style={{ width: 220 }}>Leader</th>
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((g) => (
                    <tr key={g.code}>
                      <td className="num text-[var(--accent)]">{g.code}</td>
                      <td className="max-w-[320px]">
                        <span className="block truncate text-[13.5px] text-[var(--color-body)]" title={g.label}>
                          {g.label}
                        </span>
                      </td>
                      <td className="num r text-[var(--color-chalk)]" title={usdFull(g.market_value)}>
                        {usd(g.market_value)}
                      </td>
                      <td className="num r text-[var(--color-body)]">{g.firm_count}</td>
                      <td className="max-w-[220px]">
                        <span className="block truncate text-[13px] text-[var(--color-muted)]">
                          {g.top_firm ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Their expiring work */}
      <section className="mt-6">
        <div className="card p-6">
          <SectionHead
            eyebrow="On the radar"
            title={
              expiring.length > 0
                ? `${expiring.length} contracts expiring inside 24 months`
                : "Nothing expiring in the window"
            }
            right={
              expiring.length > 0 ? (
                <Link href="/radar" className="btn btn-ghost h-9 text-[13px]">
                  Full radar
                </Link>
              ) : undefined
            }
          />

          {expiring.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--color-line)] px-6 py-12 text-center">
              <p className="text-[14px] text-[var(--color-muted)]">
                No award held by {firm.name} has a period of performance ending in the next 24 months.
                Either their book is long-dated, or the work already recompeted.
              </p>
            </div>
          ) : (
            <div className="scroll-x mt-6">
              <table className="tbl min-w-[760px]">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Window</th>
                    <th className="r" style={{ width: 110 }}>
                      Value
                    </th>
                    <th style={{ width: 110 }}>Expires</th>
                    <th>Scope</th>
                    <th style={{ width: 66 }} />
                  </tr>
                </thead>
                <tbody>
                  {expiring.slice(0, 25).map((r) => (
                    <tr key={r.award_id + r.end_date}>
                      <td>
                        <span className="flex items-center gap-2">
                          <BandBadge band={band(r.days_out)} compact />
                          <span className="num text-[12.5px]">{daysOutLabel(r.days_out)}</span>
                        </span>
                      </td>
                      <td className="num r text-[var(--color-chalk)]" title={usdFull(r.value)}>
                        {usd(r.value)}
                      </td>
                      <td className="num text-[12.5px]">{shortDate(r.end_date)}</td>
                      <td className="max-w-[380px]">
                        <span className="block truncate text-[13px] text-[var(--color-body)]">
                          {tidy(r.description) || r.naics_label}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-[var(--color-faint)]">
                          {r.sub_agency} · NAICS {r.naics}
                        </span>
                      </td>
                      <td className="r">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11.5px] text-[var(--color-muted)] transition-colors hover:text-[var(--accent)]"
                        >
                          Award
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {expiring.length > 25 ? (
                <p className="mt-4 text-[12.5px] text-[var(--color-faint)]">
                  Showing 25 of {expiring.length}. The rest are in the{" "}
                  <Link href="/radar" className="text-[var(--accent)]">
                    full radar
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {peers.length > 0 ? (
        <section className="mt-6">
          <div className="card p-6">
            <SectionHead
              eyebrow="Comparable"
              title="Closest peers by size"
              blurb="Same tier, nearest obligated value. The firms they lose to, team with, or get confused for."
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {peers.map((p) => (
                <Link
                  key={p.id}
                  href={`/firms/${p.id}`}
                  className="group rounded-xl border border-[var(--color-line)] bg-[var(--color-ink)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-line)]"
                >
                  <p className="num text-[11px] text-[var(--color-faint)]">#{p.rank}</p>
                  <p className="mt-1.5 line-clamp-2 text-[13.5px] font-medium text-[var(--color-chalk)]">
                    {p.name}
                  </p>
                  <p className="num mt-2 text-[13px] text-[var(--accent)]" title={usdFull(p.total_value)}>
                    {usd(p.total_value)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="card mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Agent access</p>
          <p className="mt-2 max-w-[54ch] text-[13.5px] leading-[1.6] text-[var(--color-muted)]">
            This profile is available as JSON at{" "}
            <code className="num text-[var(--color-chalk)]">/api/v1/firms/{firm.id}</code> and through
            the <code className="num text-[var(--color-chalk)]">get_firm</code> MCP tool.
          </p>
        </div>
        <Link href="/api-docs" className="btn btn-ghost flex-none">
          API reference
        </Link>
      </section>
    </div>
  );
}
