/* Saved reports.
 *
 * A report is a file, not a row. It is produced by `scripts/audit.mjs`,
 * committed, and rendered — which means the artifact a client pays for is
 * the same artifact in version control, byte for byte.
 */

import type { AuditReport } from "./audit/types.ts";
import radiance from "../../samples/radiancetech-com.json";
import torch from "../../samples/torchtechnologies-com.json";

const SAMPLES: AuditReport[] = [torch as unknown as AuditReport, radiance as unknown as AuditReport];

export function listReports(): AuditReport[] {
  return [...SAMPLES].sort((a, b) => b.generated.localeCompare(a.generated));
}

export function latestReport(): AuditReport {
  return listReports()[0];
}

/** `latest` is a real, linkable alias so nav links never rot when a new audit lands. */
export function getReport(id: string): AuditReport | undefined {
  if (id === "latest") return latestReport();
  return SAMPLES.find((report) => report.id === id);
}

export function reportIds(): string[] {
  return ["latest", ...SAMPLES.map((report) => report.id)];
}
