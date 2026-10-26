import { BAND_META } from "@/lib/format";
import type { Band } from "@/lib/types";

export default function BandBadge({ band, compact = false }: { band: Band; compact?: boolean }) {
  const meta = BAND_META[band];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.08em]"
      style={{
        color: meta.color,
        borderColor: `color-mix(in oklab, ${meta.color} 34%, transparent)`,
        background: `color-mix(in oklab, ${meta.color} 8%, transparent)`,
      }}
      title={meta.blurb}
    >
      <span className="band-dot" style={{ background: meta.color }} />
      {compact ? null : meta.label}
    </span>
  );
}
