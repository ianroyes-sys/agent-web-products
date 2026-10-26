import type { MetadataRoute } from "next";
import { getFirms, getMeta } from "@/lib/data";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4801";

export default function sitemap(): MetadataRoute.Sitemap {
  const generated = new Date(getMeta().generated);

  const pages: MetadataRoute.Sitemap = [
    { url: `${site}/`, lastModified: generated, priority: 1 },
    { url: `${site}/radar`, lastModified: generated, priority: 0.9 },
    { url: `${site}/firms`, lastModified: generated, priority: 0.8 },
    { url: `${site}/market`, lastModified: generated, priority: 0.7 },
    { url: `${site}/api-docs`, lastModified: generated, priority: 0.7 },
  ];

  for (const firm of getFirms()) {
    pages.push({
      url: `${site}/firms/${firm.id}`,
      lastModified: generated,
      priority: firm.tier === "major" ? 0.6 : 0.4,
    });
  }

  return pages;
}
