"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Mark } from "./Mark";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/fix-kit", label: "Fix kit" },
  { href: "/pricing", label: "Pricing" },
  { href: "/report/latest", label: "Sample report" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        scrolled ? "glass border-b border-[var(--color-line)]" : "border-b border-transparent"
      }`}
    >
      <nav className="wrap flex h-[var(--nav-h)] items-center justify-between gap-4" aria-label="Primary">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Legible home">
          <Mark className="h-[22px] w-[22px]" />
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-chalk)]">Legible</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href.split("?")[0]);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
                  active
                    ? "text-[var(--color-chalk)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-chalk)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/audit" className="btn btn-primary ml-2">
            Run an audit
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn btn-ghost h-9 px-3 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>

      {open && (
        <div id="mobile-nav" className="glass border-t border-[var(--color-line)] md:hidden">
          <div className="wrap flex flex-col gap-1 py-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-2 py-2.5 text-[15px] text-[var(--color-body)]"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/audit" className="btn btn-primary mt-2 justify-center">
              Run an audit
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
