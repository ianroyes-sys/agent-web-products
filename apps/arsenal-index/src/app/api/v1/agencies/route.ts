import { getAgencies, getMeta } from "@/lib/data";
import { ok, page } from "@/lib/paywall";

/** Free. Funding agencies active in the market, by obligated value. */
export function GET(req: Request) {
  const url = new URL(req.url);
  const { limit, offset } = page(url, 50, 200);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const marketValue = getMeta().market_value;

  const all = getAgencies().filter((a) => (q ? a.name.toLowerCase().includes(q) : true));

  const rows = all.slice(offset, offset + limit).map((a) => ({
    ...a,
    share_of_market: marketValue > 0 ? a.value / marketValue : 0,
  }));

  return ok(rows, { count: rows.length, total: all.length });
}
