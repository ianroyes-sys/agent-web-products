import Link from "next/link";
import type { ArchiveItem, TagAxis } from "@/lib/archive/types";

export function SectionHead({
  eyebrow,
  title,
  lead,
  id,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  id?: string;
}) {
  return (
    <div id={id} className="max-w-2xl">
      <div className="rule mb-5 w-24" />
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-[26px] font-semibold leading-[1.15] sm:text-[32px]">{title}</h2>
      {lead ? (
        <p className="mt-4 text-[15.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}

export function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="tabular text-[26px] font-medium leading-none" style={{ color: "var(--color-chalk)" }}>
        {value}
      </p>
      <p className="mt-2.5 text-[13.5px]" style={{ color: "var(--color-body)" }}>
        {label}
      </p>
      {sub ? (
        <p className="mt-1 text-[12px]" style={{ color: "var(--color-faint)" }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

export function TagChip({ axis, value, active }: { axis?: TagAxis; value: string; active?: boolean }) {
  return (
    <span className={`tag ${active ? "tag-on" : ""}`}>
      {axis ? <span className="tag-axis">{axis}:</span> : null}
      {value}
    </span>
  );
}

/** Marker for anything distilled from the private record rather than published. */
export function DerivedBadge({ from }: { from?: string }) {
  return (
    <span className="tag" title={from ? `Distilled from ${from}` : undefined} style={{ borderStyle: "dashed" }}>
      distilled
    </span>
  );
}

const AXES: TagAxis[] = ["job", "topic", "framework", "example", "audience", "outcome"];

export function ArchiveCard({ item, highlight }: { item: ArchiveItem; highlight?: string[] }) {
  const on = new Set(highlight ?? []);
  const tags = AXES.flatMap((axis) => item.tags[axis].map((value) => ({ axis, value })));

  return (
    <Link
      href={`/archive/${item.id}`}
      className="card group flex h-full flex-col p-5 transition-colors hover:border-[var(--accent-line)]"
    >
      <div className="flex items-center gap-2">
        <span className="eyebrow">{item.source}</span>
        {item.derived ? <DerivedBadge from={item.derivedFrom} /> : null}
      </div>

      <h3
        className="mt-3 text-[16.5px] font-medium leading-snug transition-colors group-hover:text-[var(--accent)]"
        style={{ color: "var(--color-chalk)" }}
      >
        {item.title}
      </h3>

      <p className="mt-2.5 line-clamp-3 text-[14px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
        {item.pull ?? item.body.slice(0, 220)}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5 pt-4" style={{ borderTop: "1px solid var(--color-line-soft)" }}>
        {tags.slice(0, 6).map((tag) => (
          <TagChip key={`${tag.axis}-${tag.value}`} axis={tag.axis} value={tag.value} active={on.has(`${tag.axis}:${tag.value}`)} />
        ))}
        {tags.length > 6 ? <span className="tag">+{tags.length - 6}</span> : null}
      </div>
    </Link>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center rounded-[14px] px-6 py-16 text-center"
      style={{ border: "1px dashed var(--color-line)", background: "color-mix(in oklab, var(--color-surface) 55%, transparent)" }}
    >
      <div
        className="mb-5 h-10 w-10 -skew-x-[22deg] rounded-[3px]"
        style={{ background: "linear-gradient(180deg, var(--accent-dim), transparent)", border: "1px solid var(--accent-line)" }}
      />
      <h3 className="text-[18px] font-medium">{title}</h3>
      <p className="mt-2 max-w-md text-[14.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
        {body}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
