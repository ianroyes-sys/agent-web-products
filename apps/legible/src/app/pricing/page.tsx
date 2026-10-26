import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutButton } from "@/components/CheckoutButton";
import { TIERS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Audit and cleanup from $3,000. Multi-site programs from $10,000. The monthly measurement loop from $500.",
};

const FAQS = [
  {
    q: "What if the audit finds nothing worth fixing?",
    a: "Then we tell you that, you keep the report, and we do not sell you a cleanup. It has not happened yet in this market, but the audit is priced as an audit for exactly this reason.",
  },
  {
    q: "Do you need access to our website or CMS?",
    a: "No. Everything in the audit comes from public pages. Implementation is either handed to your web team as files, or done by us if you would rather not touch it.",
  },
  {
    q: "Is any of this going to conflict with OPSEC or release constraints?",
    a: "The fix kit is built around what you are cleared to publish. Naming a program you cannot name is not legibility, it is a problem. Where a fact is restricted, we structure around it — set-aside status, codes, certifications, and vehicles are all publicly releasable and are where most of the score lives.",
  },
  {
    q: "Why is there a monthly option?",
    a: "Because the answer changes. Models update, competitors publish, and a score that moved once will drift back. The loop re-runs the battery and reports the delta. It is optional, and most firms start without it.",
  },
  {
    q: "How fast is the first report?",
    a: "The crawl and scoring take seconds. The read-through, the claims column, and the fix kit take two business days.",
  },
];

export default function PricingPage() {
  const secret = process.env.STRIPE_SECRET_KEY;
  const checkoutEnabled = Boolean(secret);
  const testMode = Boolean(secret?.startsWith("sk_test_"));

  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--color-line)]">
        <div className="grid-bg pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="wrap py-16">
          <p className="rule-label anim-rise">Pricing</p>
          <h1 className="anim-rise mt-3 max-w-[20ch] text-[clamp(2.1rem,5.5vw,3.4rem)] font-semibold leading-[1.05]">
            Priced against the deal you are losing silently.
          </h1>
          <p className="anim-rise mt-6 max-w-[60ch] text-[16.5px] leading-relaxed text-[var(--color-muted)] [animation-delay:80ms]">
            One task order recovered pays for the program several times over. The audit is priced so
            that you can find out whether there is a problem before you commit to fixing it.
          </p>

          {testMode && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_oklab,var(--color-warn)_40%,transparent)] bg-[color-mix(in_oklab,var(--color-warn)_10%,transparent)] px-3 py-2 font-mono text-[12px] text-[var(--color-warn)]">
              Stripe is in TEST MODE on this deployment. No card is charged.
            </p>
          )}
        </div>
      </section>

      <section className="wrap py-14">
        <div className="grid items-start gap-5 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <article
              key={tier.id}
              className={`card relative flex h-full flex-col p-7 ${
                tier.featured ? "border-[var(--accent-line)] shadow-[0_0_40px_-18px_var(--accent)]" : ""
              }`}
            >
              {tier.featured && (
                <span className="pill pill-live absolute -top-3 left-7">
                  <span className="dot" />
                  Most engagements start here
                </span>
              )}

              <h2 className="text-[19px] font-semibold">{tier.name}</h2>
              <p className="mt-2 min-h-[42px] max-w-[38ch] text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                {tier.tagline}
              </p>

              <p className="mt-6 flex items-baseline gap-2">
                <span className="font-mono text-[38px] leading-none tabular-nums text-[var(--color-chalk)]">
                  ${tier.price.toLocaleString()}
                </span>
                <span className="text-[13px] text-[var(--color-faint)]">
                  {tier.cadence === "per month" ? "/ month" : "one-time"}
                </span>
              </p>
              <p className="mt-2 text-[12.5px] text-[var(--color-faint)]">{tier.range}</p>

              <ul className="mt-6 space-y-2.5 border-t border-[var(--color-line-soft)] pt-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-[13.5px] leading-relaxed text-[var(--color-body)]">
                    <span aria-hidden="true" className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--accent)]" />
                    {feature}
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-[12.5px] leading-relaxed text-[var(--color-faint)]">
                {tier.bestFor}
              </p>

              <div className="mt-6 pt-1">
                <CheckoutButton tier={tier} checkoutEnabled={checkoutEnabled} />
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 max-w-[70ch] text-[13.5px] leading-relaxed text-[var(--color-faint)]">
          Prices are the entry point of each band. Scope moves the number, and the report is what
          makes that conversation short — you will have seen the fix list before anyone quotes you.
        </p>
      </section>

      <section className="border-t border-[var(--color-line)] bg-[var(--color-ink)] py-16">
        <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="rule-label">Questions</p>
            <h2 className="mt-2 text-[26px] font-semibold">The ones people actually ask</h2>
            <Link href="/audit" className="btn btn-primary mt-7">
              Queue an audit
            </Link>
          </div>

          <dl className="divide-y divide-[var(--color-line-soft)] rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
            {FAQS.map((faq) => (
              <div key={faq.q} className="px-6 py-5">
                <dt className="text-[15px] font-medium text-[var(--color-chalk)]">{faq.q}</dt>
                <dd className="mt-2.5 max-w-[64ch] text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                  {faq.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
