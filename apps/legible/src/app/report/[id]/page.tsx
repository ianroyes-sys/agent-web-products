import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceList } from "@/components/EvidenceList";
import { Meter } from "@/components/Meter";
import { ScoreDial, bandColor } from "@/components/ScoreDial";
import { getReport, reportIds } from "@/lib/reports";
import type { AgentQuestion, GovConSignal } from "@/lib/audit/types";

export function generateStaticParams() {
  return reportIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const report = getReport(id);
  if (!report) return { title: "Report not found" };
  return {
    title: `${report.company} — legibility ${report.score}/100`,
    description: report.headline,
  };
}

const ANSWER_CHIP: Record<AgentQuestion["answerable"], { label: string; className: string }> = {
  yes: { label: "ANSWERABLE", className: "chip chip-pass" },
  partial: { label: "PARTIAL", className: "chip chip-partial" },
  no: { label: "CANNOT ANSWER", className: "chip chip-fail" },
};

const WEIGHT_LABEL: Record<GovConSignal["weight"], string> = {
  critical: "hard filter",
  high: "screening",
  medium: "context",
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = getReport(id);
  if (!report) notFound();

  const generated = new Date(report.generated).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const crawled = report.pages.filter((page) => page.ok);
  const missingCritical = report.govcon.signals.filter((s) => !s.found && s.weight === "critical");
  const quickWins = report.fixes.filter((fix) => fix.effort === "low" && fix.impact >= 4);

  return (
    <article className="pb-10">
      {/* ---------------- Masthead ---------------- */}
      <header className="relative overflow-hidden border-b border-[var(--color-line)]">
        <div className="grid-bg pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="wrap grid items-center gap-12 py-14 lg:grid-cols-[1.3fr_auto]">
          <div className="anim-rise">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill">Agent readiness report</span>
              <span className="pill pill-live">
                <span className="dot" />
                {generated}
              </span>
              <span className="pill">v{report.version}</span>
            </div>

            <h1 className="mt-6 text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-[1.05]">
              {report.company}
            </h1>
            <a
              href={report.siteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-2 inline-block font-mono text-[13px] text-[var(--color-muted)] link-underline"
            >
              {report.siteUrl}
            </a>

            <p className="mt-6 max-w-[60ch] text-[16.5px] leading-relaxed text-[var(--color-body)]">
              {report.headline}
            </p>

            <dl className="mt-9 grid max-w-lg grid-cols-2 gap-x-8 gap-y-4 border-t border-[var(--color-line)] pt-6 sm:grid-cols-4">
              {[
                { term: "Pages read", value: `${crawled.length}/${report.pages.length}` },
                { term: "Hard filters missing", value: String(missingCritical.length) },
                { term: "Fixes queued", value: String(report.fixes.length) },
                { term: "Crawl time", value: `${(report.durationMs / 1000).toFixed(1)}s` },
              ].map((stat) => (
                <div key={stat.term}>
                  <dd className="font-mono text-[20px] tabular-nums text-[var(--color-chalk)]">
                    {stat.value}
                  </dd>
                  <dt className="rule-label mt-1">{stat.term}</dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="anim-rise justify-self-center [animation-delay:120ms]">
            <ScoreDial score={report.score} grade={report.grade} size={260} />
          </div>
        </div>
      </header>

      {/* ---------------- Dimension breakdown ---------------- */}
      <section className="wrap py-16" id="dimensions">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rule-label">Section 01</p>
            <h2 className="mt-2 text-[26px] font-semibold">Dimension breakdown</h2>
          </div>
          <p className="max-w-[42ch] text-[13.5px] leading-relaxed text-[var(--color-faint)]">
            Each score is points earned over points available. Open a dimension to read every check
            and the excerpt behind it.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {report.dimensions.map((dimension, index) => (
            <section key={dimension.id} className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[17px] font-semibold">{dimension.label}</h3>
                  <p className="mt-1 text-[13px] text-[var(--color-faint)]">{dimension.question}</p>
                </div>
                <span
                  className="font-mono text-[28px] leading-none tabular-nums"
                  style={{ color: bandColor(dimension.score) }}
                >
                  {dimension.score}
                </span>
              </div>

              <div className="mt-4">
                <Meter score={dimension.score} delay={index * 80} />
              </div>

              <p className="mt-4 text-[14px] leading-relaxed text-[var(--color-muted)]">
                {dimension.summary}
              </p>

              <details className="group mt-4 border-t border-[var(--color-line-soft)] pt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-chalk)]">
                  <span>
                    {dimension.evidence.length} checks · weight {(dimension.weight * 100).toFixed(0)}%
                  </span>
                  <span className="font-mono text-[11px] group-open:hidden">show evidence +</span>
                  <span className="hidden font-mono text-[11px] group-open:inline">hide −</span>
                </summary>
                <div className="mt-3">
                  <EvidenceList evidence={dimension.evidence} />
                </div>
              </details>
            </section>
          ))}
        </div>
      </section>

      {/* ---------------- GovCon ---------------- */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-ink)] py-16" id="govcon">
        <div className="wrap">
          <p className="rule-label">Section 02</p>
          <h2 className="mt-2 text-[26px] font-semibold">Government contracting signals</h2>
          <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
            {report.govcon.verdict}
          </p>

          <div className="mt-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            <p className="rule-label">The query this firm is measured against</p>
            <blockquote className="quote mt-3 text-[13.5px]">{report.govcon.failedQuery}</blockquote>
          </div>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--color-line)]">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="bg-[var(--color-raised)]">
                  <th className="rule-label px-5 py-3 font-normal">Signal</th>
                  <th className="rule-label px-5 py-3 font-normal">Status</th>
                  <th className="rule-label px-5 py-3 font-normal">Found on site</th>
                  <th className="rule-label px-5 py-3 font-normal">Filter role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line-soft)] bg-[var(--color-surface)]">
                {report.govcon.signals.map((signal) => (
                  <tr key={signal.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="text-[14px] text-[var(--color-chalk)]">{signal.label}</p>
                      <p className="mt-1.5 max-w-[46ch] text-[12.5px] leading-relaxed text-[var(--color-faint)]">
                        {signal.why}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={signal.found ? "chip chip-pass" : "chip chip-fail"}>
                        {signal.found ? "STATED" : "ABSENT"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {signal.found ? (
                        <>
                          <p className="font-mono text-[12.5px] text-[var(--color-body)]">
                            {signal.value ?? "present"}
                          </p>
                          {signal.source && (
                            <a
                              href={signal.source}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="mt-1 block max-w-[28ch] truncate font-mono text-[11px] text-[var(--color-faint)] link-underline"
                            >
                              {signal.source}
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="font-mono text-[12.5px] text-[var(--color-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-[12px] text-[var(--color-muted)]">
                      {WEIGHT_LABEL[signal.weight]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------------- What AI can answer vs what's true ---------------- */}
      <section className="wrap py-16" id="agent-view">
        <p className="rule-label">Section 03</p>
        <h2 className="mt-2 text-[26px] font-semibold">What a machine can answer, versus what is true</h2>
        <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
          The left column is derived only from what the crawl could read. The right column is yours —
          it is filled in at intake, and the gap between the two columns is the entire engagement.
        </p>

        <div className="mt-8 space-y-3">
          {report.agentView.map((question) => (
            <div key={question.id} className="card grid gap-5 p-5 md:grid-cols-[1.1fr_1fr] md:p-6">
              <div>
                <p className="text-[15px] font-medium text-[var(--color-chalk)]">{question.question}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={ANSWER_CHIP[question.answerable].className}>
                    {ANSWER_CHIP[question.answerable].label}
                  </span>
                  <span className="rule-label">from public pages</span>
                </div>
                <p className="mt-3 max-w-[54ch] text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                  {question.fromSite}
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-raised)]/40 p-4">
                <p className="rule-label">What the company says</p>
                {question.clientClaim ? (
                  <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--color-body)]">
                    {question.clientClaim}
                  </p>
                ) : (
                  <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-faint)]">
                    Not yet supplied. We fill this column with you during intake — the answer usually
                    exists, in a proposal library or somebody&apos;s head, just not on the website.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Fog ---------------- */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-ink)] py-16" id="fog">
        <div className="wrap grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="rule-label">Section 04</p>
            <h2 className="mt-2 text-[26px] font-semibold">Fog index</h2>
            <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
              Weighted stock-marketing phrases per 1,000 words. Under 2 reads as a company describing
              itself. Over 8 reads as a company describing nothing.
            </p>

            <div className="mt-6 flex items-end gap-8">
              <div>
                <p
                  className="font-mono text-[46px] leading-none tabular-nums"
                  style={{ color: bandColor(report.fog.score) }}
                >
                  {report.fog.per1k}
                </p>
                <p className="rule-label mt-2">phrases / 1,000 words</p>
              </div>
              <div>
                <p className="font-mono text-[46px] leading-none tabular-nums text-[var(--color-chalk)]">
                  {report.fog.words.toLocaleString()}
                </p>
                <p className="rule-label mt-2">words analyzed</p>
              </div>
            </div>

            {report.fog.worstSentence && (
              <div className="mt-8">
                <p className="rule-label">Foggiest sentence on the site</p>
                <blockquote className="quote mt-3 text-[13.5px]">{report.fog.worstSentence}</blockquote>
              </div>
            )}
          </div>

          <div className="card p-6">
            <p className="rule-label">Phrase frequency</p>
            {report.fog.hits.length === 0 ? (
              <p className="mt-6 text-[14px] text-[var(--color-muted)]">
                No stock phrases detected. The copy is concrete.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {report.fog.hits.map((hit) => {
                  const max = report.fog.hits[0]?.count || 1;
                  return (
                    <li key={hit.phrase}>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-mono text-[12.5px] text-[var(--color-body)]">
                          {hit.phrase}
                        </span>
                        <span className="font-mono text-[12px] tabular-nums text-[var(--color-faint)]">
                          ×{hit.count} · w{hit.weight}
                        </span>
                      </div>
                      <div className="meter mt-1.5" style={{ height: 4 }}>
                        <span
                          className="anim-bar"
                          style={{ width: `${(hit.count / max) * 100}%`, background: "var(--color-warn)" }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- Fix list ---------------- */}
      <section className="wrap py-16" id="fixes">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rule-label">Section 05</p>
            <h2 className="mt-2 text-[26px] font-semibold">Prioritized fix list</h2>
          </div>
          {quickWins.length > 0 && (
            <p className="max-w-[40ch] text-[13.5px] leading-relaxed text-[var(--color-faint)]">
              {quickWins.length} of these are high impact and low effort. Those are the first week.
            </p>
          )}
        </div>

        <div className="mt-8 space-y-3">
          {report.fixes.map((fix, index) => (
            <div key={fix.id} className="card flex flex-col gap-4 p-5 md:flex-row md:items-start md:p-6">
              <span className="font-mono text-[13px] tabular-nums text-[var(--color-faint)] md:w-10">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-[var(--color-chalk)]">{fix.title}</h3>
                <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                  {fix.detail}
                </p>
                {fix.artifact && (
                  <p className="mt-3 font-mono text-[11.5px] text-[var(--color-faint)]">
                    ships as: {fix.artifact}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-col md:items-end">
                <span className="chip">{fix.dimension}</span>
                <span className="chip chip-pass">impact {fix.impact}/5</span>
                <span className={fix.effort === "low" ? "chip chip-pass" : fix.effort === "medium" ? "chip chip-partial" : "chip chip-fail"}>
                  {fix.effort} effort
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Battery ---------------- */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-ink)] py-16" id="battery">
        <div className="wrap">
          <p className="rule-label">Section 06</p>
          <h2 className="mt-2 text-[26px] font-semibold">Buyer-intent prompt battery</h2>

          {!report.battery ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-line)] p-8 text-center">
              <p className="mx-auto max-w-[54ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
                No battery was run for this audit. The battery asks a live model the questions your
                buyers ask and records the answers verbatim; it requires an API key, so it is a
                deliberate step rather than a default.
              </p>
              <p className="mx-auto mt-4 max-w-[54ch] font-mono text-[12px] leading-relaxed text-[var(--color-faint)]">
                node scripts/audit.mjs {report.domain} --battery
              </p>
              <Link href="/how-it-works#battery" className="btn btn-ghost mt-6">
                See the prompts
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={report.battery.mode === "live" ? "chip chip-pass" : "chip chip-partial"}>
                  {report.battery.mode === "live" ? "LIVE RUN" : "DRY RUN — NOTHING QUERIED"}
                </span>
                <span className="chip">{report.battery.model}</span>
                <span className="chip">{report.battery.promptCount} prompts</span>
                {report.battery.mentionRate !== undefined && (
                  <span className="chip chip-pass">{report.battery.mentionRate}% mention rate</span>
                )}
              </div>

              <ul className="mt-5 space-y-1.5">
                {report.battery.notes.map((note) => (
                  <li key={note} className="text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                    · {note}
                  </li>
                ))}
              </ul>

              <div className="mt-8 space-y-3">
                {report.battery.answers.slice(0, 12).map((answer) => (
                  <div key={answer.promptId} className="card p-5">
                    <p className="font-mono text-[11px] text-[var(--color-faint)]">{answer.promptId}</p>
                    <p className="mt-2 text-[14.5px] text-[var(--color-chalk)]">{answer.prompt}</p>
                    {answer.error ? (
                      <p className="mt-3 font-mono text-[12px] text-[var(--color-warn)]">{answer.error}</p>
                    ) : (
                      <p className="mt-3 max-w-[80ch] whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                        {answer.answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ---------------- Appendix ---------------- */}
      <section className="wrap py-16" id="appendix">
        <p className="rule-label">Appendix</p>
        <h2 className="mt-2 text-[26px] font-semibold">Crawl record</h2>
        <p className="mt-4 max-w-[64ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
          Every path requested, in the order a buyer-facing agent would try them. A 404 here is not a
          crawl error; it is the finding.
        </p>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--color-line)]">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="bg-[var(--color-raised)]">
                <th className="rule-label px-5 py-3 font-normal">Path</th>
                <th className="rule-label px-5 py-3 font-normal">Status</th>
                <th className="rule-label px-5 py-3 font-normal">Type</th>
                <th className="rule-label px-5 py-3 font-normal">Bytes</th>
                <th className="rule-label px-5 py-3 font-normal">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line-soft)] bg-[var(--color-surface)]">
              {report.pages.map((page) => (
                <tr key={page.path}>
                  <td className="px-5 py-3 font-mono text-[12.5px] text-[var(--color-body)]">
                    {page.path}
                    {page.discovered && (
                      <span className="ml-2 font-mono text-[10px] text-[var(--color-faint)]">via nav</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={page.ok ? "chip chip-pass" : "chip chip-fail"}>
                      {page.error ? "ERR" : page.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] text-[var(--color-faint)]">
                    {page.contentType || "—"}
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] tabular-nums text-[var(--color-faint)]">
                    {page.bytes.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] tabular-nums text-[var(--color-faint)]">
                    {page.ms}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
          <p className="rule-label">Method notes</p>
          <ul className="mt-4 space-y-2.5">
            {report.notes.map((note) => (
              <li key={note} className="max-w-[80ch] text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                · {note}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/audit" className="btn btn-primary">
            Run this on our domain
          </Link>
          <Link href="/fix-kit" className="btn btn-ghost">
            See what the fixes look like
          </Link>
        </div>
      </section>
    </article>
  );
}
