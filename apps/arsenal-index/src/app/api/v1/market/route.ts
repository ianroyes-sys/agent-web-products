import { getAgencies, getFirms, getMeta, getMovement, getNaics } from "@/lib/data";
import { ok } from "@/lib/paywall";

export const dynamic = "force-static";

/** Free. The aggregate view — this is what makes the index discoverable. */
export function GET() {
  const meta = getMeta();
  const firms = getFirms();
  const movement = getMovement();
  const agencies = getAgencies();
  const naics = getNaics();

  const top5 = firms.slice(0, 5).reduce((s, f) => s + f.total_value, 0);
  const trailing12 = movement.slice(-12).reduce((s, p) => s + p.value, 0);
  const prior12 = movement.slice(-24, -12).reduce((s, p) => s + p.value, 0);

  return ok({
    market: meta.market,
    scope: meta.scope,
    lookback_fy: meta.lookback_fy,
    raw_awards: meta.raw_awards,
    market_value: meta.market_value,
    firm_count: meta.firm_count,
    recompete_count: meta.recompete_count,
    recompete_value: meta.recompete_value,
    agency_count: agencies.length,
    naics_count: naics.length,
    top5_concentration: meta.market_value > 0 ? top5 / meta.market_value : 0,
    trailing_12mo_value: trailing12,
    prior_12mo_value: prior12,
    yoy_change: prior12 > 0 ? trailing12 / prior12 - 1 : null,
    top_agencies: agencies.slice(0, 5).map((a) => ({ name: a.name, value: a.value })),
    top_firms: firms.slice(0, 5).map((f) => ({ id: f.id, name: f.name, value: f.total_value })),
    movement,
  });
}
