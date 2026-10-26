import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap flex min-h-[62vh] flex-col items-center justify-center py-20 text-center">
      <p className="num text-[12px] tracking-[0.18em] text-[var(--accent)]">404</p>
      <h1 className="mt-4 max-w-[20ch] text-[clamp(26px,4.6vw,40px)] font-semibold leading-[1.1]">
        Nothing indexed at that address
      </h1>
      <p className="mt-4 max-w-[48ch] text-[15px] leading-[1.65] text-[var(--color-muted)]">
        The index covers prime recipients headquartered in the Huntsville market. If you followed a
        firm link, the slug may have changed when the refinery last re-resolved entity names.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/firms" className="btn btn-primary">
          Search the firm directory
        </Link>
        <Link href="/radar" className="btn btn-ghost">
          Open the radar
        </Link>
      </div>
    </div>
  );
}
