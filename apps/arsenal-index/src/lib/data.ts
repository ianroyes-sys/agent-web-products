/**
 * Server-only access to the refinery output.
 *
 * Read with fs (not `import`) for two reasons: a 1.5 MB JSON literal makes
 * tsc crawl, and it keeps the payload out of any client bundle by accident.
 * next.config.ts traces src/data into the serverless output.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  AgencyRow,
  ArsenalIndexFile,
  CapabilityGap,
  Firm,
  IndexMeta,
  MovementPoint,
  NaicsRow,
  Recompete,
} from "./types";

let cache: ArsenalIndexFile | null = null;

function load(): ArsenalIndexFile {
  if (cache) return cache;
  const path = join(process.cwd(), "src", "data", "index.json");
  const parsed = JSON.parse(readFileSync(path, "utf8")) as ArsenalIndexFile;

  // Rank is assigned upstream, but never trust it blindly for slicing.
  parsed.firms.sort((a, b) => b.total_value - a.total_value);
  parsed.recompetes.sort((a, b) => a.days_out - b.days_out);
  cache = parsed;
  return parsed;
}

export function getMeta(): IndexMeta {
  return load().meta;
}

export function getFirms(): Firm[] {
  return load().firms;
}

export function getFirm(id: string): Firm | undefined {
  return load().firms.find((f) => f.id === id);
}

export function getRecompetes(): Recompete[] {
  return load().recompetes;
}

export function getNaics(): NaicsRow[] {
  return load().naics;
}

export function getAgencies(): AgencyRow[] {
  return load().agencies;
}

export function getMovement(): MovementPoint[] {
  return load().movement;
}

/** Distinct top-level agencies present on the radar, biggest first. */
export function radarAgencies(): string[] {
  const totals = new Map<string, number>();
  for (const r of getRecompetes()) {
    totals.set(r.agency, (totals.get(r.agency) ?? 0) + r.value);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

/** NAICS codes present on the radar, by expiring value. */
export function radarNaics(): { code: string; label: string }[] {
  const totals = new Map<string, { label: string; value: number }>();
  for (const r of getRecompetes()) {
    const prev = totals.get(r.naics);
    totals.set(r.naics, {
      label: r.naics_label || prev?.label || r.naics,
      value: (prev?.value ?? 0) + r.value,
    });
  }
  return [...totals.entries()]
    .sort((a, b) => b[1].value - a[1].value)
    .map(([code, v]) => ({ code, label: v.label }));
}

/**
 * NAICS codes where this market is demonstrably active but the firm has
 * zero awards. This is the "where could you credibly expand" panel — the
 * single most useful thing you can tell a mid-tier contractor.
 */
export function capabilityGap(firm: Firm, limit = 8): CapabilityGap[] {
  const held = new Set(firm.naics.map((n) => n.code));
  const firms = getFirms();

  const topFirmFor = (code: string): string | null => {
    let best: { name: string; value: number } | null = null;
    for (const f of firms) {
      const hit = f.naics.find((n) => n.code === code);
      if (hit && (!best || hit.value > best.value)) best = { name: f.name, value: hit.value };
    }
    return best?.name ?? null;
  };

  return getNaics()
    .filter((n) => !held.has(n.code) && n.firm_count >= 3)
    .slice(0, limit)
    .map((n) => ({
      code: n.code,
      label: n.label,
      market_value: n.value,
      firm_count: n.firm_count,
      top_firm: topFirmFor(n.code),
    }));
}

/** Recompetes where this firm is the incumbent, soonest first. */
export function firmRecompetes(firm: Firm): Recompete[] {
  return getRecompetes().filter((r) => r.incumbent_key === firm.key);
}

/** Peers in the same tier, ranked around this firm. */
export function firmPeers(firm: Firm, limit = 4): Firm[] {
  return getFirms()
    .filter((f) => f.tier === firm.tier && f.id !== firm.id)
    .sort(
      (a, b) => Math.abs(a.total_value - firm.total_value) - Math.abs(b.total_value - firm.total_value),
    )
    .slice(0, limit);
}
