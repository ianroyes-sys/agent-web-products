/**
 * The mark: "COME UP" with the house diagonal cut riding off the P. The cut is
 * the only decorative device in the RMG system, so it appears here and nowhere
 * else on the page.
 */
export function Wordmark({ size = 15 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-baseline gap-[3px] font-semibold tracking-[-0.03em]"
      style={{ fontSize: size, color: "var(--color-chalk)" }}
    >
      COME
      <span className="relative">
        UP
        <span
          aria-hidden
          className="absolute -right-[7px] top-[8%] block h-[84%] w-[2px] origin-bottom -skew-x-[22deg]"
          style={{ background: "var(--accent)" }}
        />
      </span>
    </span>
  );
}
