import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SITE, siteUrl } from "@/lib/site";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.job,
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.job,
    type: "website",
    url: siteUrl(),
    siteName: SITE.name,
  },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.job },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`}>
      <head>
        {/* Pointer for crawling agents. The full contract is in /llms.txt. */}
        <link rel="llms" href="/llms.txt" />
        <link rel="alternate" type="application/json" href="/.well-known/mcp.json" title="MCP descriptor" />
      </head>
      <body>
        <Nav />
        <main style={{ paddingTop: "var(--nav-h)" }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
