/* Pricing.
 *
 * Three tiers, all of them one-time except the measurement loop, which is
 * the only line that compounds. Amounts are the entry point of each band —
 * scope moves the number, and the report is what makes that conversation
 * short. */

export interface Tier {
  id: "audit" | "enterprise" | "loop";
  name: string;
  tagline: string;
  /** Entry price in whole dollars. */
  price: number;
  cadence: "one-time" | "per month";
  range: string;
  bestFor: string;
  features: string[];
  featured?: boolean;
}

export const TIERS: Tier[] = [
  {
    id: "audit",
    name: "Audit + cleanup",
    tagline: "The screenshot, the score, and the files that change it.",
    price: 3000,
    cadence: "one-time",
    range: "$3,000 – $10,000 depending on site size and remediation scope",
    bestFor: "Small and mid-size contractors, 20–500 people.",
    features: [
      "Full eight-dimension audit with quoted evidence",
      "GovCon hard-filter review across all 16 signals",
      "Buyer-intent prompt battery, recorded verbatim",
      "Prioritized fix list with impact and effort",
      "The complete fix kit, generated for your entity",
      "One working session to fill the claims column",
    ],
    featured: true,
  },
  {
    id: "enterprise",
    name: "Multi-site program",
    tagline: "Several domains, several business units, one standard.",
    price: 10000,
    cadence: "one-time",
    range: "$10,000 – $20,000 depending on domain count",
    bestFor: "Larger firms, holding companies, and primes standardizing their supplier-facing web.",
    features: [
      "Everything in Audit + cleanup, per domain",
      "Cross-domain scoring so business units are comparable",
      "Competitor benchmark set of up to five firms",
      "Implementation handoff for your web team",
      "Schema and llms.txt conventions documented as a standard",
      "Executive readout built from the reports, not from slides",
    ],
  },
  {
    id: "loop",
    name: "Measurement loop",
    tagline: "Re-run the battery, track the movement, prove the work.",
    price: 500,
    cadence: "per month",
    range: "$500 – $1,500 / month depending on cadence and domain count",
    bestFor: "Firms that fixed the obvious and now want the number to keep moving.",
    features: [
      "Monthly re-audit with score deltas per dimension",
      "Battery re-run with answer diffs against last month",
      "Mention-rate tracking on discovery prompts",
      "Alerts when a competitor's legibility overtakes yours",
      "Quarterly written readout",
      "Cancel any month; the reports stay yours",
    ],
  },
];

export function tier(id: string): Tier | undefined {
  return TIERS.find((entry) => entry.id === id);
}

export const INVOICE_EMAIL = "hello@royzmediagroup.com";

export function invoiceMailto(selected: Tier): string {
  const subject = `Legible — ${selected.name} (invoice request)`;
  const body = [
    `Tier: ${selected.name}`,
    `Entry price: $${selected.price.toLocaleString()} ${selected.cadence}`,
    "",
    "Domain(s):",
    "Company:",
    "Billing contact:",
    "",
    "Notes:",
  ].join("\n");
  return `mailto:${INVOICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
