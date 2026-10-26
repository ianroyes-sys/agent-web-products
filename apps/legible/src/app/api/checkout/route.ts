import { NextResponse } from "next/server";
import { tier } from "@/lib/pricing";

/* Stripe Checkout, called over the REST API so the app carries no SDK.
 *
 * The account behind this is in TEST MODE. If STRIPE_SECRET_KEY is absent
 * the route returns a 503 with a machine-readable reason, and the UI falls
 * back to requesting an invoice. It never renders a checkout button that
 * leads somewhere broken. */

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        reason: "stripe-not-configured",
        error: "Card checkout is not enabled on this deployment. Request an invoice instead.",
      },
      { status: 503 },
    );
  }

  let tierId = "";
  try {
    const body = (await request.json()) as { tier?: unknown };
    tierId = typeof body.tier === "string" ? body.tier : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const selected = tier(tierId);
  if (!selected) {
    return NextResponse.json({ ok: false, error: "Unknown tier." }, { status: 422 });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? request.headers.get("origin") ?? "http://localhost:4802";

  const params = new URLSearchParams({
    mode: selected.cadence === "per month" ? "subscription" : "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(selected.price * 100),
    "line_items[0][price_data][product_data][name]": `Legible — ${selected.name}`,
    "line_items[0][price_data][product_data][description]": selected.tagline,
    success_url: `${origin}/audit?checkout=success&tier=${selected.id}`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    "metadata[tier]": selected.id,
  });

  if (selected.cadence === "per month") {
    params.set("line_items[0][price_data][recurring][interval]", "month");
  }

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const payload = (await res.json()) as { url?: string; error?: { message?: string } };

    if (!res.ok || !payload.url) {
      return NextResponse.json(
        { ok: false, error: payload.error?.message ?? "Stripe rejected the session request." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      url: payload.url,
      testMode: secret.startsWith("sk_test_"),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Checkout is unavailable." },
      { status: 502 },
    );
  }
}
