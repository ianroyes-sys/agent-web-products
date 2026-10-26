import Link from "next/link";
import { usd, usdFull } from "@/lib/format";

export interface BarRow {
  label: string;
  value: number;
  href?: string;
  hint?: string;
}

/**
 * Horizontal proportion list. Replaces a pie chart, which is unreadable
 * past three slices and always looks like a template.
 */
export default function BarList({
  rows,
  max,
  emptyLabel = "No breakdown available.",
}: {
  rows: BarRow[];
  max?: number;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-[13.5px] text-[var(--color-faint)]">{emptyLabel}</p>;
  }

  const top = max ?? Math.max(...rows.map((r) => r.value), 1);

  return (
    <ul className="space-y-3.5">
      {rows.map((r) => {
        const width = Math.max((r.value / top) * 100, 1.5);
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <span className="truncate text-[13.5px] text-[var(--color-body)]" title={r.label}>
                {r.label}
              </span>
              <span
                className="num flex-none text-[13px] text-[var(--color-chalk)]"
                title={usdFull(r.value)}
              >
                {usd(r.value)}
              </span>
            </div>
            <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[var(--color-line-soft)]">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${width}%`,
                  background: "linear-gradient(90deg, var(--accent), color-mix(in oklab, var(--accent) 45%, transparent))",
                }}
              />
            </div>
            {r.hint ? (
              <p className="mt-1.5 text-[11.5px] text-[var(--color-faint)]">{r.hint}</p>
            ) : null}
          </>
        );

        return (
          <li key={r.label}>
            {r.href ? (
              <Link href={r.href} className="block rounded-lg transition-opacity hover:opacity-80">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
