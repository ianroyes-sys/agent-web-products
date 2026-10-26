import Link from "next/link";
import CheckoutButton from "./CheckoutButton";
import { PLANS, checkoutReady, requestAccessHref } from "@/lib/plans";
import { FREE_RECOMPETE_ROWS } from "@/lib/paywall";

/**
 * Server component: it reads the Stripe env at render time and decides per
 * plan whether the CTA is a checkout button or a request-access link. The
 * client never has to discover that checkout is unconfigured — there is no
 * flash, and no dead button.
 */
export default function PricingTable({ testMode = true }: { testMode?: boolean }) {
  return (
    <div>
      {/* The free tier is a real, permanent surface, not a trial — it belongs
          on the pricing page, but it is not one of the paid seats. */}
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="pill pill-live">
            <span className="dot" />
            Free forever
          </span>
          <p className="max-w-[62ch] text-[13.5px] leading-[1.6] text-[var(--color-muted)]">
            Every aggregate endpoint and the {FREE_RECOMPETE_ROWS} most urgent recompete rows are open
            with no key and no signup. Free access is what makes the index discoverable, so it does
            not expire.
          </p>
        </div>
        <Link href="/api-docs#endpoints" className="btn btn-ghost h-9 flex-none text-[13px]">
          Start querying
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const ready = checkoutReady(plan);
          const fallback = requestAccessHref(plan);

          return (
            <div
              key={plan.id}
              className="relative flex flex-col rounded-2xl border p-6 transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: plan.featured ? "var(--accent-line)" : "var(--color-line)",
                background: plan.featured
                  ? "linear-gradient(180deg, color-mix(in oklab, var(--accent) 7%, var(--color-raised)), var(--color-surface))"
                  : "var(--color-surface)",
              }}
            >
              {plan.featured ? (
                <span
                  className="absolute right-5 top-5 rounded-full px-2.5 py-1 font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-[0.12em]"
                  style={{ background: "var(--accent)", color: "#0b0c0e" }}
                >
                  Most taken
                </span>
              ) : null}

              <p className="eyebrow">{plan.name}</p>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="num text-[34px] leading-none tracking-[-0.03em] text-[var(--color-chalk)]">
                  {plan.price}
                </span>
                <span className="text-[13px] text-[var(--color-faint)]">{plan.cadence}</span>
              </p>
              <p className="mt-3 min-h-[76px] text-[13.5px] leading-[1.6] text-[var(--color-muted)]">
                {plan.blurb}
              </p>

              <hr className="rule my-5" />

              <ul className="flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li
                    key={f.label}
                    className="flex items-start gap-2.5 text-[13px] text-[var(--color-body)]"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                      className="mt-[3px] flex-none"
                    >
                      <path
                        d="M2.5 7.4 5.5 10.4 11.5 4"
                        stroke={
                          f.soon
                            ? "var(--color-faint)"
                            : plan.featured
                              ? "var(--accent)"
                              : "var(--color-live)"
                        }
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className={f.soon ? "text-[var(--color-faint)]" : undefined}>
                      {f.label}
                      {f.soon ? (
                        <span className="tag ml-1.5 h-[17px] px-1.5 text-[9px]">soon</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.note ? (
                <p
                  className="mt-5 rounded-lg border p-3 text-[11.5px] leading-[1.55] text-[var(--color-muted)]"
                  style={{
                    borderColor: "var(--color-line)",
                    background: "color-mix(in oklab, var(--color-ink) 70%, transparent)",
                  }}
                >
                  {plan.note}
                </p>
              ) : null}

              {ready ? (
                <CheckoutButton
                  plan={plan.id}
                  label={`Start ${plan.name}`}
                  fallbackHref={fallback}
                  featured={plan.featured}
                />
              ) : (
                <a href={fallback} className={`btn mt-6 w-full ${plan.featured ? "btn-primary" : "btn-ghost"}`}>
                  Request access
                </a>
              )}
            </div>
          );
        })}
      </div>

      {testMode ? (
        <p className="mt-5 text-[12px] leading-[1.6] text-[var(--color-faint)]">
          Checkout runs in Stripe <span className="num text-[var(--color-muted)]">test mode</span>. Use
          card <span className="num text-[var(--color-muted)]">4242 4242 4242 4242</span> with any
          future expiry and CVC. Where checkout is not configured, the CTA falls back to email — no
          card is ever charged.
        </p>
      ) : null}
    </div>
  );
}
