"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[arsenal-index]", error);
  }, [error]);

  return (
    <div className="wrap flex min-h-[62vh] flex-col items-center justify-center py-20 text-center">
      <p className="num text-[12px] tracking-[0.18em] text-[var(--color-hot)]">Error</p>
      <h1 className="mt-4 max-w-[22ch] text-[clamp(26px,4.6vw,40px)] font-semibold leading-[1.1]">
        The index failed to render this view
      </h1>
      <p className="mt-4 max-w-[50ch] text-[15px] leading-[1.65] text-[var(--color-muted)]">
        This is usually a stale or partially written data file — the refinery republishes the whole
        index atomically, so a retry normally clears it.
      </p>
      {error.digest ? (
        <p className="num mt-4 text-[11.5px] text-[var(--color-faint)]">digest {error.digest}</p>
      ) : null}
      <button type="button" onClick={reset} className="btn btn-primary mt-8">
        Try again
      </button>
    </div>
  );
}
