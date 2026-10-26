/**
 * HTTP 402 gate, modelled on Cloudflare's x402 flow.
 *
 * An agent hits a paid resource with no credential, gets a machine-readable
 * 402 describing the price and how to pay, then retries with X-Payment or
 * X-API-Key. Nothing here settles money — that is Stripe's job — but the
 * handshake is the part agents need to be able to discover and parse.
 */
import { NextResponse } from "next/server";
import { getMeta } from "./data";

export const FREE_RECOMPETE_ROWS = 15;

export type Scheme = "x402" | "api_key";

export interface Price {
  amount: number;
  currency: "USD";
  unit: string;
}

/** Per-call prices. Kept here so /api-docs and the 402 body can never drift. */
export const PRICES = {
  "recompetes.full": { amount: 0.02, currency: "USD", unit: "call" },
  "firms.detail": { amount: 0.01, currency: "USD", unit: "call" },
  "export.bulk": { amount: 2.5, currency: "USD", unit: "export" },
} as const satisfies Record<string, Price>;

export type Resource = keyof typeof PRICES;

export interface PaymentState {
  paid: boolean;
  via: Scheme | null;
}

function allowlist(): string[] {
  return (process.env.ARSENAL_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Constant-time-ish comparison. The key space is tiny and self-issued, but
 * leaking length/prefix through early exit is a bad habit to ship.
 */
function keyMatches(presented: string, known: string): boolean {
  if (presented.length !== known.length) return false;
  let diff = 0;
  for (let i = 0; i < presented.length; i++) diff |= presented.charCodeAt(i) ^ known.charCodeAt(i);
  return diff === 0;
}

/**
 * x402 settlement is not live. Cloudflare's Monetization Gateway — which
 * settles peer-to-peer in stablecoins to a wallet, entirely outside Stripe —
 * is waitlist-only, so there is no facilitator to verify a proof against.
 *
 * Until there is, accepting an unverified X-Payment header would mean anyone
 * who read the docs could walk past the paywall with a long random string. The
 * branch stays implemented and off, behind an explicit flag.
 */
export function x402Enabled(): boolean {
  return process.env.X402_ENABLED === "1";
}

export function checkPayment(req: Request): PaymentState {
  const keys = allowlist();
  const presented =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (presented && keys.some((k) => keyMatches(presented, k))) {
    return { paid: true, via: "api_key" };
  }

  const proof = req.headers.get("x-payment");
  if (x402Enabled() && proof && proof.trim().length > 16) {
    return { paid: true, via: "x402" };
  }

  return { paid: false, via: null };
}

/** The canonical 402 body. Agents parse this, so its shape is a contract. */
export function paymentRequired(resource: Resource, hint?: string): NextResponse {
  const price = PRICES[resource];
  const body = {
    error: "payment_required",
    resource,
    message: hint ?? `The ${resource} resource requires payment.`,
    price: { amount: price.amount, currency: price.currency, unit: price.unit },
    accepts: ["x402", "api_key"] satisfies Scheme[],
    // Two distinct rails, and they are not equally available. Say which is
    // which rather than letting an agent burn a retry finding out.
    schemes: {
      api_key: {
        status: "available",
        header: "X-API-Key",
        settlement: "Stripe subscription",
        subscribe: "/api-docs#pricing",
      },
      x402: {
        status: "pending",
        header: "X-Payment",
        settlement: "peer-to-peer stablecoin, via Cloudflare Monetization Gateway",
        note: "Waitlist-only, not generally available. Per-lookup settlement opens when the gateway does.",
      },
    },
    free_tier: {
      recompete_rows: FREE_RECOMPETE_ROWS,
      endpoints: ["/api/v1/market", "/api/v1/agencies", "/api/v1/naics", "/api/v1/firms"],
    },
    docs: "/api-docs",
    retry: x402Enabled()
      ? "Retry with an X-Payment header (x402) or X-API-Key header."
      : "Retry with an X-API-Key header. The x402 rail is not settling yet — see /api-docs#payment.",
  };

  return NextResponse.json(body, {
    status: 402,
    headers: {
      // WWW-Authenticate-style challenge so generic HTTP clients can see the
      // terms without parsing the body.
      "WWW-Authenticate": `x402 realm="arsenal-index", resource="${resource}", price="${price.amount}", currency="USD"`,
      "X-Payment-Required": `${price.amount} USD per ${price.unit}`,
      "Cache-Control": "no-store",
    },
  });
}

export interface MetaBlock {
  generated: string;
  source: string;
  market: string;
  publisher: string;
  license: string;
  tier: "free" | "paid";
  count?: number;
  total?: number;
  truncated?: boolean;
  paid_via?: Scheme;
  upgrade?: string;
}

/**
 * Every response carries provenance. Freshness and source are what let an
 * agent decide whether to trust the answer, so they are never optional.
 */
export function metaBlock(extra: Partial<MetaBlock> = {}): MetaBlock {
  const m = getMeta();
  return {
    generated: m.generated,
    source: m.source,
    market: m.market,
    publisher: m.publisher,
    license: m.license,
    tier: "free",
    ...extra,
  };
}

export function ok<T>(data: T, meta: Partial<MetaBlock> = {}): NextResponse {
  return NextResponse.json(
    { meta: metaBlock(meta), data },
    {
      headers: {
        "X-Index-Generated": getMeta().generated,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: "bad_request", message }, { status: 400 });
}

export function notFound(message: string): NextResponse {
  return NextResponse.json({ error: "not_found", message }, { status: 404 });
}

/** Shared ?limit / ?offset parsing with sane ceilings. */
export function page(url: URL, defaultLimit = 50, maxLimit = 500): { limit: number; offset: number } {
  const rawLimit = Number(url.searchParams.get("limit") ?? defaultLimit);
  const rawOffset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), maxLimit) : defaultLimit;
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;
  return { limit, offset };
}
