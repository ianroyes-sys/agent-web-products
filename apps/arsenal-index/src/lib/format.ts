import type { Band } from "./types";

const FULL = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * Compact dollars for display: $1.72B, $24.9M, $840K.
 * Always pair with `usdFull()` in a title attribute — a data product that
 * only ever shows rounded numbers is not auditable.
 */
export function usd(n: number): string {
  const v = Math.abs(n);
  if (v >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

export function usdFull(n: number): string {
  return FULL.format(n);
}

export function num(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

/** 2026-08-17 -> Aug 17, 2026. Parsed as UTC so the date never shifts a day. */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

/**
 * Bands are inclusive at the upper bound, matching the `?days=` API filter and
 * the figures published in docs/. Keep them that way: if this drifts, the site
 * and the outreach quote different counts for the same window, and a data
 * product that contradicts itself is finished.
 */
export const BAND_MAX_DAYS = { hot: 90, warm: 365 } as const;

export function band(daysOut: number): Band {
  if (daysOut <= BAND_MAX_DAYS.hot) return "hot";
  if (daysOut <= BAND_MAX_DAYS.warm) return "warm";
  return "horizon";
}

/**
 * The single definition of each band, used by every filter — the radar UI, the
 * REST `?band=` parameter, and both MCP transports. Inclusive upper bound, so
 * `?band=hot` and `?days=90` return the same rows.
 */
export function inBand(daysOut: number, target: Band): boolean {
  return band(daysOut) === target;
}

export function isBand(value: string): value is Band {
  return value === "hot" || value === "warm" || value === "horizon";
}

export const BAND_META: Record<Band, { label: string; blurb: string; color: string }> = {
  hot: {
    label: "Hot",
    blurb: "Expires within 90 days. Capture decisions are already being made.",
    color: "var(--color-hot)",
  },
  warm: {
    label: "Warm",
    blurb: "91 to 365 days out. The right window to shape requirements.",
    color: "var(--color-warn)",
  },
  horizon: {
    label: "Horizon",
    blurb: "Over a year out. Time to build past performance and teaming.",
    color: "var(--color-live)",
  },
};

export function daysOutLabel(days: number): string {
  if (days <= 0) return "expired";
  if (days === 1) return "1 day";
  if (days < 45) return `${days} days`;
  if (days < 730) return `${Math.round(days / 30)} mo`;
  return `${(days / 365).toFixed(1)} yr`;
}

/** Title-case a SHOUTING government description without mangling acronyms. */
export function tidy(text: string): string {
  if (!text) return "";
  const letters = text.replace(/[^A-Za-z]/g, "");
  const upperRatio = letters ? letters.replace(/[^A-Z]/g, "").length / letters.length : 0;
  if (upperRatio < 0.8) return text;
  return text
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Ch|Uh|Ah|Rq|Mq|Us|Usa|Dod|Nasa|Mda|Army|Navy|Faa|It|Sbir|Rdt&e)\b/g, (m) =>
      m.toUpperCase(),
    );
}
