"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/plans";

type Status = "idle" | "loading" | "failed";

/**
 * Only rendered when the server has confirmed a secret key and a price ID are
 * both present. If Stripe still fails at request time, the button becomes the
 * request-access link rather than a dead control.
 */
export default function CheckoutButton({
  plan,
  label,
  fallbackHref,
  featured,
}: {
  plan: PlanId;
  label: string;
  fallbackHref: string;
  featured?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function start() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; message?: string };

      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setStatus("failed");
      setMessage(data.message ?? "Checkout is unavailable right now.");
    } catch {
      setStatus("failed");
      setMessage("Could not reach checkout.");
    }
  }

  if (status === "failed") {
    return (
      <div className="mt-6">
        <a href={fallbackHref} className={`btn w-full ${featured ? "btn-primary" : "btn-ghost"}`}>
          Request access
        </a>
        <p className="mt-2 text-[11.5px] leading-[1.5] text-[var(--color-faint)]" role="status">
          {message} Email works — we answer the same day.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={status === "loading"}
      aria-busy={status === "loading"}
      className={`btn mt-6 w-full ${featured ? "btn-primary" : "btn-ghost"}`}
      style={status === "loading" ? { opacity: 0.7, cursor: "progress" } : undefined}
    >
      {status === "loading" ? (
        <>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
            <path
              d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="sweep"
              style={{ transformOrigin: "8px 8px" }}
            />
          </svg>
          Opening checkout…
        </>
      ) : (
        label
      )}
    </button>
  );
}
