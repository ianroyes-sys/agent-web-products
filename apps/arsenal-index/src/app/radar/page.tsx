import type { Metadata } from "next";
import Link from "next/link";
import RadarTable from "@/components/RadarTable";
import { Stat } from "@/components/Stat";
import { getMeta } from "@/lib/data";
import { buildRadar } from "@/lib/radar";
import { num, usd, usdFull } from "@/lib/format";

export const metadata: Metadata = {
  title: "Recompete radar",
  description:
    "Every Huntsville-area prime contract expiring in the next 24 months, banded by urgency. Who holds it, what it is worth, and when it comes up for grabs.",
};

export default function RadarPage() {
  const meta = getMeta();
  const payload = buildRadar();

  const soonest = payload.rows[0];

  return (
    <div className="wrap-wide py-10 md:py-14">
      <header className="fade-up max-w-[70ch]">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="pill pill-live">
            <span className="dot" />
            Live
          </span>
          <span className="pill">Generated {meta.generated}</span>
          <span className="pill">24-month window</span>
        </div>

        <h1 className="mt-5 text-[clamp(30px,5.4vw,48px)] font-semibold leading-[1.06]">
          The recompete radar
        </h1>
        <p className="mt-4 text-[16px] leading-[1.65] text-[var(--color-muted)]">
          Every prime contract in the Huntsville market with a period of performance ending inside 24
          months. An expiring contract is not a statistic — it is a seat that is about to be empty.
          This is the list of seats.
        </p>
      </header>

      <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Contracts expiring"
          value={num(meta.recompete_count)}
          sub="Prime awards with a period of performance ending in the next 24 months."
        />
        <Stat
          label="Value in play"
          value={usd(meta.recompete_value)}
          title={usdFull(meta.recompete_value)}
          accent
          sub="Obligated value attached to those expiring awards."
        />
        <Stat
          label="Incumbents at risk"
          value={num(new Set(payload.rows.map((r) => r.agency + r.sub_agency)).size)}
          sub="Distinct buying offices holding expiring work."
        />
        <Stat
          label="Next expiration"
          value={soonest ? `${soonest.days_out}d` : "—"}
          sub={
            soonest
              ? `${soonest.sub_agency} — ${usd(soonest.value)} on ${soonest.end_date}.`
              : "No expirations in the window."
          }
        />
      </div>

      <div className="mt-10">
        <RadarTable payload={payload} />
      </div>

      <section className="card mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-[58ch]">
          <p className="eyebrow">Reading the radar</p>
          <p className="mt-2 text-[13.5px] leading-[1.65] text-[var(--color-muted)]">
            Value is the obligated amount on the award as reported to USAspending, not the ceiling,
            and expiration is the current period-of-performance end date — options can extend it.
            Treat a row as a signal to go look, not as a solicitation.
          </p>
        </div>
        <Link href="/api-docs" className="btn btn-ghost flex-none">
          Query this from an agent
        </Link>
      </section>
    </div>
  );
}
