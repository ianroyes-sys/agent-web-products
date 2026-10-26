"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Mark from "./Mark";

const LINKS = [
  { href: "/radar", label: "Radar" },
  { href: "/firms", label: "Firms" },
  { href: "/market", label: "Market" },
  { href: "/api-docs", label: "API" },
];

export default function Nav({ generated }: { generated: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className="glass sticky top-0 z-40 transition-colors duration-200"
      style={{
        borderBottom: `1px solid ${lifted || open ? "var(--color-line)" : "transparent"}`,
      }}
    >
      <div className="wrap-wide flex h-[var(--nav-h)] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Arsenal Index home">
          <Mark />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--color-chalk)]">
            Arsenal<span className="text-[var(--accent)]">&nbsp;Index</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className="rounded-lg px-3 py-2 text-[13.5px] transition-colors"
                style={{
                  color: active ? "var(--color-chalk)" : "var(--color-muted)",
                  background: active ? "color-mix(in oklab, var(--color-raised) 80%, transparent)" : "transparent",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="pill pill-live hidden lg:inline-flex" title={`Index generated ${generated}`}>
            <span className="dot" />
            {generated}
          </span>
          <Link href="/radar" className="btn btn-primary hidden h-9 text-[13px] sm:inline-flex">
            Open the radar
          </Link>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-[10px] w-[16px]">
              <span
                className="absolute left-0 block h-[1.5px] w-full bg-[var(--color-chalk)] transition-transform duration-200"
                style={{ top: 0, transform: open ? "translateY(4.5px) rotate(45deg)" : "none" }}
              />
              <span
                className="absolute left-0 block h-[1.5px] w-full bg-[var(--color-chalk)] transition-transform duration-200"
                style={{ bottom: 0, transform: open ? "translateY(-4px) rotate(-45deg)" : "none" }}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className="overflow-hidden border-t border-[var(--color-line-soft)] transition-[max-height] duration-300 md:hidden"
        style={{ maxHeight: open ? 280 : 0, borderTopWidth: open ? 1 : 0 }}
      >
        <div className="wrap-wide flex flex-col gap-1 py-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2.5 text-[15px] text-[var(--color-body)]"
            >
              {l.label}
            </Link>
          ))}
          <span className="pill mt-2 self-start">Generated {generated}</span>
        </div>
      </div>
    </header>
  );
}
