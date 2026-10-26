import { getMeta, getNaics } from "@/lib/data";
import { ok, page } from "@/lib/paywall";

/**
 * Free. NAICS categories by obligated value.
 * ?q= matches code prefix or label text.
 */
export function GET(req: Request) {
  const url = new URL(req.url);
  const { limit, offset } = page(url, 50, 300);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const marketValue = getMeta().market_value;

  const all = getNaics().filter((n) =>
    q ? n.code.startsWith(q) || n.label.toLowerCase().includes(q) : true,
  );

  const rows = all.slice(offset, offset + limit).map((n) => ({
    ...n,
    share_of_market: marketValue > 0 ? n.value / marketValue : 0,
  }));

  return ok(rows, { count: rows.length, total: all.length });
}
