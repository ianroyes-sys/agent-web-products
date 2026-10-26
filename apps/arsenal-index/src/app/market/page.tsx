import type { Metadata } from "next";
import Link from "next/link";
import BarList from "@/components/BarList";
import MovementChart from "@/components/MovementChart";
import { Stat, SectionHead } from "@/components/Stat";
import { getAgencies, getFirms, getMeta, getMovement, getNaics } from "@/lib/data";
import { monthLabel, num, pct, usd, usdFull } from "@/lib/format";

export const metadata: Metadata = {
  title: "Market structure",
  description:
    "Agency mix, NAICS concentration, and monthly obligation movement for the Huntsville defense contracting market.",
};

export default function MarketPage() {
  const meta = getMeta();
  const agencies = getAgencies();
  const naics = getNaics();
  const movement = getMovement();
  const firms = getFirms();

  const top5Share =
    firms.slice(0, 5).reduce((s, f) => s + f.total_value, 0) / (meta.market_value || 1);
  const peak = movement.reduce(
    (best, p) => (p.value > best.value ? p : best),
    movement[0] ?? { month: "", value: 0 },
  );
  const trailing12 = movement.slice(-12).reduce((s, p) => s + p.value, 0);
  const prior12 = movement.slice(-24, -12).reduce((s, p) => s + p.value, 0);
  const yoy = prior12 > 0 ? trailing12 / prior12 - 1 : 0;

  return (
    <div className="wrap-wide py-10 md:py-14">
      <header className="fade-up max-w-[70ch]">
        <p className="eyebrow">Market structure</p>
        <h1 className="mt-3 text-[clamp(30px,5.4vw,48px)] font-semibold leading-[1.06]">
          Where the money actually sits
        </h1>
        <p className="mt-4 text-[16px] leading-[1.65] text-[var(--color-muted)]">
          {meta.scope} in {meta.market}, over {meta.lookback_fy} fiscal years. Three views: who buys,
          what they buy, and when they buy it.
        </p>
      </header>

      <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Market value"
          value={usd(meta.market_value)}
          title={usdFull(meta.market_value)}
          accent
          sub={`${num(meta.raw_awards)} award records refined into ${num(meta.firm_count)} firms.`}
        />
        <Stat
          label="Top-5 share"
          value={pct(top5Share, 0)}
          sub="Concentration held by the five largest primes. Above 50% is an oligopoly."
        />
        <Stat
          label="Trailing 12mo"
          value={usd(trailing12)}
          title={usdFull(trailing12)}
          sub={
            prior12 > 0
              ? `${yoy >= 0 ? "+" : ""}${pct(yoy, 0)} against the prior twelve months.`
              : "No comparable prior period in the window."
          }
        />
        <Stat
          label="Peak month"
          value={peak.month ? monthLabel(peak.month) : "—"}
          sub={peak.month ? `${usd(peak.value)} obligated — typically fiscal year-end.` : undefined}
        />
      </div>

      <section className="card mt-12 p-6">
        <SectionHead
          eyebrow="Movement"
          title="Monthly obligated value"
          blurb="Federal money moves on the fiscal calendar. The September spikes are use-it-or-lose-it obligation, not demand — plan capture around the trough, not the peak."
        />
        <div className="mt-7">
          <MovementChart points={movement} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <SectionHead
            eyebrow="Demand side"
            title="Agency mix"
            blurb={`${agencies.length} funding agencies appear in the market.`}
          />
          <div className="mt-6">
            <BarList
              rows={agencies.slice(0, 8).map((a) => ({
                label: a.name,
                value: a.value,
                hint: `${num(a.award_count)} awards · ${num(a.firm_count)} firms`,
              }))}
            />
          </div>
        </section>

        <section className="card p-6">
          <SectionHead
            eyebrow="Supply side"
            title="Largest primes"
            blurb="By total obligated value across the lookback."
          />
          <div className="mt-6">
            <BarList
              rows={firms.slice(0, 8).map((f) => ({
                label: f.name,
                value: f.total_value,
                href: `/firms/${f.id}`,
                hint: `${num(f.award_count)} awards · ${f.top_agency}`,
              }))}
            />
          </div>
        </section>
      </div>

      <section className="card mt-6 p-6">
        <SectionHead
          eyebrow="Concentration"
          title="NAICS categories by value"
          blurb="Concentration is the share of the market a single code represents. A high-value code with few firms in it is an opening; a high-value code with forty firms is a knife fight."
          right={
            <Link href="/firms" className="btn btn-ghost h-9 text-[13px]">
              Browse firms
            </Link>
          }
        />

        <div className="scroll-x mt-7">
          <table className="tbl min-w-[760px]">
            <thead>
              <tr>
                <th style={{ width: 92 }}>NAICS</th>
                <th>Category</th>
                <th className="r" style={{ width: 120 }}>
                  Value
                </th>
                <th className="r" style={{ width: 92 }}>
                  Awards
                </th>
                <th className="r" style={{ width: 80 }}>
                  Firms
                </th>
                <th style={{ width: 160 }}>Share of market</th>
              </tr>
            </thead>
            <tbody>
              {naics.slice(0, 20).map((n) => {
                const share = n.value / (meta.market_value || 1);
                return (
                  <tr key={n.code}>
                    <td className="num text-[var(--accent)]">{n.code}</td>
                    <td className="max-w-[340px]">
                      <span className="block truncate text-[13.5px] text-[var(--color-body)]" title={n.label}>
                        {n.label}
                      </span>
                    </td>
                    <td className="num r text-[var(--color-chalk)]" title={usdFull(n.value)}>
                      {usd(n.value)}
                    </td>
                    <td className="num r text-[var(--color-body)]">{num(n.award_count)}</td>
                    <td className="num r text-[var(--color-body)]">{num(n.firm_count)}</td>
                    <td>
                      <span className="flex items-center gap-2.5">
                        <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-[var(--color-line-soft)]">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${Math.max(share * 100 * 3, 2)}%`,
                              maxWidth: "100%",
                              background: "var(--accent)",
                            }}
                          />
                        </span>
                        <span className="num w-[42px] flex-none text-right text-[11.5px] text-[var(--color-muted)]">
                          {pct(share, 1)}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-5 text-[12px] text-[var(--color-faint)]">
          Showing the top 20 of {num(naics.length)} codes. Bars are scaled 3× for legibility; the
          percentage is the true share.
        </p>
      </section>
    </div>
  );
}
