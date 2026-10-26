"use client";

import { useEffect, useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2200);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("error");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="btn btn-ghost h-8 px-3 font-mono text-[11px]"
      aria-live="polite"
    >
      {state === "copied" ? "Copied" : state === "error" ? "Copy failed" : label}
    </button>
  );
}
