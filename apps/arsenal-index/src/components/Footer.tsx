import Link from "next/link";
import Mark from "./Mark";
import type { IndexMeta } from "@/lib/types";
import { num, usd } from "@/lib/format";

const COLUMNS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: "Index",
    links: [
      { href: "/radar", label: "Recompete radar" },
      { href: "/firms", label: "Firm directory" },
      { href: "/market", label: "Market structure" },
    ],
  },
  {
    title: "For agents",
    links: [
      { href: "/api-docs", label: "API reference" },
      { href: "/llms.txt", label: "llms.txt", external: true },
      { href: "/.well-known/mcp.json", label: "MCP descriptor", external: true },
    ],
  },
  {
    title: "Source",
    links: [
      { href: "https://www.usaspending.gov", label: "USAspending.gov", external: true },
      { href: "/api-docs#coverage", label: "Coverage & method" },
      { href: "/api-docs#pricing", label: "Pricing" },
    ],
  },
];

export default function Footer({ meta }: { meta: IndexMeta }) {
  return (
    <footer className="mt-24 border-t border-[var(--color-line)] bg-[var(--color-ink)]">
      <div className="wrap-wide py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Mark size={20} />
              <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--color-chalk)]">
                Arsenal Index
              </span>
            </div>
            <p className="mt-3 max-w-[34ch] text-[13.5px] leading-[1.65] text-[var(--color-muted)]">
              The resource layer for Huntsville defense contracting. {num(meta.firm_count)} firms and{" "}
              <span className="num">{usd(meta.market_value)}</span> of prime awards, refined for
              machines.
            </p>
            <p className="eyebrow mt-5">Coverage</p>
            <p className="mt-1.5 text-[12.5px] text-[var(--color-faint)]">{meta.market}</p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="eyebrow">{col.title}</p>
              <ul className="mt-3.5 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        className="text-[13.5px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-chalk)]"
                        rel="noreferrer"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-[13.5px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-chalk)]"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <hr className="rule my-10" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-[var(--color-faint)]">
            An index by{" "}
            <span className="font-semibold text-[var(--color-chalk)]">
              Royz&nbsp;Media&nbsp;<span className="text-[var(--color-royal)]">Group</span>
            </span>
          </p>
          <p className="max-w-[52ch] text-[12px] leading-[1.6] text-[var(--color-faint)]">
            {meta.license} Source: {meta.source}. Not affiliated with, or endorsed by, any government
            agency or the firms listed.
          </p>
        </div>
      </div>
    </footer>
  );
}
