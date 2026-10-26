/* Fix-kit entry point: build a profile from an audit, generate every artifact. */

import type { AuditReport } from "../audit/types.ts";
import {
  generateCapabilityStatement,
  generateChangelog,
  generateComparisonPage,
  generateFaqPage,
  generateFaqSchema,
  generateLlmsTxt,
  generateMcpDescriptor,
  generateMcpServer,
  generateOrganizationSchema,
  generatePricingPage,
  generateRobotsTxt,
  generateServiceSchema,
} from "./generators.ts";
import type { Artifact, FirmProfile } from "./types.ts";

export * from "./types.ts";
export * from "./generators.ts";

export type Generator = (profile: FirmProfile) => Artifact;

export const GENERATORS: Generator[] = [
  generateLlmsTxt,
  generateOrganizationSchema,
  generateServiceSchema,
  generateFaqSchema,
  generateFaqPage,
  generatePricingPage,
  generateComparisonPage,
  generateCapabilityStatement,
  generateChangelog,
  generateRobotsTxt,
  generateMcpDescriptor,
  generateMcpServer,
];

export function generateAll(profile: FirmProfile): Artifact[] {
  return GENERATORS.map((generate) => generate(profile));
}

/**
 * Seed a profile from an audit. Only facts the crawl actually found are
 * carried across; everything else stays empty so the generators emit a
 * visible `[FILL: …]` rather than a confident invention.
 */
export function profileFromReport(report: AuditReport): FirmProfile {
  const signal = (id: string) => report.govcon.signals.find((s) => s.id === id);
  const found = (id: string): string | undefined => {
    const match = signal(id);
    return match?.found ? match.value : undefined;
  };

  const splitList = (value: string | undefined): string[] =>
    value
      ? value
          .split(/[,;/]| and /i)
          .map((part) => part.trim())
          .filter((part) => part.length > 1)
      : [];

  return {
    company: report.company,
    domain: report.domain,
    siteUrl: report.siteUrl,
    location: report.location,
    summary: `${report.company} is a ${report.location}-based defense and aerospace contractor.`,
    services: [],
    differentiators: [],
    naics: splitList(found("naics")),
    cage: found("cage"),
    uei: found("uei"),
    setAside: found("setaside"),
    certifications: splitList(found("quality")),
    vehicles: splitList(found("vehicles")),
    agencies: splitList(found("agencies")),
    clearance: found("clearance"),
    address: found("location"),
    contact: {},
    faqs: [],
    contractTypes: [],
  };
}
