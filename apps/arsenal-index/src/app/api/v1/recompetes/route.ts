import { getRecompetes } from "@/lib/data";
import { inBand, isBand } from "@/lib/format";
import { FREE_RECOMPETE_ROWS, checkPayment, ok, page, paymentRequired } from "@/lib/paywall";

/**
 * The radar. Free callers get the 15 most urgent rows; anything beyond that
 * — a wider limit, an offset, or ?full=1 — is the paid resource and answers
 * with HTTP 402 until an X-Payment or X-API-Key header shows up.
 *
 * Filters: ?days= max days to expiration, ?agency=, ?naics=, ?q= free text,
 *          ?min_value=, ?band=hot|warm|horizon
 */
export function GET(req: Request) {
  const url = new URL(req.url);
  const { paid, via } = checkPayment(req);

  const askedLimit = url.searchParams.get("limit");
  const askedOffset = url.searchParams.get("offset");
  const askedFull = url.searchParams.get("full") === "1";

  const wantsMore =
    askedFull ||
    (askedOffset !== null && Number(askedOffset) > 0) ||
    (askedLimit !== null && Number(askedLimit) > FREE_RECOMPETE_ROWS);

  if (wantsMore && !paid) {
    return paymentRequired(
      "recompetes.full",
      `The first ${FREE_RECOMPETE_ROWS} rows are free — call this endpoint with no parameters, or limit<=${FREE_RECOMPETE_ROWS}. The full ${getRecompetes().length}-row radar is paid.`,
    );
  }

  const { limit, offset } = page(url, paid ? 100 : FREE_RECOMPETE_ROWS, paid ? 2000 : FREE_RECOMPETE_ROWS);

  const days = Number(url.searchParams.get("days") ?? "");
  const minValue = Number(url.searchParams.get("min_value") ?? "");
  const agency = (url.searchParams.get("agency") ?? "").trim().toLowerCase();
  const naics = (url.searchParams.get("naics") ?? "").trim();
  const bandFilter = (url.searchParams.get("band") ?? "").trim().toLowerCase();
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const all = getRecompetes().filter((r) => {
    if (Number.isFinite(days) && days > 0 && r.days_out > days) return false;
    if (Number.isFinite(minValue) && minValue > 0 && r.value < minValue) return false;
    if (agency && !(r.agency.toLowerCase().includes(agency) || r.sub_agency.toLowerCase().includes(agency)))
      return false;
    if (naics && r.naics !== naics) return false;
    // One shared definition, so ?band=hot and ?days=90 return the same rows.
    if (isBand(bandFilter) && !inBand(r.days_out, bandFilter)) return false;
    if (!q) return true;
    return (
      r.incumbent.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.naics_label.toLowerCase().includes(q) ||
      r.award_id.toLowerCase().includes(q)
    );
  });

  const rows = all.slice(offset, offset + limit);

  return ok(rows, {
    count: rows.length,
    total: all.length,
    tier: paid ? "paid" : "free",
    truncated: !paid && all.length > rows.length,
    ...(paid ? {} : { upgrade: "Pass X-Payment (x402) or X-API-Key for the full radar. See /api-docs." }),
    ...(via ? { paid_via: via } : {}),
  });
}
