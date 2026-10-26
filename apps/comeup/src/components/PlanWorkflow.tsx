"use client";

import { useCallback, useRef, useState } from "react";
import type { Plan, PlanEvent, PlanStage } from "@/lib/plan/types";
import { PlanResult } from "./PlanResult";

type Status = "idle" | "running" | "done" | "error";

const HOURS = [
  { value: 3, label: "Under 5" },
  { value: 8, label: "5–10" },
  { value: 15, label: "10–20" },
  { value: 30, label: "20–40" },
  { value: 45, label: "40+" },
] as const;

const BUDGETS = [
  { value: 0, label: "$0" },
  { value: 100, label: "Under $100" },
  { value: 500, label: "$100–500" },
  { value: 2000, label: "$500–2,000" },
  { value: 5000, label: "$2,000+" },
] as const;

const STAGE_ORDER: PlanStage["key"][] = ["read", "retrieve", "compose", "done"];

const EXAMPLE =
  "I can edit video — I've been cutting my friends' YouTube stuff for two years and I'm fast in Premiere. I have a laptop, a decent camera, and about 400 followers nobody would call an audience. I'm a junior in college in Houston. I've never charged anybody.";

export function PlanWorkflow() {
  const [situation, setSituation] = useState("");
  const [tried, setTried] = useState("");
  const [where, setWhere] = useState("");
  const [hours, setHours] = useState<number>(8);
  const [budget, setBudget] = useState<number>(0);

  const [status, setStatus] = useState<Status>("idle");
  const [stages, setStages] = useState<PlanStage[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const tooShort = situation.trim().length < 20;

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (tooShort || status === "running") return;

      setStatus("running");
      setStages([]);
      setPlan(null);
      setError(null);

      try {
        const response = await fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ situation, tried, where, hoursPerWeek: hours, budget }),
        });

        if (!response.ok || !response.body) {
          const detail = await response.json().catch(() => null);
          throw new Error(detail?.error ?? `Request failed (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as PlanEvent;
            if (event.type === "stage") setStages((current) => [...current, event]);
            if (event.type === "plan") {
              setPlan(event.plan);
              setStatus("done");
              window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
            }
            if (event.type === "error") throw new Error(event.message);
          }
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Something went wrong.");
        setStatus("error");
      }
    },
    [budget, hours, situation, status, tooShort, tried, where],
  );

  const restart = () => {
    setStatus("idle");
    setPlan(null);
    setStages([]);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (status === "done" && plan) {
    return (
      <div ref={resultRef}>
        <PlanResult plan={plan} onRestart={restart} />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={submit} className="card p-6 sm:p-8">
        <div>
          <label className="label" htmlFor="situation">
            What you can do, what you&apos;ve got, where you are
          </label>
          <textarea
            id="situation"
            value={situation}
            onChange={(event) => setSituation(event.target.value)}
            rows={7}
            maxLength={4000}
            disabled={status === "running"}
            placeholder="Be specific and be honest. The skill, the gear, the time of year, the people you already know, the thing people ask you for."
            className="field resize-y"
          />
          <div className="mt-2 flex items-center justify-between text-[12px]" style={{ color: "var(--color-faint)" }}>
            <button
              type="button"
              onClick={() => setSituation(EXAMPLE)}
              className="transition-colors hover:text-[var(--accent)]"
              disabled={status === "running"}
            >
              Use an example
            </button>
            <span className="tabular">{situation.trim().length}/4000</span>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="hours">
              Hours a week you actually have
            </label>
            <div id="hours" className="flex flex-wrap gap-2">
              {HOURS.map((option) => (
                <Choice
                  key={option.value}
                  label={option.label}
                  active={hours === option.value}
                  onClick={() => setHours(option.value)}
                  disabled={status === "running"}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="budget">
              Money you can put in first
            </label>
            <div id="budget" className="flex flex-wrap gap-2">
              {BUDGETS.map((option) => (
                <Choice
                  key={option.value}
                  label={option.label}
                  active={budget === option.value}
                  onClick={() => setBudget(option.value)}
                  disabled={status === "running"}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="where">
              Where you are <span style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span>
            </label>
            <input
              id="where"
              value={where}
              onChange={(event) => setWhere(event.target.value)}
              disabled={status === "running"}
              placeholder="Houston, TX"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="tried">
              What you&apos;ve already tried <span style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span>
            </label>
            <input
              id="tried"
              value={tried}
              onChange={(event) => setTried(event.target.value)}
              disabled={status === "running"}
              placeholder="Posted on TikTok for a month, nothing happened"
              className="field"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" className="btn btn-primary btn-lg justify-center" disabled={tooShort || status === "running"}>
            {status === "running" ? "Working…" : "Build my plan"}
          </button>
          <p className="text-[13px]" style={{ color: "var(--color-faint)" }}>
            {tooShort ? "A sentence or two is enough to start." : "Free. No account. Takes about twenty seconds."}
          </p>
        </div>
      </form>

      {status === "running" ? <Progress stages={stages} /> : null}

      {status === "error" ? (
        <div
          className="card mt-4 p-6"
          style={{ borderColor: "color-mix(in oklab, var(--color-hot) 40%, transparent)" }}
        >
          <p className="eyebrow" style={{ color: "var(--color-hot)" }}>
            That didn&apos;t go through
          </p>
          <p className="mt-3 text-[15px]" style={{ color: "var(--color-body)" }}>
            {error}
          </p>
          <button type="button" className="btn btn-ghost mt-5" onClick={() => setStatus("idle")}>
            Try again
          </button>
        </div>
      ) : null}
    </>
  );
}

function Choice({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className="rounded-[9px] px-3.5 py-2 text-[13.5px] transition-colors disabled:opacity-50"
      style={{
        border: `1px solid ${active ? "var(--accent)" : "var(--color-line)"}`,
        background: active ? "color-mix(in oklab, var(--accent) 12%, transparent)" : "var(--color-ink)",
        color: active ? "var(--color-chalk)" : "var(--color-muted)",
      }}
    >
      {label}
    </button>
  );
}

function Progress({ stages }: { stages: PlanStage[] }) {
  const seen = new Set(stages.map((stage) => stage.key));
  return (
    <div className="card fade-up mt-4 p-6 sm:p-8">
      <p className="eyebrow">Working</p>
      <ul className="mt-5 flex flex-col gap-4">
        {STAGE_ORDER.map((key) => {
          const stage = stages.find((entry) => entry.key === key);
          const active = !seen.has(key) && STAGE_ORDER.findIndex((entry) => !seen.has(entry)) === STAGE_ORDER.indexOf(key);
          const done = seen.has(key);
          return (
            <li key={key} className="flex items-start gap-3">
              <span
                className="mt-[3px] flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full"
                style={{
                  border: `1px solid ${done ? "var(--color-live)" : active ? "var(--accent)" : "var(--color-line)"}`,
                  background: done ? "var(--color-live)" : "transparent",
                  animation: active ? "pulse 1.4s ease-in-out infinite" : undefined,
                }}
              />
              <div>
                <p
                  className="text-[14.5px]"
                  style={{ color: done || active ? "var(--color-chalk)" : "var(--color-faint)" }}
                >
                  {stage?.label ?? DEFAULT_LABEL[key]}
                </p>
                {stage?.detail ? (
                  <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--color-muted)" }}>
                    {stage.detail}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
    </div>
  );
}

const DEFAULT_LABEL: Record<PlanStage["key"], string> = {
  read: "Reading your situation",
  retrieve: "Retrieving the archive by tag",
  compose: "Composing the plan",
  done: "Done",
};
