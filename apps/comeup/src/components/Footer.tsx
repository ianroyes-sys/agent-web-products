import Link from "next/link";
import { archiveGeneratedAt } from "@/lib/archive/ingest";
import { SITE } from "@/lib/site";
import { Wordmark } from "./Wordmark";

export function Footer() {
  const generated = new Date(archiveGeneratedAt());
  const stamp = Number.isNaN(generated.getTime())
    ? "unknown"
    : generated.toISOString().slice(0, 10);

  return (
    <footer className="mt-28" style={{ borderTop: "1px solid var(--color-line-soft)" }}>
      <div className="wrap py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Wordmark size={17} />
            <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
              One archive, one job. {SITE.tagline}
            </p>
            <p className="mt-4 text-[13px]" style={{ color: "var(--color-faint)" }}>
              A{" "}
              <a href={SITE.parentUrl} className="link-underline" target="_blank" rel="noreferrer">
                {SITE.parent}
              </a>{" "}
              company.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-3">
            <FooterGroup title="Product">
              <FooterLink href="/plan">Get the plan</FooterLink>
              <FooterLink href="/archive">The archive</FooterLink>
              <FooterLink href="/pricing">Pricing</FooterLink>
            </FooterGroup>
            <FooterGroup title="For agents">
              <FooterLink href="/llms.txt">llms.txt</FooterLink>
              <FooterLink href="/.well-known/mcp.json">MCP descriptor</FooterLink>
              <FooterLink href="/api/v1/archive/search?job=price-offer&limit=3">Search API</FooterLink>
            </FooterGroup>
            <FooterGroup title="Source">
              <FooterLink href="https://ianroyz.substack.com" external>
                Everything But College
              </FooterLink>
              <FooterLink href={SITE.parentUrl} external>
                Royz Media Group
              </FooterLink>
            </FooterGroup>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col gap-3 pt-6 text-[12px] sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: "1px solid var(--color-line-soft)", color: "var(--color-faint)" }}
        >
          <span>
            Built on the archive of {SITE.expert}. Nothing here is financial or legal advice.
          </span>
          <span className="tabular">Archive compiled {stamp}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <ul className="flex flex-col gap-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  const className = "text-[13.5px] transition-colors hover:text-[var(--color-chalk)]";
  return (
    <li style={{ color: "var(--color-muted)" }}>
      {external ? (
        <a href={href} className={className} target="_blank" rel="noreferrer">
          {children}
        </a>
      ) : (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    </li>
  );
}
