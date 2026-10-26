import { getFirms } from "@/lib/data";
import { badRequest, checkPayment, ok, page } from "@/lib/paywall";
import type { Tier } from "@/lib/types";

const TIERS: Tier[] = ["major", "mid", "small"];

/**
 * Free. The directory in summary form.
 * ?q= name or NAICS prefix, ?agency= lead agency, ?naics= exact code,
 * ?tier= major|mid|small, ?expiring=1 to keep only firms with work at risk.
 *
 * Full per-firm detail lives at /api/v1/firms/{id} and is paid.
 */
export function GET(req: Request) {
  const url = new URL(req.url);
  const { limit, offset } = page(url, 50, 500);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const agency = (url.searchParams.get("agency") ?? "").trim().toLowerCase();
  const naics = (url.searchParams.get("naics") ?? "").trim();
  const tier = (url.searchParams.get("tier") ?? "").trim().toLowerCase();
  const expiringOnly = url.searchParams.get("expiring") === "1";

  if (tier && !TIERS.includes(tier as Tier)) {
    return badRequest(`tier must be one of ${TIERS.join(", ")}`);
  }

  const all = getFirms().filter((f) => {
    if (tier && f.tier !== tier) return false;
    if (agency && !f.top_agency.toLowerCase().includes(agency)) return false;
    if (naics && !f.naics.some((n) => n.code === naics)) return false;
    if (expiringOnly && f.expiring_count === 0) return false;
    if (!q) return true;
    return f.name.toLowerCase().includes(q) || f.naics.some((n) => n.code.startsWith(q));
  });

  const rows = all.slice(offset, offset + limit).map((f) => ({
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
    first_seen: f.first_seen,
    last_seen: f.last_seen,
    detail: `/api/v1/firms/${f.id}`,
  }));

  const { paid } = checkPayment(req);

  return ok(rows, {
    count: rows.length,
    total: all.length,
    tier: paid ? "paid" : "free",
  });
}
