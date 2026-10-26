import type { Metadata } from "next";
import Link from "next/link";
import { planById } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Access confirmed",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccess({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; session_id?: string }>;
}) {
  const { plan: planId, session_id } = await searchParams;
  const plan = planId ? planById(planId) : undefined;

  return (
    <div className="wrap flex min-h-[68vh] flex-col items-center justify-center py-20 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full border"
        style={{ borderColor: "var(--accent-line)", background: "var(--accent-dim)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 12.5 10 17.5 19 7"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <p className="eyebrow mt-6">Subscription started</p>
      <h1 className="mt-3 max-w-[22ch] text-[clamp(26px,4.6vw,40px)] font-semibold leading-[1.1]">
        {plan ? `${plan.name} is active` : "Your access is active"}
      </h1>
      <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.65] text-[var(--color-muted)]">
        Your API key is on its way by email. Until it lands, the full radar is already unlocked in the
        browser — every row, every incumbent, every deep link.
      </p>

      <p className="mt-5 max-w-[52ch] text-[12.5px] leading-[1.6] text-[var(--color-faint)]">
        This deployment runs Stripe in test mode, so no card was charged.
      </p>

      {session_id ? (
        <p className="num mt-3 text-[11px] text-[var(--color-faint)]">session {session_id.slice(0, 24)}…</p>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/radar" className="btn btn-primary">
          Open the radar
        </Link>
        <Link href="/api-docs" className="btn btn-ghost">
          API reference
        </Link>
      </div>
    </div>
  );
}
