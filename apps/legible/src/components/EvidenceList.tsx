import type { Evidence } from "@/lib/audit/types";

const STATUS_LABEL: Record<Evidence["status"], string> = {
  pass: "PASS",
  partial: "PARTIAL",
  fail: "FAIL",
  info: "NOTE",
};

const STATUS_CLASS: Record<Evidence["status"], string> = {
  pass: "chip chip-pass",
  partial: "chip chip-partial",
  fail: "chip chip-fail",
  info: "chip",
};

export function EvidenceList({ evidence }: { evidence: readonly Evidence[] }) {
  if (evidence.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-[var(--color-faint)]">
        No checks recorded for this dimension.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-line-soft)]">
      {evidence.map((item, index) => (
        <li key={`${item.label}-${index}`} className="py-4 first:pt-2 last:pb-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className={STATUS_CLASS[item.status]}>{STATUS_LABEL[item.status]}</span>
            <span className="text-[14px] font-medium text-[var(--color-chalk)]">{item.label}</span>
            {item.possible > 0 && (
              <span className="ml-auto font-mono text-[11px] tabular-nums text-[var(--color-faint)]">
                {item.points}/{item.possible} pts
              </span>
            )}
          </div>

          <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-[var(--color-muted)]">
            {item.detail}
          </p>

          {item.quote && (
            <blockquote className="quote mt-3 max-w-[80ch] whitespace-pre-wrap break-words">
              {item.quote}
            </blockquote>
          )}

          {item.source && (
            <a
              href={item.source}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-2 inline-block font-mono text-[11px] text-[var(--color-faint)] link-underline"
            >
              {item.source}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
