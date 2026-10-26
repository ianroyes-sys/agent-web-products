import type { Metadata } from "next";
import FirmsTable, { type FirmRow, type FirmsPayload } from "@/components/FirmsTable";
import { Stat } from "@/components/Stat";
import { getFirms, getMeta, getNaics } from "@/lib/data";
import { num, usd, usdFull } from "@/lib/format";

export const metadata: Metadata = {
  title: "Firm directory",
  description:
    "Every prime contractor headquartered in the Huntsville market, ranked by obligated value, with agency mix, NAICS footprint, and expiring work.",
};

export default function FirmsPage() {
  const meta = getMeta();
  const firms = getFirms();

  const rows: FirmRow[] = firms.map((f) => ({
    id: f.id,
    name: f.name,
    rank: f.rank,
    tier: f.tier,
    total_value: f.total_value,
    active_value: f.active_value,
    award_count: f.award_count,
    top_agency: f.top_agency,
    expiring_count: f.expiring_count,
    expiring_value: f.expiring_value,
    naics: f.naics.map((n) => n.code),
  }));

  const payload: FirmsPayload = {
    rows,
    agencies: [...new Set(firms.map((f) => f.top_agency))].sort(),
    naics: getNaics()
      .slice(0, 60)
      .map((n) => ({ code: n.code, label: n.label })),
  };

  const tierCount = (t: string) => firms.filter((f) => f.tier === t).length;
  const withExpiring = firms.filter((f) => f.expiring_count > 0).length;

  return (
    <div className="wrap-wide py-10 md:py-14">
      <header className="fade-up max-w-[70ch]">
        <p className="eyebrow">Directory</p>
        <h1 className="mt-3 text-[clamp(30px,5.4vw,48px)] font-semibold leading-[1.06]">
          {num(meta.firm_count)} firms, one market
        </h1>
        <p className="mt-4 text-[16px] leading-[1.65] text-[var(--color-muted)]">
          Prime recipients headquartered in {meta.market}, resolved from {num(meta.raw_awards)} raw
          award records across {meta.lookback_fy} fiscal years. Name collisions merged, subsidiaries
          kept separate, dollars traced back to the award.
        </p>
      </header>

      <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Firms tracked" value={num(meta.firm_count)} sub="Distinct prime recipients." />
        <Stat
          label="Market value"
          value={usd(meta.market_value)}
          title={usdFull(meta.market_value)}
          accent
          sub="Total obligated across the lookback."
        />
        <Stat
          label="Tier split"
          value={`${tierCount("major")} / ${tierCount("mid")} / ${tierCount("small")}`}
          sub="Major / mid / small, by obligated value."
        />
        <Stat
          label="With expiring work"
          value={num(withExpiring)}
          sub="Firms holding at least one contract that ends inside 24 months."
        />
      </div>

      <div className="mt-10">
        <FirmsTable payload={payload} />
      </div>
    </div>
  );
}
