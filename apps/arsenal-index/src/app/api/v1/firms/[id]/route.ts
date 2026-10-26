import { capabilityGap, firmPeers, firmRecompetes, getFirm } from "@/lib/data";
import { checkPayment, notFound, ok, paymentRequired } from "@/lib/paywall";

/**
 * Paid — $0.01/call. Full firm detail: agency and NAICS rollups, PSC mix,
 * every expiring contract they hold, and the computed capability gap.
 *
 * The summary form of this record is free at /api/v1/firms?q=.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const firm = getFirm(id);
  if (!firm) return notFound(`No firm with id "${id}" in this index.`);

  const { paid, via } = checkPayment(req);
  if (!paid) {
    return paymentRequired(
      "firms.detail",
      `Full detail for "${firm.name}" is a paid resource. Summary fields for this firm are free at /api/v1/firms?q=${encodeURIComponent(firm.name.slice(0, 24))}.`,
    );
  }

  return ok(
    {
      ...firm,
      recompetes: firmRecompetes(firm),
      capability_gap: capabilityGap(firm, 12),
      peers: firmPeers(firm, 6).map((p) => ({
        id: p.id,
        name: p.name,
        rank: p.rank,
        total_value: p.total_value,
      })),
    },
    { tier: "paid", count: 1, ...(via ? { paid_via: via } : {}) },
  );
}
