"use client";

import { useState } from "react";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "waitlist"; message: string }
  | { kind: "saved"; message: string }
  | { kind: "error"; message: string };

export function PricingActions({ plan, label }: { plan: "monthly" | "pro"; label: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [email, setEmail] = useState("");

  const start = async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await response.json()) as { mode?: string; url?: string; message?: string; error?: string };

      if (data.mode === "checkout" && data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.mode === "waitlist") {
        setState({ kind: "waitlist", message: data.message ?? "Billing isn't switched on yet." });
        return;
      }
      setState({ kind: "error", message: data.error ?? "Couldn't start that." });
    } catch {
      setState({ kind: "error", message: "Network problem. Try again in a moment." });
    }
  };

  const join = async (event: React.FormEvent) => {
    event.preventDefault();
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; error?: string };
      if (data.ok) setState({ kind: "saved", message: data.message ?? "You're on the list." });
      else setState({ kind: "error", message: data.error ?? "That didn't save." });
    } catch {
      setState({ kind: "error", message: "Network problem. Try again in a moment." });
    }
  };

  if (state.kind === "saved") {
    return (
      <div className="mt-6 rounded-[10px] p-4" style={{ border: "1px solid color-mix(in oklab, var(--color-live) 40%, transparent)" }}>
        <p className="text-[13.5px]" style={{ color: "var(--color-live)" }}>
          {state.message}
        </p>
      </div>
    );
  }

  if (state.kind === "waitlist") {
    return (
      <form onSubmit={join} className="mt-6">
        <p className="mb-3 text-[13px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
          {state.message}
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
            className="field !py-2.5 text-[14px]"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            Join
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-6">
      <button type="button" onClick={start} disabled={state.kind === "loading"} className="btn btn-primary w-full justify-center">
        {state.kind === "loading" ? "One moment…" : label}
      </button>
      {state.kind === "error" ? (
        <p className="mt-3 text-[13px]" style={{ color: "var(--color-hot)" }}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
