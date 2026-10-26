import type { MetadataRoute } from "next";
import { listReports } from "@/lib/reports";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4802";
  const now = new Date();

  const pages = ["", "/how-it-works", "/fix-kit", "/pricing", "/audit"].map((path) => ({
    url: `${site}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const reports = listReports().map((report) => ({
    url: `${site}/report/${report.id}`,
    lastModified: new Date(report.generated),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...pages, ...reports];
}
