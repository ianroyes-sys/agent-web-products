# Stripe catalog — Royz Media Group

Account: `acct_…` (Royz Media Group)

> **TEST MODE ONLY.** Every ID below is a test-mode object. They will not process a
> real payment, and they will **not** carry over to live mode — live products must be
> recreated once the business profile is complete. Live mode also requires the LLC
> entity and EIN, which are not yet on file.

Prices match the ladders in `02-ICP-AND-PRICING.md`. That document is the source of
truth for pricing rationale; this one is the source of truth for IDs. If they ever
disagree, the ICP doc wins and this catalog gets corrected.

Created and reconciled 2026-08-16.

---

## Arsenal Index

| Tier | Price | Product ID | Price ID |
|---|---|---|---|
| Radar | $199 / mo | `prod_…` | `price_…` |
| Capture | $299 / mo | `prod_…` | `price_…` |
| Firm | $599 / mo | `prod_…` | `price_…` |

Free tier (top 15 recompete rows, agency map, movement chart) has no price object —
it is enforced in code by `FREE_RECOMPETE_ROWS`.

Enterprise / bulk data licence at $10,000–25,000 per year is quoted and invoiced
individually, not sold through a price object. Same for all one-off reports
(Incumbent Vulnerability, Teaming Target List, Capability Gap, M&A screening pack).

## Legible

| Tier | Price | Product ID | Price ID |
|---|---|---|---|
| Audit (Small Firm) | $3,000 one-time | `prod_…` | `price_…` |
| Audit + Fix Kit | $9,500 one-time | `prod_…` | `price_…` |
| Measurement Loop | $750 / mo | `prod_…` | `price_…` |

Standard audits ($5,000–7,500) and large-firm engagements ($10,000–20,000) are
quoted and invoiced individually. The Measurement Loop is the actual business —
the audit is customer acquisition that happens to be profitable.

## Come Up

| Tier | Price | Product ID | Price ID |
|---|---|---|---|
| Monthly | $29 / mo | `prod_…` | `price_…` |
| Pro | $49 / mo | `prod_…` | `price_…` |

`price_…` ($19/mo) is retained, not deleted, as the
founding-member rate. $29 is the standing price — a $19 subscription needs roughly
50% more customers for the same revenue and attracts a less committed buyer.

---

## Environment

```bash
# apps/arsenal-index/.env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_RADAR=price_…
STRIPE_PRICE_CAPTURE=price_…
STRIPE_PRICE_FIRM=price_…

# apps/legible/.env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_AUDIT=price_…
STRIPE_PRICE_AUDIT_FIX=price_…
STRIPE_PRICE_LOOP=price_…

# apps/comeup/.env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_MONTHLY=price_…
STRIPE_PRICE_PRO=price_…
STRIPE_PRICE_FOUNDING=price_…
```

Every app degrades safely when `STRIPE_SECRET_KEY` is absent — the CTA becomes a
request or waitlist form rather than a broken redirect. Do not remove that fallback;
it is what makes the sites demoable before live mode exists.

---

## Superseded price objects

Left active but no longer the default, so nothing breaks if referenced:
`price_…` ($299 Radar), `price_…`
($799), `price_…` ($1,999), `price_…`
($3,500 audit). These were first-pass guesses made before the ICP analysis; archive
them once nothing references them.

---

## Before going live

1. Form the entity and obtain the EIN.
2. Complete the Stripe business profile and activate live mode.
3. Recreate these products in live mode — test IDs do not transfer — and update env.
4. Add a physical mailing address; CAN-SPAM requires one before any bulk outreach.
5. Separately, for x402: stand up a stablecoin receiving wallet and confirm the tax
   treatment of stablecoin revenue with an accountant before accepting any.
