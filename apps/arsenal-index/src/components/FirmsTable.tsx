"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { num, usd, usdFull } from "@/lib/format";
import type { Tier } from "@/lib/types";

export interface FirmRow {
  id: string;
  name: string;
  rank: number;
  tier: Tier;
  total_value: number;
  active_value: number;
  award_count: number;
  top_agency: string;
  expiring_count: number;
  expiring_value: number;
  naics: string[];
}

export interface FirmsPayload {
  rows: FirmRow[];
  agencies: string[];
  naics: { code: string; label: string }[];
}

type SortKey = "value" | "awards" | "expiring" | "name";

const TIERS: { key: Tier; label: string; blurb: string }[] = [
  { key: "major", label: "Major", blurb: "Primes at the top of the market." },
  { key: "mid", label: "Mid", blurb: "Established shops with real past performance." },
  { key: "small", label: "Small", blurb: "Emerging and niche performers." },
];

const TIER_COLOR: Record<Tier, string> = {
  major: "var(--accent)",
  mid: "var(--color-live)",
  small: "var(--color-muted)",
};

export default function FirmsTable({ payload }: { payload: FirmsPayload }) {
  const [q, setQ] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [agency, setAgency] = useState("");
  const [naics, setNaics] = useState("");
  const [sort, setSort] = useState<SortKey>("value");
  const [visible, setVisible] = useState(50);

  const deferredQ = useDeferredValue(q);

  const filtered = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    const rows = payload.rows.filter((r) => {
      if (tiers.length && !tiers.includes(r.tier)) return false;
      if (agency && r.top_agency !== agency) return false;
      if (naics && !r.naics.includes(naics)) return false;
      if (!needle) return true;
      return r.name.toLowerCase().includes(needle) || r.naics.some((c) => c.startsWith(needle));
    });

    const sorted = [...rows];
    if (sort === "value") sorted.sort((a, b) => b.total_value - a.total_value);
    if (sort === "awards") sorted.sort((a, b) => b.award_count - a.award_count);
    if (sort === "expiring") sorted.sort((a, b) => b.expiring_value - a.expiring_value);
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [payload.rows, deferredQ, tiers, agency, naics, sort]);

  const shown = filtered.slice(0, visible);
  const filteredValue = filtered.reduce((s, r) => s + r.total_value, 0);
  const anyFilter = Boolean(q || tiers.length || agency || naics);

  const reset = () => {
    setQ("");
    setTiers([]);
    setAgency("");
    setNaics("");
    setVisible(50);
  };

  const toggleTier = (t: Tier) => {
    setVisible(50);
    setTiers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  return (
    <div>
      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_auto]">
          <label className="block">
            <span className="sr-only">Search firms</span>
            <input
              className="input"
              type="search"
              placeholder="Search firm name or NAICS code…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setVisible(50);
              }}
            />
          </label>

          <label className="block">
            <span className="sr-only">Filter by lead agency</span>
            <select
              className="input"
              value={agency}
              onChange={(e) => {
                setAgency(e.target.value);
                setVisible(50);
              }}
            >
              <option value="">Any lead agency</option>
              {payload.agencies.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">Filter by NAICS</span>
            <select
              className="input"
              value={naics}
              onChange={(e) => {
                setNaics(e.target.value);
                setVisible(50);
              }}
            >
              <option value="">Any NAICS</option>
              {payload.naics.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.code} — {n.label.slice(0, 46)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">Sort</span>
            <select
              className="input md:w-[168px]"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="value">Total awarded</option>
              <option value="awards">Award count</option>
              <option value="expiring">Expiring value</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-[var(--color-line-soft)] pt-3.5">
          {TIERS.map((t) => (
            <button
              key={t.key}
              type="button"
              className="chip"
              data-on={tiers.includes(t.key)}
              aria-pressed={tiers.includes(t.key)}
              onClick={() => toggleTier(t.key)}
              title={t.blurb}
            >
              <span className="band-dot" style={{ background: TIER_COLOR[t.key] }} />
              {t.label}
            </button>
          ))}
          {anyFilter ? (
            <button type="button" className="chip" onClick={reset}>
              Clear
            </button>
          ) : null}
          <p className="ml-auto text-[12.5px] text-[var(--color-muted)]">
            <span className="num text-[var(--color-chalk)]">{num(filtered.length)}</span> firms
            <span className="mx-2 text-[var(--color-faint)]">·</span>
            <span className="num text-[var(--color-chalk)]" title={usdFull(filteredValue)}>
              {usd(filteredValue)}
            </span>{" "}
            awarded
          </p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card mt-5 flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="eyebrow">No firms match</p>
          <p className="max-w-[46ch] text-[14px] leading-[1.6] text-[var(--color-muted)]">
            No tracked firm fits that combination. The index covers prime recipients headquartered in
            market — a subcontractor or an out-of-town prime will not appear here.
          </p>
          <button type="button" className="btn btn-ghost mt-1" onClick={reset}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="card mt-5 overflow-hidden">
          <div className="scroll-x max-h-[76vh] overflow-y-auto">
            <table className="tbl min-w-[820px]">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>#</th>
                  <th>Firm</th>
                  <th style={{ width: 78 }}>Tier</th>
                  <th className="r" style={{ width: 110 }}>
                    Awarded
                  </th>
                  <th className="r" style={{ width: 80 }}>
                    Awards
                  </th>
                  <th>Lead agency</th>
                  <th className="r" style={{ width: 128 }}>
                    Expiring
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td className="num text-[12px] text-[var(--color-faint)]">{r.rank}</td>
                    <td className="max-w-[300px]">
                      <Link
                        href={`/firms/${r.id}`}
                        className="block truncate font-medium text-[var(--color-chalk)] transition-colors hover:text-[var(--accent)]"
                        title={r.name}
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td>
                      <span
                        className="tag"
                        style={{
                          color: TIER_COLOR[r.tier],
                          borderColor: `color-mix(in oklab, ${TIER_COLOR[r.tier]} 32%, transparent)`,
                        }}
                      >
                        {r.tier}
                      </span>
                    </td>
                    <td className="num r text-[var(--color-chalk)]" title={usdFull(r.total_value)}>
                      {usd(r.total_value)}
                    </td>
                    <td className="num r text-[var(--color-body)]">{num(r.award_count)}</td>
                    <td className="max-w-[220px]">
                      <span className="block truncate text-[13px] text-[var(--color-body)]">
                        {r.top_agency}
                      </span>
                    </td>
                    <td className="r">
                      {r.expiring_count > 0 ? (
                        <span title={usdFull(r.expiring_value)}>
                          <span className="num text-[var(--accent)]">{usd(r.expiring_value)}</span>
                          <span className="num ml-1.5 text-[11.5px] text-[var(--color-faint)]">
                            ({r.expiring_count})
                          </span>
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--color-faint)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visible < filtered.length ? (
            <div className="border-t border-[var(--color-line)] px-4 py-4 text-center">
              <button
                type="button"
                className="btn btn-ghost h-9 text-[13px]"
                onClick={() => setVisible((v) => v + 100)}
              >
                Load 100 more · {num(filtered.length - shown.length)} remaining
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
