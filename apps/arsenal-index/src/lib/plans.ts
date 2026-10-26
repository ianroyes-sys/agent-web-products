/**
 * Subscription plans, backed by real Stripe TEST-mode prices on the Royz Media
 * Group account.
 *
 * Price IDs come from env so nothing account-specific is committed, and so a
 * live-mode swap is a config change rather than a code change. If a price ID
 * or the secret key is missing, the plan degrades to a request-access CTA —
 * never a dead button or a broken redirect.
 */

export type PlanId = "radar" | "intelligence" | "agent_api";

export interface PlanFeature {
  label: string;
  /** Roadmap, not shipped. Rendered with a "soon" marker so it never reads as a claim. */
  soon?: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: PlanFeature[];
  featured?: boolean;
  /** Env var holding the Stripe price ID. */
  priceEnv: string;
  /** Extra copy rendered under the feature list. */
  note?: string;
}

export const REQUEST_ACCESS_EMAIL = "hello@royzmediagroup.com";

export const PLANS: Plan[] = [
  {
    id: "radar",
    name: "Radar",
    price: "$299",
    cadence: "per month",
    blurb:
      "The full recompete radar, unlocked. Every expiring contract in the market with the incumbent, the value, and the deep link.",
    priceEnv: "STRIPE_PRICE_RADAR",
    features: [
      { label: "All 1,463 expiring contracts, no row limit" },
      { label: "Full firm detail and capability gap" },
      { label: "API key for every REST endpoint" },
      { label: "Filters by agency, NAICS, urgency band, value" },
      { label: "Weekly digest of what changed on the radar", soon: true },
    ],
  },
  {
    id: "intelligence",
    name: "Intelligence",
    price: "$799",
    cadence: "per month",
    blurb:
      "Everything in Radar, plus the whole index in bulk — for teams running their own analysis against it.",
    priceEnv: "STRIPE_PRICE_INTELLIGENCE",
    featured: true,
    features: [
      { label: "Everything in Radar" },
      { label: "Bulk export — full JSON bundle and radar CSV" },
      { label: "Capability gap across your whole portfolio" },
      { label: "Movement and concentration history" },
      { label: "Custom NAICS and agency watchlists", soon: true },
    ],
  },
  {
    id: "agent_api",
    name: "Agent API",
    price: "$1,999",
    cadence: "per month",
    blurb:
      "Unmetered programmatic access for products and agents built on top of the index. Both MCP transports included.",
    priceEnv: "STRIPE_PRICE_AGENT_API",
    features: [
      { label: "Everything in Intelligence" },
      { label: "Unmetered REST access on a single key" },
      { label: "MCP over streamable HTTP and stdio" },
      { label: "Redistribution rights within your product" },
      { label: "Priority on new markets as they are refined" },
    ],
    note: "For machine callers, this seat is a stopgap. Per-lookup x402 settlement is the intended rail for agents and will replace the subscription for that traffic once Cloudflare's Monetization Gateway opens — it is waitlist-only today, not generally available.",
  },
];

export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

/** Server-side only: the configured Stripe price ID for a plan, if any. */
export function priceIdFor(plan: Plan): string | undefined {
  const value = process.env[plan.priceEnv];
  return value && value.trim() ? value.trim() : undefined;
}

/**
 * Whether checkout can actually complete. Both the secret key and the plan's
 * price ID have to be present — a key without a price is still a dead button.
 */
export function checkoutReady(plan: Plan): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim()) && Boolean(priceIdFor(plan));
}

export function requestAccessHref(plan: Plan): string {
  const subject = encodeURIComponent(`Arsenal Index — ${plan.name} access`);
  const body = encodeURIComponent(
    `I'd like access to the Arsenal Index ${plan.name} tier (${plan.price} ${plan.cadence}).\n\nOrganization:\nUse case:\nNAICS / agencies of interest:\n`,
  );
  return `mailto:${REQUEST_ACCESS_EMAIL}?subject=${subject}&body=${body}`;
}
