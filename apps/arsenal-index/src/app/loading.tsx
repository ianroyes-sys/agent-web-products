/** Skeleton that matches the real page rhythm: header, stat row, table. */
export default function Loading() {
  return (
    <div className="wrap-wide py-10 md:py-14" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the index…</span>

      <div className="h-[26px] w-[180px] animate-pulse rounded-full bg-[var(--color-line-soft)]" />
      <div className="mt-6 h-[46px] w-[min(560px,86%)] animate-pulse rounded-lg bg-[var(--color-line-soft)]" />
      <div className="mt-4 h-[18px] w-[min(680px,94%)] animate-pulse rounded bg-[var(--color-line-soft)]" />

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="stat">
            <div className="h-[11px] w-[84px] animate-pulse rounded bg-[var(--color-line-soft)]" />
            <div className="mt-4 h-[34px] w-[120px] animate-pulse rounded bg-[var(--color-line-soft)]" />
            <div className="mt-3 h-[12px] w-full animate-pulse rounded bg-[var(--color-line-soft)]" />
          </div>
        ))}
      </div>

      <div className="card mt-10 overflow-hidden">
        <div className="border-b border-[var(--color-line)] px-4 py-3">
          <div className="h-[11px] w-[140px] animate-pulse rounded bg-[var(--color-line-soft)]" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[var(--color-line-soft)] px-4 py-4"
            style={{ opacity: 1 - i * 0.09 }}
          >
            <div className="h-[12px] w-[70px] animate-pulse rounded bg-[var(--color-line-soft)]" />
            <div className="h-[12px] flex-1 animate-pulse rounded bg-[var(--color-line-soft)]" />
            <div className="h-[12px] w-[80px] animate-pulse rounded bg-[var(--color-line-soft)]" />
            <div className="hidden h-[12px] w-[110px] animate-pulse rounded bg-[var(--color-line-soft)] sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
