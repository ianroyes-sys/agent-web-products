import { getAgencies, getFirms, getMeta, getMovement, getNaics, getRecompetes } from "@/lib/data";
import { checkPayment, metaBlock, paymentRequired } from "@/lib/paywall";

/**
 * Paid — $2.50/export. The whole index in one response.
 * ?format=csv returns the radar as CSV instead of the full JSON bundle.
 */
export function GET(req: Request) {
  const { paid, via } = checkPayment(req);
  if (!paid) {
    return paymentRequired(
      "export.bulk",
      "Bulk export returns every firm, recompete, NAICS row, and agency row in one call.",
    );
  }

  const url = new URL(req.url);
  const generated = getMeta().generated;

  if (url.searchParams.get("format") === "csv") {
    const header = [
      "award_id",
      "incumbent",
      "value",
      "end_date",
      "days_out",
      "agency",
      "sub_agency",
      "naics",
      "naics_label",
      "type",
      "url",
    ];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      header.join(","),
      ...getRecompetes().map((r) =>
        [
          r.award_id,
          r.incumbent,
          r.value,
          r.end_date,
          r.days_out,
          r.agency,
          r.sub_agency,
          r.naics,
          r.naics_label,
          r.type,
          r.url,
        ]
          .map(esc)
          .join(","),
      ),
    ];

    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="arsenal-index-recompetes-${generated}.csv"`,
        "X-Index-Generated": generated,
      },
    });
  }

  return Response.json(
    {
      meta: metaBlock({ tier: "paid", ...(via ? { paid_via: via } : {}) }),
      data: {
        firms: getFirms(),
        recompetes: getRecompetes(),
        naics: getNaics(),
        agencies: getAgencies(),
        movement: getMovement(),
      },
    },
    {
      headers: {
        "X-Index-Generated": generated,
        "Content-Disposition": `attachment; filename="arsenal-index-${generated}.json"`,
      },
    },
  );
}
