import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe is TEST MODE ONLY right now. With a key set this opens a real Checkout
 * session against whatever mode the key belongs to; with no key it degrades to
 * waitlist capture and says so, rather than rendering a button that 500s.
 */
const PLANS = {
  monthly: { name: "Come Up — Monthly", amount: 1900, interval: "month" },
  pro: { name: "Come Up Pro — Monthly", amount: 4900, interval: "month" },
} as const;

type PlanKey = keyof typeof PLANS;

export async function POST(request: Request) {
  let body: { plan?: string };
  try {
    body = (await request.json()) as { plan?: string };
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }

  const key = body.plan;
  if (!key || !(key in PLANS)) {
    return Response.json({ error: "Unknown plan." }, { status: 400 });
  }
  const plan = PLANS[key as PlanKey];

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return Response.json({
      mode: "waitlist",
      message: "Billing isn't switched on yet. Leave an email and you'll be first through when it is.",
    });
  }

  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(plan.amount),
    "line_items[0][price_data][recurring][interval]": plan.interval,
    "line_items[0][price_data][product_data][name]": plan.name,
    success_url: `${siteUrl()}/pricing?checkout=success`,
    cancel_url: `${siteUrl()}/pricing?checkout=cancelled`,
    allow_promotion_codes: "true",
  });

  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: params,
      signal: AbortSignal.timeout(15000),
    });

    const data = (await response.json()) as { url?: string; error?: { message?: string } };
    if (!response.ok || !data.url) {
      return Response.json(
        { mode: "waitlist", message: data.error?.message ?? "Checkout couldn't start. Leave an email instead." },
        { status: 200 },
      );
    }
    return Response.json({ mode: "checkout", url: data.url });
  } catch {
    return Response.json(
      { mode: "waitlist", message: "Checkout is unreachable right now. Leave an email and you'll be first through." },
      { status: 200 },
    );
  }
}
