"use client";

import { useState } from "react";
import Link from "next/link";
import type { Citation, Plan, PlanSection } from "@/lib/plan/types";

const SECTION_NUMBER: Record<PlanSection["key"], string> = {
  wedge: "01",
  customer: "02",
  offer: "03",
  distribution: "04",
  validate: "05",
};

export function PlanResult({ plan, onRestart }: { plan: Plan; onRestart: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(planToText(plan));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fade-up">
      {/* ------------------------------------------------------- header */}
      <div className="card relative overflow-hidden p-7 sm:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 opacity-30"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, var(--accent) 0%, transparent 70%)", filter: "blur(20px)" }}
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill pill-live">
              <span className="dot" />
              Plan ready
            </span>
            <span className="pill">
              {plan.mode === "composed" ? "composed · claude-sonnet-5" : "template engine"}
            </span>
            <span className="pill">
              <span className="tabular">{plan.archiveItemsUsed}</span> archive items cited
            </span>
          </div>

          <h1 className="mt-6 max-w-3xl text-[27px] font-semibold leading-[1.15] sm:text-[36px]">
            {plan.headline}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
            {plan.readback}
          </p>

          {plan.fallbackReason ? (
            <p
              className="mt-5 rounded-[10px] p-3 text-[13px]"
              style={{ border: "1px solid color-mix(in oklab, var(--color-warn) 35%, transparent)", color: "var(--color-warn)" }}
            >
              {plan.fallbackReason}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-2.5">
            <button type="button" onClick={copy} className="btn btn-ghost">
              {copied ? "Copied" : "Copy the plan"}
            </button>
            <button type="button" onClick={onRestart} className="btn btn-ghost">
              Run it again
            </button>
            <Link href="/pricing" className="btn btn-primary">
              Keep running it — $19/mo
            </Link>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- sections */}
      <div className="mt-4 flex flex-col gap-4">
        {plan.sections.map((section, index) => (
          <article key={section.key} className={`card fade-up stagger-${Math.min(index + 1, 5)} p-7 sm:p-9`}>
            <div className="flex items-baseline gap-3">
              <span className="tabular text-[12px]" style={{ color: "var(--accent)" }}>
                {SECTION_NUMBER[section.key]}
              </span>
              <p className="eyebrow">{section.label}</p>
            </div>

            <h2 className="mt-4 text-[21px] font-medium leading-snug sm:text-[24px]">{section.verdict}</h2>

            <div className="prose-plan mt-5 max-w-[68ch] text-[15px]">
              {section.body.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
            </div>

            {section.key === "offer" ? <PriceBlock plan={plan} /> : null}

            <Citations citations={section.citations} />
          </article>
        ))}
      </div>

      {/* --------------------------------------------------- 30 day board */}
      <section className="card mt-4 p-7 sm:p-9">
        <div className="flex items-baseline gap-3">
          <span className="tabular text-[12px]" style={{ color: "var(--accent)" }}>
            06
          </span>
          <p className="eyebrow">Your first 30 days</p>
        </div>
        <h2 className="mt-4 text-[21px] font-medium sm:text-[24px]">Four weeks, in order.</h2>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plan.thirtyDays.map((week) => (
            <div key={week.week} className="card flex flex-col p-5" style={{ background: "var(--color-ink)" }}>
              <span className="tabular text-[11px]" style={{ color: "var(--color-faint)" }}>
                WEEK {week.week}
              </span>
              <h3 className="mt-2 text-[15.5px] font-medium leading-snug">{week.focus}</h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {week.moves.map((move, moveIndex) => (
                  <li key={moveIndex} className="flex gap-2.5 text-[13.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                    <span aria-hidden style={{ color: "var(--accent)" }}>
                      /
                    </span>
                    <span>{move}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ kill list */}
      <section className="card mt-4 p-7 sm:p-9" style={{ borderColor: "color-mix(in oklab, var(--color-hot) 26%, var(--color-line))" }}>
        <div className="flex items-baseline gap-3">
          <span className="tabular text-[12px]" style={{ color: "var(--color-hot)" }}>
            07
          </span>
          <p className="eyebrow">When to stop</p>
        </div>
        <h2 className="mt-4 text-[21px] font-medium sm:text-[24px]">A plan without an exit is a hobby.</h2>
        <ul className="mt-5 flex max-w-[68ch] flex-col gap-3">
          {plan.killCriteria.map((criterion, index) => (
            <li key={index} className="flex gap-3 text-[15px] leading-relaxed" style={{ color: "var(--color-body)" }}>
              <span aria-hidden style={{ color: "var(--color-hot)" }}>
                ×
              </span>
              <span>{criterion}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-center text-[12.5px]" style={{ color: "var(--color-faint)" }}>
        Generated {new Date(plan.generatedAt).toLocaleString()} · plan {plan.id} · nothing here is financial
        or legal advice.
      </p>
    </div>
  );
}

function PriceBlock({ plan }: { plan: Plan }) {
  const { price } = plan;
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <div className="card p-5" style={{ background: "var(--color-ink)", borderColor: "var(--accent-line)" }}>
        <p className="eyebrow">First offer</p>
        <p className="tabular mt-2 text-[28px] leading-none" style={{ color: "var(--color-chalk)" }}>
          ${price.amount.toLocaleString()}
        </p>
        <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--color-faint)" }}>
          {price.unit}
        </p>
      </div>
      <div className="card p-5" style={{ background: "var(--color-ink)" }}>
        <p className="eyebrow">Then</p>
        <p className="tabular mt-2 text-[28px] leading-none" style={{ color: "var(--color-chalk)" }}>
          {price.recurring ? `$${price.recurring.amount.toLocaleString()}` : "—"}
        </p>
        <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--color-faint)" }}>
          {price.recurring ? price.recurring.unit : "no natural recurring version"}
        </p>
      </div>
      <div className="card p-5" style={{ background: "var(--color-ink)" }}>
        <p className="eyebrow">Range to hold</p>
        <p className="tabular mt-2 text-[19px] leading-none" style={{ color: "var(--color-chalk)" }}>
          ${price.floor.toLocaleString()} – ${price.ceiling.toLocaleString()}
        </p>
        <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--color-faint)" }}>
          floor now, ceiling after three results
        </p>
      </div>
    </div>
  );
}

function Citations({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-7 pt-6" style={{ borderTop: "1px solid var(--color-line-soft)" }}>
      <p className="eyebrow mb-4">Drawn from</p>
      <ul className="flex flex-col gap-3">
        {citations.map((citation) => (
          <li key={citation.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/archive/${citation.id}`}
                className="text-[14px] font-medium transition-colors hover:text-[var(--accent)]"
                style={{ color: "var(--color-chalk)" }}
              >
                {citation.title}
              </Link>
              <span className="tag">{citation.source}</span>
              {citation.derived ? (
                <span className="tag" style={{ borderStyle: "dashed" }}>
                  distilled
                </span>
              ) : null}
              {citation.url ? (
                <a href={citation.url} target="_blank" rel="noreferrer" className="tag" style={{ color: "var(--accent)", borderColor: "var(--accent-line)" }}>
                  source
                </a>
              ) : null}
            </div>
            {citation.pull ? (
              <p className="mt-1.5 text-[13.5px] italic leading-relaxed" style={{ color: "var(--color-muted)" }}>
                &ldquo;{citation.pull}&rdquo;
              </p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {citation.matchedOn.slice(0, 5).map((match) => (
                <span key={match} className="tag">
                  {match}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function planToText(plan: Plan): string {
  const lines: string[] = [
    plan.headline,
    plan.readback,
    "",
    ...plan.sections.flatMap((section) => [
      `## ${section.label.toUpperCase()} — ${section.verdict}`,
      ...section.body,
      `Sources: ${section.citations.map((citation) => citation.title).join("; ")}`,
      "",
    ]),
    "## FIRST 30 DAYS",
    ...plan.thirtyDays.flatMap((week) => [`Week ${week.week} — ${week.focus}`, ...week.moves.map((move) => `  - ${move}`)]),
    "",
    "## WHEN TO STOP",
    ...plan.killCriteria.map((criterion) => `  - ${criterion}`),
    "",
    `Come Up · built on the archive of Ian Royes · ${plan.generatedAt}`,
  ];
  return lines.join("\n");
}
