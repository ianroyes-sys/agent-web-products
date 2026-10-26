import type { ReactNode } from "react";

export default function CodeBlock({
  label,
  children,
  tone = "default",
}: {
  label?: string;
  children: ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border bg-[var(--color-ink)]"
      style={{
        borderColor: tone === "accent" ? "var(--accent-line)" : "var(--color-line)",
      }}
    >
      {label ? (
        <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] px-4 py-2.5">
          <span
            className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.12em]"
            style={{ color: tone === "accent" ? "var(--accent)" : "var(--color-faint)" }}
          >
            {label}
          </span>
          <span className="flex gap-1.5">
            <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-line)]" />
            <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-line)]" />
            <span className="h-[7px] w-[7px] rounded-full bg-[var(--color-line)]" />
          </span>
        </div>
      ) : null}
      <div className="scroll-x">
        <pre className="px-4 py-4 font-[family-name:var(--font-mono)] text-[12px] leading-[1.7] text-[var(--color-body)]">
          {children}
        </pre>
      </div>
    </div>
  );
}
