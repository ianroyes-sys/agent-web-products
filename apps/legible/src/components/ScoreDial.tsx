/* The score dial.

   A 270° gauge, swept once on load. It reads as an instrument taking a
   measurement rather than a marketing badge, which is the whole posture
   of the product. Pure CSS animation, no JS, so it renders on the server. */

export type Band = "pass" | "warn" | "fail";

export function band(score: number): Band {
  if (score >= 75) return "pass";
  if (score >= 50) return "warn";
  return "fail";
}

export function bandColor(score: number): string {
  const b = band(score);
  return b === "pass" ? "var(--color-live)" : b === "warn" ? "var(--color-warn)" : "var(--color-hot)";
}

interface Props {
  score: number;
  grade: string;
  size?: number;
  label?: string;
}

export function ScoreDial({ score, grade, size = 240, label = "Legibility score" }: Props) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75;
  const target = arc * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = bandColor(score);

  return (
    <figure className="flex flex-col items-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-[225deg]" aria-hidden="true">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="var(--color-raised)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            strokeDashoffset={target}
            className="anim-sweep"
            style={
              {
                "--dash-full": `${arc}`,
                "--dash-target": `${target}`,
                filter: `drop-shadow(0 0 14px color-mix(in oklab, ${color} 45%, transparent))`,
              } as React.CSSProperties
            }
          />
          {/* Tick marks every 10 points: the instrument's face. */}
          {Array.from({ length: 11 }, (_, i) => {
            const angle = (i / 10) * 270 * (Math.PI / 180);
            const inner = radius - 13;
            const outer = radius - 9;
            return (
              <line
                key={i}
                x1={64 + Math.cos(angle) * inner}
                y1={64 + Math.sin(angle) * inner}
                x2={64 + Math.cos(angle) * outer}
                y2={64 + Math.sin(angle) * outer}
                stroke="var(--color-line)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center anim-fade">
          <span
            className="font-mono tabular-nums leading-none"
            style={{ fontSize: size * 0.3, color, letterSpacing: "-0.03em" }}
          >
            {score}
          </span>
          <span
            className="mt-1 font-mono text-[13px] tracking-[0.2em] uppercase"
            style={{ color: "var(--color-faint)" }}
          >
            grade {grade}
          </span>
        </div>
      </div>
      <figcaption className="rule-label mt-1">{label} · 0–100</figcaption>
    </figure>
  );
}
