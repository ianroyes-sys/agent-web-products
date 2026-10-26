"use client";

import { useMemo, useState } from "react";
import { monthLabel, usd, usdFull } from "@/lib/format";
import type { MovementPoint } from "@/lib/types";

const W = 940;
const H = 260;
const PAD = { top: 18, right: 16, bottom: 30, left: 56 };

/**
 * Hand-rolled SVG area chart. No chart library: 38 points does not justify
 * 100 kB of dependency, and rolling it keeps every color on a CSS variable
 * so the chart follows the theme instead of fighting it.
 */
export default function MovementChart({ points }: { points: MovementPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    if (points.length === 0) return null;
    const max = Math.max(...points.map((p) => p.value));
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const step = points.length > 1 ? innerW / (points.length - 1) : 0;

    const xy = points.map((p, i) => ({
      x: PAD.left + i * step,
      y: PAD.top + innerH - (p.value / max) * innerH,
      ...p,
    }));

    const line = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L${xy[xy.length - 1].x.toFixed(1)},${PAD.top + innerH} L${xy[0].x.toFixed(1)},${PAD.top + innerH} Z`;

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      y: PAD.top + innerH - f * innerH,
      value: max * f,
    }));

    return { xy, line, area, ticks, innerH, step, max };
  }, [points]);

  if (!geom) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-[var(--color-line)]">
        <p className="text-[13.5px] text-[var(--color-faint)]">No monthly movement in this window.</p>
      </div>
    );
  }

  const active = hover === null ? null : geom.xy[hover];
  // Label density: on a narrow viewport the SVG scales down, so thin the axis.
  const labelEvery = Math.max(1, Math.ceil(points.length / 12));

  return (
    <div className="scroll-x -mx-1 px-1">
      <div className="min-w-[640px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={`Monthly obligated value across ${points.length} months, peaking at ${usd(geom.max)}`}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="mv-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.30" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {geom.ticks.map((t) => (
            <g key={t.y}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={t.y}
                y2={t.y}
                stroke="var(--color-line-soft)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 10}
                y={t.y + 3.5}
                textAnchor="end"
                fill="var(--color-faint)"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {t.value === 0 ? "0" : usd(t.value)}
              </text>
            </g>
          ))}

          <path d={geom.area} fill="url(#mv-fill)" />
          <path
            d={geom.line}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {geom.xy.map((p, i) =>
            i % labelEvery === 0 ? (
              <text
                key={`lbl-${p.month}`}
                x={p.x}
                y={H - 10}
                textAnchor="middle"
                fill="var(--color-faint)"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {monthLabel(p.month)}
              </text>
            ) : null,
          )}

          {active ? (
            <g>
              <line
                x1={active.x}
                x2={active.x}
                y1={PAD.top}
                y2={PAD.top + geom.innerH}
                stroke="var(--accent-line)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={active.x} cy={active.y} r="4.5" fill="var(--accent)" />
              <circle cx={active.x} cy={active.y} r="8" fill="var(--accent)" opacity="0.18" />
            </g>
          ) : null}

          {/* Invisible hit strips — wider than the points, so hovering works
              on a trackpad without pixel hunting. */}
          {geom.xy.map((p, i) => (
            <rect
              key={`hit-${p.month}`}
              x={p.x - geom.step / 2}
              y={PAD.top}
              width={Math.max(geom.step, 8)}
              height={geom.innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              tabIndex={-1}
            />
          ))}
        </svg>
      </div>

      <div className="mt-3 flex min-h-[38px] items-center gap-3 border-t border-[var(--color-line-soft)] pt-3">
        {active ? (
          <>
            <span className="tag">{monthLabel(active.month)}</span>
            <span className="num text-[15px] text-[var(--color-chalk)]" title={usdFull(active.value)}>
              {usd(active.value)}
            </span>
            <span className="text-[12.5px] text-[var(--color-faint)]">obligated</span>
          </>
        ) : (
          <span className="text-[12.5px] text-[var(--color-faint)]">
            Hover the plot for the monthly obligated total. Peak month:{" "}
            <span className="num text-[var(--color-muted)]">{usd(geom.max)}</span>.
          </span>
        )}
      </div>
    </div>
  );
}
