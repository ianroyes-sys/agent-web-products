import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-stack",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4802";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Legible — agent readiness for defense contractors",
    template: "%s · Legible",
  },
  description:
    "We show you what AI says about your company today, score how legible you are to the machines that now decide, and ship the files that fix it.",
  openGraph: {
    title: "Legible — make your company legible to the machines that now decide",
    description:
      "Agent readiness audits for Huntsville defense and aerospace contractors. Eight dimensions, real evidence, a fix kit you can ship.",
    url: siteUrl,
    siteName: "Legible",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-[#06231a]"
        >
          Skip to content
        </a>
        <SiteNav />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
