import Link from "next/link";
import { Mark } from "./Mark";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/fix-kit", label: "Fix kit" },
      { href: "/pricing", label: "Pricing" },
      { href: "/audit", label: "Run an audit" },
    ],
  },
  {
    title: "Evidence",
    links: [
      { href: "/report/latest", label: "Sample report" },
      { href: "/how-it-works#battery", label: "Prompt battery" },
      { href: "/how-it-works#weights", label: "Scoring weights" },
      { href: "/llms.txt", label: "Our llms.txt" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-28 border-t border-[var(--color-line)] bg-[var(--color-ink)]">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Mark className="h-[22px] w-[22px]" />
            <span className="text-[15px] font-semibold text-[var(--color-chalk)]">Legible</span>
          </div>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-[var(--color-muted)]">
            Agent readiness for defense and aerospace contractors. We show you what AI says about your
            company today, and ship the files that change the answer.
          </p>
          <p className="mt-6 text-[13px] text-[var(--color-faint)]">
            A{" "}
            <span className="font-semibold text-[var(--color-body)]">Royz Media Group</span>{" "}
            company.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="rule-label">{column.title}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-chalk)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="hair">
        <div className="wrap flex flex-col gap-2 py-6 text-[12px] text-[var(--color-faint)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Royz Media Group. All rights reserved.</p>
          <p className="font-mono">
            Audits read public pages only. No login, no scraping behind auth, no rate-limit abuse.
          </p>
        </div>
      </div>
    </footer>
  );
}
