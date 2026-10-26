import { PLANS, REQUEST_ACCESS_EMAIL, checkoutReady, planById, priceIdFor, requestAccessHref } from "@/lib/plans";

/**
 * Stripe Checkout session creation, TEST MODE.
 *
 * Called with the Stripe REST API over fetch rather than the SDK — one form
 * POST does not justify the dependency, and it keeps the serverless bundle the
 * same size it was.
 *
 * If the account is not configured, this answers 503 with a fallback address
 * instead of a broken redirect. The UI already renders a request-access CTA in
 * that case; this is the second line of defence for direct callers.
 */

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4801";

/** Availability probe, so a client can render the right CTA without guessing. */
export function GET() {
  return Response.json({
    mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "live" : "test",
    plans: PLANS.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      cadence: p.cadence,
      checkout: checkoutReady(p) ? "stripe" : "request_access",
      contact: REQUEST_ACCESS_EMAIL,
    })),
  });
}

export async function POST(req: Request) {
  let planId = "";
  try {
    const body = (await req.json()) as { plan?: string };
    planId = typeof body.plan === "string" ? body.plan : "";
  } catch {
    return Response.json({ error: "bad_request", message: "Body must be JSON: { plan }." }, { status: 400 });
  }

  const plan = planById(planId);
  if (!plan) {
    return Response.json(
      {
        error: "bad_request",
        message: `Unknown plan "${planId}". Expected one of: ${PLANS.map((p) => p.id).join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const price = priceIdFor(plan);

  if (!secret || !price) {
    return Response.json(
      {
        error: "checkout_unavailable",
        message: !secret
          ? "Stripe is not configured on this deployment."
          : `No price configured for ${plan.name} (${plan.priceEnv}).`,
        fallback: requestAccessHref(plan),
        contact: REQUEST_ACCESS_EMAIL,
      },
      { status: 503 },
    );
  }

  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${site}/checkout/success?plan=${plan.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/api-docs#pricing`,
    allow_promotion_codes: "true",
    "subscription_data[metadata][plan]": plan.id,
    "subscription_data[metadata][product]": "arsenal-index",
    "metadata[plan]": plan.id,
  });

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    const data = (await res.json()) as { url?: string; error?: { message?: string } };

    if (!res.ok || !data.url) {
      return Response.json(
        {
          error: "checkout_failed",
          message: data.error?.message ?? `Stripe returned ${res.status}.`,
          fallback: requestAccessHref(plan),
          contact: REQUEST_ACCESS_EMAIL,
        },
        { status: 502 },
      );
    }

    return Response.json({ url: data.url, plan: plan.id });
  } catch (err) {
    return Response.json(
      {
        error: "checkout_failed",
        message: err instanceof Error ? err.message : "Could not reach Stripe.",
        fallback: requestAccessHref(plan),
        contact: REQUEST_ACCESS_EMAIL,
      },
      { status: 502 },
    );
  }
}
