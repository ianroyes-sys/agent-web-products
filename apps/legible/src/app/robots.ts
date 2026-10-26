import type { MetadataRoute } from "next";

/* Our robots.txt names every AI agent on purpose. It would be difficult to
   sell an audit that flags inherited crawler defaults while running one. */

const AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4802";

  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...AGENTS.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
