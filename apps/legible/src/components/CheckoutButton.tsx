"use client";

import { useState } from "react";
import type { Tier } from "@/lib/pricing";
import { invoiceMailto } from "@/lib/pricing";

interface Props {
  tier: Tier;
  /** True only when STRIPE_SECRET_KEY is present on the server. */
  checkoutEnabled: boolean;
}

export function CheckoutButton({ tier, checkoutEnabled }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  // No key, no button. A checkout that 500s costs more trust than a mailto.
  if (!checkoutEnabled) {
    return (
      <div>
        <a href={invoiceMailto(tier)} className={tier.featured ? "btn btn-primary w-full justify-center" : "btn btn-ghost w-full justify-center"}>
          Request an invoice
        </a>
        <p className="mt-2.5 text-center text-[12px] text-[var(--color-faint)]">
          Card checkout is off on this deployment. Invoices are Net 14.
        </p>
      </div>
    );
  }

  const start = async () => {
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier: tier.id }),
      });
      const payload = (await res.json()) as { ok: boolean; url?: string; error?: string };

      if (payload.ok && payload.url) {
        window.location.href = payload.url;
        return;
      }

      setState("error");
      setError(payload.error ?? "Checkout is unavailable right now.");
    } catch {
      setState("error");
      setError("Network error. Nothing was charged.");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={state === "loading"}
        className={tier.featured ? "btn btn-primary w-full justify-center" : "btn btn-ghost w-full justify-center"}
      >
        {state === "loading" ? "Opening checkout…" : `Start — $${tier.price.toLocaleString()}`}
      </button>

      {state === "error" && (
        <p className="mt-2.5 text-center text-[12px] text-[var(--color-hot)]">
          {error}{" "}
          <a href={invoiceMailto(tier)} className="link-underline">
            Request an invoice instead
          </a>
          .
        </p>
      )}
    </div>
  );
}
