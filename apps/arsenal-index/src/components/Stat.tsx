import type { ReactNode } from "react";

export function Stat({
  label,
  value,
  sub,
  title,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  title?: string;
  accent?: boolean;
}) {
  return (
    <div className="stat">
      <p className="eyebrow">{label}</p>
      <p
        className="stat-value mt-3"
        title={title}
        style={accent ? { color: "var(--accent)" } : undefined}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-2 text-[12.5px] leading-[1.5] text-[var(--color-muted)]">{sub}</p>
      ) : null}
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  blurb,
  right,
}: {
  eyebrow?: string;
  title: string;
  blurb?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-[62ch]">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-2.5 text-[clamp(22px,3.4vw,30px)] font-semibold leading-[1.15]">{title}</h2>
        {blurb ? (
          <p className="mt-3 text-[14.5px] leading-[1.65] text-[var(--color-muted)]">{blurb}</p>
        ) : null}
      </div>
      {right ? <div className="flex-none">{right}</div> : null}
    </div>
  );
}
