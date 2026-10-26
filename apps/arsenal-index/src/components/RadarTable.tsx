"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import BandBadge from "./BandBadge";
import LockIcon from "./LockIcon";
import { BAND_META, daysOutLabel, num, shortDate, tidy, usd, usdFull } from "@/lib/format";
import type { RadarPayload, RadarRow } from "@/lib/radar";
import type { Band } from "@/lib/types";

type SortKey = "urgency" | "value" | "agency" | "naics";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "urgency", label: "Soonest first" },
  { key: "value", label: "Largest first" },
  { key: "agency", label: "By agency" },
  { key: "naics", label: "By NAICS" },
];

const BAND_ORDER: Band[] = ["hot", "warm", "horizon"];

export default function RadarTable({ payload }: { payload: RadarPayload }) {
  const [q, setQ] = useState("");
  const [agency, setAgency] = useState("");
  const [naics, setNaics] = useState("");
  const [bands, setBands] = useState<Band[]>([]);
  const [sort, setSort] = useState<SortKey>("urgency");
  const [visible, setVisible] = useState(60);

  const deferredQ = useDeferredValue(q);

  const naicsOptions = useMemo(
    () =>
      Object.entries(payload.naicsLabels)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([code, label]) => ({ code, label })),
    [payload.naicsLabels],
  );

  const filtered = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    const rows = payload.rows.filter((r) => {
      if (agency && r.agency !== agency) return false;
      if (naics && r.naics !== naics) return false;
      if (bands.length && !bands.includes(r.band)) return false;
      if (!needle) return true;
      return (
        (r.incumbent ?? "").toLowerCase().includes(needle) ||
        r.id.toLowerCase().includes(needle) ||
        r.sub_agency.toLowerCase().includes(needle) ||
        (payload.naicsLabels[r.naics] ?? "").toLowerCase().includes(needle) ||
        (r.description ?? "").toLowerCase().includes(needle)
      );
    });

    const sorted = [...rows];
    if (sort === "urgency") sorted.sort((a, b) => a.days_out - b.days_out);
    if (sort === "value") sorted.sort((a, b) => b.value - a.value || a.days_out - b.days_out);
    if (sort === "agency")
      sorted.sort((a, b) => a.sub_agency.localeCompare(b.sub_agency) || a.days_out - b.days_out);
    if (sort === "naics") sorted.sort((a, b) => a.naics.localeCompare(b.naics) || a.days_out - b.days_out);
    return sorted;
  }, [payload.rows, payload.naicsLabels, deferredQ, agency, naics, bands, sort]);

  const shown = filtered.slice(0, visible);
  const lockedInView = shown.filter((r) => r.locked).length;
  const filteredValue = filtered.reduce((sum, r) => sum + r.value, 0);
  const anyFilter = Boolean(q || agency || naics || bands.length);

  const reset = () => {
    setQ("");
    setAgency("");
    setNaics("");
    setBands([]);
    setVisible(60);
  };

  const toggleBand = (b: Band) => {
    setVisible(60);
    setBands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };

  // Section headers only make sense while the table is in urgency order.
  const grouped = sort === "urgency";
  let lastBand: Band | null = null;

  return (
    <div>
      {/* Band summary — three cards that double as filters. */}
      <div className="grid gap-3 sm:grid-cols-3">
        {BAND_ORDER.map((b) => {
          const on = bands.includes(b);
          const meta = BAND_META[b];
          const stats = payload.bands[b];
          return (
            <button
              key={b}
              type="button"
              onClick={() => toggleBand(b)}
              aria-pressed={on}
              className="stat text-left transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: on ? `color-mix(in oklab, ${meta.color} 45%, transparent)` : undefined,
                background: on ? `color-mix(in oklab, ${meta.color} 7%, var(--color-surface))` : undefined,
              }}
            >
              <span className="flex items-center gap-2">
                <span className="band-dot" style={{ background: meta.color }} />
                <span className="eyebrow" style={{ color: meta.color }}>
                  {meta.label}
                </span>
              </span>
              <span className="stat-value mt-2.5 block text-[26px]">{num(stats.count)}</span>
              <span
                className="num mt-1 block text-[13px] text-[var(--color-muted)]"
                title={usdFull(stats.value)}
              >
                {usd(stats.value)} expiring
              </span>
              <span className="mt-2 block text-[11.5px] leading-[1.5] text-[var(--color-faint)]">
                {meta.blurb}
              </span>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="card mt-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_auto]">
          <label className="block">
            <span className="sr-only">Search the radar</span>
            <input
              className="input"
              type="search"
              placeholder="Search incumbent, award ID, office, description…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setVisible(60);
              }}
            />
          </label>

          <label className="block">
            <span className="sr-only">Filter by agency</span>
            <select
              className="input"
              value={agency}
              onChange={(e) => {
                setAgency(e.target.value);
                setVisible(60);
              }}
            >
              <option value="">All agencies</option>
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
                setVisible(60);
              }}
            >
              <option value="">All NAICS</option>
              {naicsOptions.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.code} — {n.label.slice(0, 46)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">Sort</span>
            <select
              className="input md:w-[150px]"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--color-line-soft)] pt-3.5">
          <p className="text-[12.5px] text-[var(--color-muted)]">
            <span className="num text-[var(--color-chalk)]">{num(filtered.length)}</span> of{" "}
            <span className="num">{num(payload.total)}</span> contracts
            <span className="mx-2 text-[var(--color-faint)]">·</span>
            <span className="num text-[var(--color-chalk)]" title={usdFull(filteredValue)}>
              {usd(filteredValue)}
            </span>{" "}
            in scope
          </p>
          {anyFilter ? (
            <button type="button" className="chip" onClick={reset}>
              Clear filters
            </button>
          ) : null}
          <span className="ml-auto text-[12px] text-[var(--color-faint)]">
            {payload.unlocked} of {num(payload.total)} rows unlocked on the free tier
          </span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card mt-5 flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="eyebrow">No contracts match</p>
          <p className="max-w-[46ch] text-[14px] leading-[1.6] text-[var(--color-muted)]">
            Nothing in the {num(payload.total)}-contract radar fits those filters. Widen the agency or
            NAICS filter, or clear the search.
          </p>
          <button type="button" className="btn btn-ghost mt-1" onClick={reset}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="card mt-5 overflow-hidden">
          <div className="scroll-x max-h-[76vh] overflow-y-auto">
            <table className="tbl min-w-[900px]">
              <thead>
                <tr>
                  <th style={{ width: 96 }}>Window</th>
                  <th>Incumbent</th>
                  <th className="r">Value</th>
                  <th style={{ width: 110 }}>Expires</th>
                  <th>Buying office</th>
                  <th style={{ width: 92 }}>NAICS</th>
                  <th style={{ width: 60 }} />
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => {
                  const showHeader = grouped && row.band !== lastBand;
                  if (showHeader) lastBand = row.band;
                  return (
                    <RowGroup
                      key={row.id + row.end_date}
                      row={row}
                      naicsLabel={payload.naicsLabels[row.naics] ?? row.naics}
                      header={showHeader ? row.band : null}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--color-line)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] text-[var(--color-muted)]">
              Showing <span className="num">{num(shown.length)}</span> of{" "}
              <span className="num">{num(filtered.length)}</span>
              {lockedInView ? (
                <>
                  <span className="mx-2 text-[var(--color-faint)]">·</span>
                  <span className="inline-flex items-center gap-1.5 text-[var(--accent)]">
                    <LockIcon />
                    {num(lockedInView)} locked
                  </span>
                </>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2">
              {visible < filtered.length ? (
                <button
                  type="button"
                  className="btn btn-ghost h-9 text-[13px]"
                  onClick={() => setVisible((v) => v + 120)}
                >
                  Load 120 more
                </button>
              ) : null}
              <Link href="/api-docs#pricing" className="btn btn-primary h-9 text-[13px]">
                Unlock the full radar
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RowGroup({
  row,
  naicsLabel,
  header,
}: {
  row: RadarRow;
  naicsLabel: string;
  header: Band | null;
}) {
  const meta = BAND_META[row.band];

  return (
    <>
      {header ? (
        <tr>
          <td colSpan={7} className="!border-b-0 !px-4 !pb-2 !pt-6">
            <span className="flex items-center gap-2.5">
              <span className="band-dot" style={{ background: meta.color }} />
              <span
                className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.12em]"
                style={{ color: meta.color }}
              >
                {meta.label}
              </span>
              <span className="h-px flex-1" style={{ background: "var(--color-line-soft)" }} />
              <span className="text-[11.5px] text-[var(--color-faint)]">{meta.blurb}</span>
            </span>
          </td>
        </tr>
      ) : null}

      <tr>
        <td>
          <span className="flex items-center gap-2">
            <BandBadge band={row.band} compact />
            <span className="num text-[12.5px] text-[var(--color-body)]">
              {daysOutLabel(row.days_out)}
            </span>
          </span>
        </td>

        <td className="max-w-[280px]">
          {row.locked ? (
            <span className="inline-flex items-center gap-2 text-[var(--color-faint)]">
              <LockIcon />
              <span
                className="inline-block h-[9px] w-[130px] rounded-sm"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, var(--color-line) 0 6px, transparent 6px 11px)",
                }}
              />
            </span>
          ) : (
            <>
              <Link
                href={`/firms/${row.incumbent_id}`}
                className="block truncate font-medium text-[var(--color-chalk)] transition-colors hover:text-[var(--accent)]"
                title={row.incumbent ?? undefined}
              >
                {row.incumbent}
              </Link>
              {row.description ? (
                <span
                  className="mt-0.5 block truncate text-[11.5px] text-[var(--color-faint)]"
                  title={row.description}
                >
                  {tidy(row.description)}
                </span>
              ) : null}
            </>
          )}
        </td>

        <td className="num r">
          {row.locked ? (
            <span className="text-[12.5px] text-[var(--color-faint)]">{row.value_label}</span>
          ) : (
            <span className="text-[var(--color-chalk)]" title={usdFull(row.value)}>
              {usd(row.value)}
            </span>
          )}
        </td>

        <td className="num text-[12.5px] text-[var(--color-body)]">{shortDate(row.end_date)}</td>

        <td className="max-w-[220px]">
          <span className="block truncate text-[13px] text-[var(--color-body)]" title={row.sub_agency}>
            {row.sub_agency}
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-[var(--color-faint)]">
            {row.type}
          </span>
        </td>

        <td>
          <span className="num text-[12.5px] text-[var(--color-body)]" title={naicsLabel}>
            {row.naics}
          </span>
        </td>

        <td className="r">
          {row.url ? (
            <a
              href={row.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-muted)] transition-colors hover:text-[var(--accent)]"
              title={`Open award ${row.id} on USAspending.gov`}
            >
              Award
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M2.5 7.5 7.5 2.5M4 2.5h3.5V6" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </a>
          ) : (
            <span className="text-[11.5px] text-[var(--color-faint)]">—</span>
          )}
        </td>
      </tr>
    </>
  );
}
