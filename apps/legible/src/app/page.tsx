import Link from "next/link";
import { EvidenceList } from "@/components/EvidenceList";
import { Meter } from "@/components/Meter";
import { ScoreDial, bandColor } from "@/components/ScoreDial";
import { latestReport } from "@/lib/reports";
import { BATTERY_SIZE } from "@/lib/audit/prompts";

export default function HomePage() {
  const report = latestReport();
  const unanswerable = report.agentView.filter((q) => q.answerable === "no");
  const missingCritical = report.govcon.signals.filter((s) => !s.found && s.weight === "critical");
  const topFixes = report.fixes.slice(0, 6);
  const generated = new Date(report.generated).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="wrap grid items-start gap-14 pb-20 pt-16 md:pt-24 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div className="anim-rise">
            <span className="pill pill-live">
              <span className="dot" />
              Huntsville defense &amp; aerospace corridor
            </span>

            <h1 className="mt-6 text-[clamp(2.4rem,6vw,4.2rem)] font-semibold leading-[1.02]">
              Make your company legible to the machines that now decide.
            </h1>

            <p className="mt-6 max-w-[58ch] text-[17px] leading-relaxed text-[var(--color-muted)]">
              Buyers no longer start with a search box. They ask an assistant, and the assistant
              answers from what it can read, parse, and verify. If your set-aside status, your CMMC
              level, and your contract vehicles are not written down where a machine can find them,
              you are not losing the deal — you are never in it.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/audit" className="btn btn-primary">
                Run an audit on your domain
              </Link>
              <Link href="/report/latest" className="btn btn-ghost">
                See a real report
              </Link>
            </div>

            <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-[var(--color-line)] pt-7">
              {[
                { term: "Dimensions scored", value: "8" },
                { term: "Buyer prompts", value: String(BATTERY_SIZE) },
                { term: "Artifacts shipped", value: "12" },
              ].map((stat) => (
                <div key={stat.term}>
                  <dd className="font-mono text-[26px] tabular-nums text-[var(--color-chalk)]">
                    {stat.value}
                  </dd>
                  <dt className="rule-label mt-1">{stat.term}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Live specimen. Real numbers from a real committed audit. */}
          <div className="card anim-rise overflow-hidden p-6 [animation-delay:120ms] md:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="rule-label">Specimen audit</p>
                <p className="mt-1 text-[15px] font-medium text-[var(--color-chalk)]">
                  {report.company}
                </p>
                <p className="font-mono text-[11px] text-[var(--color-faint)]">{report.domain}</p>
              </div>
              <span className="pill">{generated}</span>
            </div>

            <div className="mt-6 flex justify-center">
              <ScoreDial score={report.score} grade={report.grade} size={200} />
            </div>

            <ul className="mt-6 space-y-3">
              {report.dimensions.map((dimension, index) => (
                <li key={dimension.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-[var(--color-body)]">{dimension.label}</span>
                    <span
                      className="font-mono text-[12px] tabular-nums"
                      style={{ color: bandColor(dimension.score) }}
                    >
                      {dimension.score}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <Meter score={dimension.score} delay={index * 70} height={4} />
                  </div>
                </li>
              ))}
              <li>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-[var(--color-body)]">GovCon signals</span>
                  <span
                    className="font-mono text-[12px] tabular-nums"
                    style={{ color: bandColor(report.govcon.score) }}
                  >
                    {report.govcon.score}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Meter score={report.govcon.score} delay={520} height={4} />
                </div>
              </li>
            </ul>

            <Link
              href={`/report/${report.id}`}
              className="mt-6 block text-[13px] text-[var(--color-muted)] link-underline"
            >
              Open the full report →
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- The screenshot ---------------- */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-ink)] py-20">
        <div className="wrap">
          <p className="rule-label">The argument</p>
          <h2 className="mt-3 max-w-[22ch] text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-[1.1]">
            We are not selling you the future. We are selling you the screenshot.
          </h2>
          <p className="mt-5 max-w-[62ch] text-[16px] leading-relaxed text-[var(--color-muted)]">
            There is no forecasting in this pitch. We ask an agent the questions your buyers are
            already asking, we record what comes back, and we hand you the transcript. Below is the
            real result for {report.company}, generated {generated} from public pages only.
          </p>

          <div className="mt-10 overflow-hidden rounded-2xl border border-[var(--color-line)]">
            <div className="flex items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-raised)] px-5 py-3">
              <span className="dot bg-[var(--color-hot)]" />
              <span className="font-mono text-[11px] text-[var(--color-faint)]">
                agent transcript · {report.domain} · what a machine can answer today
              </span>
            </div>
            <ul className="divide-y divide-[var(--color-line-soft)] bg-[var(--color-surface)]">
              {unanswerable.slice(0, 4).map((question) => (
                <li key={question.id} className="grid gap-3 px-5 py-5 md:grid-cols-[1fr_1.2fr] md:gap-8">
                  <p className="text-[15px] font-medium text-[var(--color-chalk)]">
                    <span className="mr-2 font-mono text-[12px] text-[var(--color-faint)]">Q</span>
                    {question.question}
                  </p>
                  <div>
                    <span className="chip chip-fail">CANNOT ANSWER</span>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                      {question.fromSite}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 max-w-[62ch] text-[14px] leading-relaxed text-[var(--color-faint)]">
            None of this says the company lacks the qualification. It says the qualification is not
            written down, and an agent cannot recommend what it cannot read.
          </p>
        </div>
      </section>

      {/* ---------------- GovCon hard filters ---------------- */}
      <section className="py-20">
        <div className="wrap grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="rule-label">The hard filter</p>
            <h2 className="mt-3 text-[clamp(1.7rem,3.6vw,2.4rem)] font-semibold leading-[1.12]">
              One query decides it, and you never see the query.
            </h2>
            <blockquote className="quote mt-6 max-w-[52ch] text-[14px]">
              {report.govcon.failedQuery}
            </blockquote>
            <p className="mt-6 max-w-[54ch] text-[15.5px] leading-relaxed text-[var(--color-muted)]">
              A firm that holds every one of those qualifications and states none of them is filtered
              out before a human reads a word. There is no rejection email. There is no debrief. The
              shortlist simply forms without you.
            </p>
            <Link href="/how-it-works" className="mt-7 inline-flex text-[14px] link-underline">
              How the audit works →
            </Link>
          </div>

          <div className="card p-6 md:p-7">
            <div className="flex items-baseline justify-between">
              <p className="rule-label">Hard-filter fields · {report.company}</p>
              <span className="font-mono text-[12px] tabular-nums text-[var(--color-faint)]">
                {report.govcon.signals.filter((s) => s.found).length}/{report.govcon.signals.length} stated
              </span>
            </div>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {report.govcon.signals.map((signal) => (
                <li
                  key={signal.id}
                  className="flex items-start gap-2.5 rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-raised)] px-3 py-2.5"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full"
                    style={{
                      background: signal.found ? "var(--color-live)" : "var(--color-hot)",
                      boxShadow: `0 0 8px ${signal.found ? "var(--color-live)" : "var(--color-hot)"}`,
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] text-[var(--color-chalk)]">{signal.label}</p>
                    <p className="truncate font-mono text-[11px] text-[var(--color-faint)]">
                      {signal.found ? signal.value ?? "stated" : "not stated"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {missingCritical.length > 0 && (
              <p className="mt-5 border-t border-[var(--color-line-soft)] pt-4 text-[13px] leading-relaxed text-[var(--color-muted)]">
                {report.govcon.verdict}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- Dimensions ---------------- */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-ink)] py-20">
        <div className="wrap">
          <p className="rule-label">What gets measured</p>
          <h2 className="mt-3 max-w-[24ch] text-[clamp(1.7rem,3.6vw,2.4rem)] font-semibold leading-[1.12]">
            Eight dimensions, every one with evidence attached.
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {report.dimensions.map((dimension) => (
              <article key={dimension.id} className="card flex flex-col p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[15px] font-semibold">{dimension.label}</h3>
                  <span
                    className="font-mono text-[15px] tabular-nums"
                    style={{ color: bandColor(dimension.score) }}
                  >
                    {dimension.score}
                  </span>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-muted)]">
                  {dimension.question}
                </p>
                <p className="mt-auto pt-4 font-mono text-[11px] text-[var(--color-faint)]">
                  weight {(dimension.weight * 100).toFixed(0)}%
                </p>
              </article>
            ))}
            <article className="card flex flex-col p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-[15px] font-semibold">GovCon signals</h3>
                <span
                  className="font-mono text-[15px] tabular-nums"
                  style={{ color: bandColor(report.govcon.score) }}
                >
                  {report.govcon.score}
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-muted)]">
                Can an agent screen this firm against a solicitation&apos;s hard requirements?
              </p>
              <p className="mt-auto pt-4 font-mono text-[11px] text-[var(--color-faint)]">weight 15%</p>
            </article>
          </div>
        </div>
      </section>

      {/* ---------------- Fog specimen ---------------- */}
      {report.fog.worstSentence && (
        <section className="py-20">
          <div className="wrap grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="rule-label">Fog index</p>
              <h2 className="mt-3 text-[clamp(1.7rem,3.6vw,2.4rem)] font-semibold leading-[1.12]">
                The sentence a model will summarize you with.
              </h2>
              <blockquote className="quote mt-6 text-[13.5px]">
                {report.fog.worstSentence}
              </blockquote>
              <p className="mt-5 max-w-[56ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
                We score marketing fog with a weighted phrase list and report it per 1,000 words.
                {" "}{report.company} sits at{" "}
                <span className="font-mono text-[var(--color-chalk)]">{report.fog.per1k}</span> across{" "}
                <span className="font-mono">{report.fog.words.toLocaleString()}</span> words. Fog is the
                one defect that survives every redesign, because nobody is ever assigned to it.
              </p>
            </div>

            <div className="card p-6">
              <p className="rule-label">Most repeated stock phrases</p>
              <ul className="mt-5 space-y-3">
                {report.fog.hits.slice(0, 7).map((hit) => {
                  const max = report.fog.hits[0]?.count || 1;
                  return (
                    <li key={hit.phrase}>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-mono text-[12.5px] text-[var(--color-body)]">
                          {hit.phrase}
                        </span>
                        <span className="font-mono text-[12px] tabular-nums text-[var(--color-faint)]">
                          ×{hit.count}
                        </span>
                      </div>
                      <div className="meter mt-1.5" style={{ height: 4 }}>
                        <span
                          className="anim-bar"
                          style={{
                            width: `${(hit.count / max) * 100}%`,
                            background: "var(--color-warn)",
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Fixes ---------------- */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-ink)] py-20">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="rule-label">The deliverable</p>
              <h2 className="mt-3 max-w-[26ch] text-[clamp(1.7rem,3.6vw,2.4rem)] font-semibold leading-[1.12]">
                A prioritized fix list, and the files that execute it.
              </h2>
            </div>
            <Link href="/fix-kit" className="btn btn-ghost">
              Browse the fix kit
            </Link>
          </div>

          <div className="mt-9 overflow-x-auto rounded-2xl border border-[var(--color-line)]">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="bg-[var(--color-raised)]">
                  <th className="rule-label px-5 py-3 font-normal">Fix</th>
                  <th className="rule-label px-5 py-3 font-normal">Dimension</th>
                  <th className="rule-label px-5 py-3 font-normal">Impact</th>
                  <th className="rule-label px-5 py-3 font-normal">Effort</th>
                  <th className="rule-label px-5 py-3 font-normal">Artifact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line-soft)] bg-[var(--color-surface)]">
                {topFixes.map((fix) => (
                  <tr key={fix.id}>
                    <td className="px-5 py-4 text-[14px] text-[var(--color-chalk)]">{fix.title}</td>
                    <td className="px-5 py-4 font-mono text-[12px] text-[var(--color-faint)]">
                      {fix.dimension}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-[12px] tabular-nums text-[var(--color-live)]">
                        {"■".repeat(fix.impact)}
                        <span className="text-[var(--color-line)]">{"■".repeat(5 - fix.impact)}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[12px] text-[var(--color-muted)]">
                      {fix.effort}
                    </td>
                    <td className="px-5 py-4 font-mono text-[12px] text-[var(--color-faint)]">
                      {fix.artifact ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------------- Method sample ---------------- */}
      <section className="py-20">
        <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="rule-label">No black box</p>
            <h2 className="mt-3 text-[clamp(1.6rem,3.4vw,2.2rem)] font-semibold leading-[1.14]">
              Every point is traceable to a string we read off your site.
            </h2>
            <p className="mt-5 max-w-[48ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
              A score you cannot argue with is a score nobody acts on. Each check states what it
              looked for, what it found, and the points it moved — with the literal excerpt quoted
              underneath. Here are the discoverability checks from the specimen audit.
            </p>
          </div>

          <div className="card p-6">
            <EvidenceList evidence={report.dimensions[0].evidence.slice(0, 5)} />
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="pb-24">
        <div className="wrap">
          <div className="card relative overflow-hidden p-10 text-center md:p-14">
            <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative">
              <h2 className="mx-auto max-w-[20ch] text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-[1.1]">
                Find out what the machines say about you.
              </h2>
              <p className="mx-auto mt-5 max-w-[52ch] text-[15.5px] leading-relaxed text-[var(--color-muted)]">
                One domain, one report, one prioritized list. If the audit finds nothing worth fixing,
                we will tell you that too — and you will have the transcript to prove it.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/audit" className="btn btn-primary">
                  Request an audit
                </Link>
                <Link href="/pricing" className="btn btn-ghost">
                  See pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
