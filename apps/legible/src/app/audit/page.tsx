import type { Metadata } from "next";
import Link from "next/link";
import { AuditRequestForm } from "@/components/AuditRequestForm";
import { PROMPT_BATTERY } from "@/lib/audit/prompts";
import { GOVCON_SIGNALS } from "@/lib/audit/govcon";

export const metadata: Metadata = {
  title: "Run an audit",
  description:
    "Queue an agent readiness audit for your domain. Eight dimensions, evidence for every point, a prioritized fix list.",
};

const INCLUDED = [
  {
    title: "The crawl record",
    body: "Every path an agent would try, with status codes. The 404s are the point.",
  },
  {
    title: "Eight scored dimensions",
    body: "Discoverable, Parseable, Priced, Comparable, Proven, Current, Fog, and the GovCon overlay — each with quoted evidence.",
  },
  {
    title: `${GOVCON_SIGNALS.length} hard-filter fields`,
    body: "CAGE, UEI, NAICS, set-aside status, CMMC, vehicles, clearance, past performance. Stated or absent, with the excerpt.",
  },
  {
    title: `${PROMPT_BATTERY.length} buyer-intent prompts`,
    body: "What assistants say about you today, recorded verbatim. Dry-run mode is labeled as such and invents nothing.",
  },
  {
    title: "A prioritized fix list",
    body: "Impact and effort on every item, ordered so the first week is the highest-leverage week.",
  },
  {
    title: "The fix kit",
    body: "llms.txt, JSON-LD, pricing page, comparison page, structured FAQ, changelog, MCP server. Files, not advice.",
  },
];

export default function AuditPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--color-line)]">
        <div className="grid-bg pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="wrap py-14 md:py-18">
          <p className="rule-label anim-rise">Intake</p>
          <h1 className="anim-rise mt-3 max-w-[18ch] text-[clamp(2.1rem,5.5vw,3.4rem)] font-semibold leading-[1.05]">
            Find out what the machines say about you.
          </h1>
          <p className="anim-rise mt-6 max-w-[58ch] text-[16.5px] leading-relaxed text-[var(--color-muted)] [animation-delay:80ms]">
            One domain, one report. We read only public pages, we quote everything we score, and we
            tell you plainly if there is nothing worth fixing.
          </p>
        </div>
      </section>

      <section className="wrap grid gap-12 py-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <AuditRequestForm />

        <aside>
          <p className="rule-label">What you get back</p>
          <ul className="mt-5 space-y-4">
            {INCLUDED.map((item) => (
              <li key={item.title} className="border-l border-[var(--color-line)] pl-4">
                <p className="text-[14.5px] font-medium text-[var(--color-chalk)]">{item.title}</p>
                <p className="mt-1.5 max-w-[46ch] text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="card mt-8 p-5">
            <p className="rule-label">Prefer to run it yourself</p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
              The engine is a command. If you would rather see the raw JSON before you talk to anyone,
              run it and read the output.
            </p>
            <pre className="mt-4 overflow-x-auto font-mono text-[12px] text-[var(--color-body)]">
{`node scripts/audit.mjs yourdomain.com \\
  --out report.json`}
            </pre>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/report/latest" className="btn btn-ghost">
              Read a finished report
            </Link>
            <Link href="/pricing" className="btn btn-ghost">
              Pricing
            </Link>
          </div>
        </aside>
      </section>
    </>
  );
}
