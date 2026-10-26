import { band } from "./format";
import { getRecompetes } from "./data";
import { FREE_RECOMPETE_ROWS } from "./paywall";
import type { Band, Recompete } from "./types";

/**
 * The shape the browser receives. Locked rows are genuinely degraded before
 * they leave the server — no blurred-CSS theatre over data that is sitting in
 * the page source. What survives is enough to see the market's shape and
 * count what you are missing.
 */
export interface RadarRow {
  id: string;
  incumbent: string | null;
  incumbent_id: string | null;
  value: number;
  value_label: string;
  end_date: string;
  days_out: number;
  band: Band;
  agency: string;
  sub_agency: string;
  naics: string;
  type: string;
  description: string | null;
  url: string | null;
  locked: boolean;
}

export interface RadarPayload {
  rows: RadarRow[];
  naicsLabels: Record<string, string>;
  agencies: string[];
  unlocked: number;
  total: number;
  bands: Record<Band, { count: number; value: number }>;
}

const BUCKETS: { floor: number; label: string }[] = [
  { floor: 1e9, label: "$1B+" },
  { floor: 2.5e8, label: "$250M–$1B" },
  { floor: 5e7, label: "$50M–$250M" },
  { floor: 1e7, label: "$10M–$50M" },
  { floor: 1e6, label: "$1M–$10M" },
  { floor: 0, label: "under $1M" },
];

function bucket(value: number): { floor: number; label: string } {
  return BUCKETS.find((b) => value >= b.floor) ?? BUCKETS[BUCKETS.length - 1];
}

function slugFromKey(incumbentKey: string): string {
  return incumbentKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * @param unlockAll set when the caller has paid — the whole radar comes back
 *                  at full fidelity.
 */
export function buildRadar(unlockAll = false): RadarPayload {
  const source: Recompete[] = getRecompetes();
  const naicsLabels: Record<string, string> = {};
  const agencySet = new Set<string>();
  const bands: RadarPayload["bands"] = {
    hot: { count: 0, value: 0 },
    warm: { count: 0, value: 0 },
    horizon: { count: 0, value: 0 },
  };

  const rows: RadarRow[] = source.map((r, i) => {
    const b = band(r.days_out);
    bands[b].count += 1;
    bands[b].value += r.value;
    if (r.naics_label) naicsLabels[r.naics] = r.naics_label;
    agencySet.add(r.agency);

    // The free window is the 15 most urgent rows, fixed by the server. It
    // cannot be widened by re-sorting or filtering in the browser.
    const locked = !unlockAll && i >= FREE_RECOMPETE_ROWS;
    const bk = bucket(r.value);

    return {
      id: r.award_id,
      incumbent: locked ? null : r.incumbent,
      incumbent_id: locked ? null : slugFromKey(r.incumbent_key),
      value: locked ? bk.floor : r.value,
      value_label: locked ? bk.label : "",
      end_date: r.end_date,
      days_out: r.days_out,
      band: b,
      agency: r.agency,
      sub_agency: r.sub_agency,
      naics: r.naics,
      type: r.type,
      description: locked ? null : r.description,
      url: locked ? null : r.url,
      locked,
    };
  });

  return {
    rows,
    naicsLabels,
    agencies: [...agencySet].sort(),
    unlocked: unlockAll ? rows.length : Math.min(FREE_RECOMPETE_ROWS, rows.length),
    total: rows.length,
    bands,
  };
}
