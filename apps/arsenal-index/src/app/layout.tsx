import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { getMeta } from "@/lib/data";
import "./globals.css";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-grotesk",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-stack",
});

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4801";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "Arsenal Index — the resource layer for Huntsville defense contracting",
    template: "%s · Arsenal Index",
  },
  description:
    "Every prime contract award in the Huntsville defense market, refined into a clean, agent-readable index. Recompete radar, firm profiles, and a paid API.",
  openGraph: {
    title: "Arsenal Index",
    description: "The resource layer for Huntsville defense contracting.",
    type: "website",
    url: site,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const meta = getMeta();

  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`}>
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="Agent index" />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-[#0b0c0e]"
        >
          Skip to content
        </a>
        <Nav generated={meta.generated} />
        <main id="main">{children}</main>
        <Footer meta={meta} />
      </body>
    </html>
  );
}
