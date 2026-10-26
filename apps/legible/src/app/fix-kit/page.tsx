import type { Metadata } from "next";
import Link from "next/link";
import { ArtifactBrowser } from "@/components/ArtifactBrowser";
import { generateAll, profileFromReport } from "@/lib/fixkit";
import { latestReport } from "@/lib/reports";

export const metadata: Metadata = {
  title: "Fix kit",
  description:
    "Twelve artifacts generated from your audit: llms.txt, JSON-LD schema, a parseable pricing page, an honest comparison page, a structured FAQ, a changelog, and an MCP server.",
};

export default function FixKitPage() {
  const report = latestReport();
  const artifacts = generateAll(profileFromReport(report));

  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--color-line)]">
        <div className="grid-bg pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="wrap py-16">
          <p className="rule-label anim-rise">Deliverable</p>
          <h1 className="anim-rise mt-3 max-w-[22ch] text-[clamp(2.1rem,5.5vw,3.4rem)] font-semibold leading-[1.05]">
            The report ends in files, not advice.
          </h1>
          <p className="anim-rise mt-6 max-w-[62ch] text-[16.5px] leading-relaxed text-[var(--color-muted)] [animation-delay:80ms]">
            Every artifact below was generated from the {report.company} audit by the same code that
            runs in the engagement. Where a fact could not be verified from public pages, the
            generator emits a visible <span className="font-mono text-[var(--color-warn)]">[FILL:…]</span>{" "}
            marker. A plausible invented CAGE code would be worse than a blank one, because somebody
            would ship it.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="pill">{artifacts.length} artifacts</span>
            <span className="pill">generated from {report.domain}</span>
            <span className="pill pill-live">
              <span className="dot" />
              no invented facts
            </span>
          </div>
        </div>
      </section>

      <section className="wrap py-14">
        <ArtifactBrowser artifacts={artifacts} />
      </section>

      <section className="border-t border-[var(--color-line)] bg-[var(--color-ink)] py-16">
        <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="rule-label">Order of operations</p>
            <h2 className="mt-2 text-[26px] font-semibold">What to ship first</h2>
            <p className="mt-4 max-w-[50ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
              The kit is ordered by leverage, not by effort. The first three files move more of the
              score than a full site redesign, and none of them require a designer.
            </p>
            <Link href="/audit" className="btn btn-primary mt-7">
              Get your own kit
            </Link>
          </div>

          <ol className="space-y-4">
            {[
              {
                step: "Week one",
                items: "llms.txt, robots.txt, Organization schema. Three files, one afternoon, and the largest single jump in the score.",
              },
              {
                step: "Week two",
                items: "Capability statement as HTML, structured FAQ, GovCon identity block — CAGE, UEI, NAICS, set-aside, certifications, vehicles.",
              },
              {
                step: "Week three",
                items: "Pricing page and comparison page. These are the two most uncomfortable pages to write and the two that most change how an agent ranks you.",
              },
              {
                step: "Ongoing",
                items: "Changelog entries and, if you want agents to transact rather than only read, the MCP server.",
              },
            ].map((row) => (
              <li key={row.step} className="card p-5">
                <p className="rule-label">{row.step}</p>
                <p className="mt-2.5 max-w-[58ch] text-[14px] leading-relaxed text-[var(--color-body)]">
                  {row.items}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
