import { bandColor } from "./ScoreDial";

interface Props {
  score: number;
  delay?: number;
  height?: number;
}

export function Meter({ score, delay = 0, height = 6 }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div
      className="meter"
      style={{ height }}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span
        className="anim-bar"
        style={{
          width: `${clamped}%`,
          background: bandColor(clamped),
          animationDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}
