/**
 * The mark: a radar reticle. Concentric rings with a live sweep arm —
 * the product's whole promise (something is coming, here is when) in 22px.
 */
export default function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.25" stroke="var(--color-line)" strokeWidth="1.25" />
      <circle cx="12" cy="12" r="6" stroke="var(--color-faint)" strokeWidth="1" />
      <path d="M12 1.75v20.5M1.75 12h20.5" stroke="var(--color-line)" strokeWidth="1" />
      <g className="sweep" style={{ transformOrigin: "12px 12px" }}>
        <path d="M12 12 L12 1.75" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <circle cx="12" cy="12" r="2" fill="var(--accent)" />
    </svg>
  );
}
