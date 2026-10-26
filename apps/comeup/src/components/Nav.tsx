"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "/plan", label: "Get the plan" },
  { href: "/archive", label: "The archive" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function Nav() {
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
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{
        height: "var(--nav-h)",
        background: scrolled ? "color-mix(in oklab, var(--color-ink-deep) 82%, transparent)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : undefined,
        borderBottom: `1px solid ${scrolled ? "var(--color-line-soft)" : "transparent"}`,
      }}
    >
      <nav className="wrap flex h-full items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Come Up home">
          <Wordmark />
          <span className="eyebrow hidden sm:inline" style={{ paddingLeft: 10, borderLeft: "1px solid var(--color-line)" }}>
            RMG
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-[13.5px] transition-colors"
                style={{ color: active ? "var(--color-chalk)" : "var(--color-muted)" }}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/plan" className="btn btn-primary ml-2 !h-9 text-[13.5px]">
            Start free
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-9 w-9 items-center justify-center rounded-lg md:hidden"
          style={{ border: "1px solid var(--color-line)" }}
          aria-expanded={open}
          aria-label="Menu"
        >
          <span className="relative block h-[10px] w-[16px]">
            <span
              className="absolute left-0 block h-[1.5px] w-full transition-transform duration-200"
              style={{ background: "var(--color-chalk)", top: open ? 4 : 0, transform: open ? "rotate(45deg)" : undefined }}
            />
            <span
              className="absolute left-0 block h-[1.5px] w-full transition-transform duration-200"
              style={{ background: "var(--color-chalk)", top: open ? 4 : 9, transform: open ? "rotate(-45deg)" : undefined }}
            />
          </span>
        </button>
      </nav>

      {open ? (
        <div
          className="md:hidden"
          style={{
            background: "color-mix(in oklab, var(--color-ink-deep) 96%, transparent)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid var(--color-line)",
          }}
        >
          <div className="wrap flex flex-col gap-1 py-4">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-lg px-2 py-2.5 text-[15px]" style={{ color: "var(--color-chalk)" }}>
                {link.label}
              </Link>
            ))}
            <Link href="/plan" className="btn btn-primary mt-2 justify-center">
              Start free
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
