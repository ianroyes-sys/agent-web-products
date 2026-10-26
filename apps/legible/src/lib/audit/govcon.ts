/* The GovCon overlay — the headline argument of the whole product.

   A buyer's agent is asked: "find me an SDVOSB in Huntsville with CMMC
   Level 2 doing missile-defense software." The agent has to answer from
   what is written down. A firm that holds all three and states none of
   them is not shortlisted, is never told why, and never learns it lost.

   Each signal below is a filter that runs before a human reads anything. */

import type { AuditContext } from "./crawl.ts";
import type { GovConResult, GovConSignal, SignalWeight } from "./types.ts";

interface SignalSpec {
  id: string;
  label: string;
  pattern: RegExp;
  /** Narrower pattern used to pull the literal value, when one exists. */
  capture?: RegExp;
  why: string;
  weight: SignalWeight;
}

const WEIGHT_POINTS: Record<SignalWeight, number> = {
  critical: 10,
  high: 6,
  medium: 3,
};

export const GOVCON_SIGNALS: SignalSpec[] = [
  {
    id: "cage",
    label: "CAGE code",
    pattern: /\bCAGE\b/i,
    capture: /\bCAGE(?:\s*code)?\s*[:#]?\s*([0-9A-Z]{5})\b/i,
    why: "The CAGE code is how a contracting system resolves a company name to an entity. Without it, an agent cannot confirm the firm it found is the firm in SAM.",
    weight: "critical",
  },
  {
    id: "uei",
    label: "UEI (SAM Unique Entity ID)",
    pattern: /\bUEI\b|Unique Entity ID/i,
    capture: /\b(?:UEI|Unique Entity ID)\s*[:#]?\s*([A-Z0-9]{12})\b/i,
    why: "The UEI replaced DUNS as the federal identity key. It is the single field that makes a firm machine-resolvable across SAM, USAspending, and every prime's supplier portal.",
    weight: "critical",
  },
  {
    id: "duns",
    label: "DUNS (legacy)",
    pattern: /\bDUNS\b/i,
    capture: /\bDUNS\s*(?:number)?\s*[:#]?\s*(\d{2}-?\d{3}-?\d{4}|\d{9})\b/i,
    why: "Retired federally in 2022, but still requested by some primes and databases. Cheap to publish alongside the UEI.",
    weight: "medium",
  },
  {
    id: "naics",
    label: "NAICS codes",
    pattern: /\bNAICS\b/i,
    capture: /\bNAICS\s*(?:codes?)?\s*[:#]?\s*(\d{6}(?:\s*[,/]\s*\d{6})*)/i,
    why: "Every federal opportunity is filtered by NAICS before anything else. A firm that never states its codes cannot be matched to the solicitations it should be winning.",
    weight: "critical",
  },
  {
    id: "setaside",
    label: "Set-aside / socioeconomic status",
    pattern: /\b(8\(a\)|SDVOSB|service[- ]disabled veteran[- ]owned|VOSB|veteran[- ]owned|WOSB|EDWOSB|woman[- ]owned|HUBZone|small disadvantaged business|SDB)\b/i,
    capture: /\b(8\(a\)|SDVOSB|service[- ]disabled veteran[- ]owned(?: small business)?|VOSB|WOSB|EDWOSB|woman[- ]owned(?: small business)?|HUBZone|small disadvantaged business)\b/i,
    why: "Set-aside status is a hard filter on a majority of small-business solicitations. Unstated status means the firm is excluded from the searches it would automatically win.",
    weight: "critical",
  },
  {
    id: "size",
    label: "Business size standard",
    pattern: /\b(small business|other than small|large business|size standard)\b/i,
    capture: /\b((?:certified )?small business(?: concern)?|other than small business)\b/i,
    why: "Primes building a subcontracting plan filter on size before capability. Stating it removes a round of email.",
    weight: "high",
  },
  {
    id: "cmmc",
    label: "CMMC status",
    pattern: /\bCMMC\b/i,
    capture: /\bCMMC\s*(?:2\.0\s*)?(?:Level\s*)?([1-3])?\b/i,
    why: "CMMC is becoming a gate on any contract touching CUI. An agent screening for 'CMMC Level 2' matches on the literal string or not at all.",
    weight: "critical",
  },
  {
    id: "nist171",
    label: "NIST SP 800-171 / DFARS 7012",
    pattern: /\b(NIST\s*SP\s*800-171|DFARS\s*252\.204-7012|SPRS)\b/i,
    why: "The compliance posture behind CMMC. Naming it, with an SPRS score, is the difference between 'claims compliance' and 'documented compliance'.",
    weight: "high",
  },
  {
    id: "quality",
    label: "Quality certifications (ISO / AS9100 / CMMI)",
    pattern: /\b(ISO ?9001|AS ?9100|ISO ?27001|CMMI)\b/i,
    capture: /\b(ISO ?9001(?::\d{4})?|AS ?9100[A-Z]?|ISO ?27001|CMMI[- ]?(?:DEV|SVC)?\s*(?:Level|ML)?\s*[1-5]?)\b/i,
    why: "Quality registrations are checkbox filters in supplier qualification. They are trivially verifiable and their absence is read as absence, not as silence.",
    weight: "high",
  },
  {
    id: "vehicles",
    label: "Contract vehicles",
    pattern: /\b(GSA (?:MAS|Multiple Award Schedule|Schedule)|SEWP|CIO[- ]SP\d?|OASIS|Alliant ?2?|RS3|EXPRESS|S3\b|ITES[- ]?\w*|SBIR Phase III|BOA\b|IDIQ)\b/i,
    capture: /\b(GSA (?:MAS|Multiple Award Schedule|Schedule)[^.,;]{0,30}|SEWP ?[VI]*|CIO[- ]SP\d?|OASIS[^.,;]{0,12}|Alliant ?2?|RS3|ITES[- ]?\w*)\b/i,
    why: "A vehicle is a shortcut to award. An agent asked 'can we buy from them this quarter' is really asking which vehicle they are on.",
    weight: "critical",
  },
  {
    id: "pastperf",
    label: "Past performance citations",
    pattern: /\b(past performance|prime contract|subcontract(?:or)? to|contract (?:number|no\.?|#)|awarded (?:a|the) contract)\b/i,
    why: "Past performance is the evidence layer of every proposal. If it exists only in a PDF or a proposal library, no agent can weigh it.",
    weight: "high",
  },
  {
    id: "clearance",
    label: "Facility clearance / cleared staff",
    pattern: /\b(facility clearance|FCL\b|SCIF|cleared (?:personnel|staff|engineers)|Top Secret|TS\/SCI|Secret[- ]level|security clearance)\b/i,
    capture: /\b(facility clearance(?: level)?[^.,;]{0,24}|TS\/SCI|Top Secret|SCIF[^.,;]{0,20}|\d{1,4}\+? cleared \w+)\b/i,
    why: "Clearance level is a hard gate on classified work. Firms routinely hold an FCL and never mention it, and get filtered out of the exact work they are cleared for.",
    weight: "high",
  },
  {
    id: "agencies",
    label: "Customer agencies named",
    pattern: /\b(Missile Defense Agency|MDA\b|U\.?S\.? Army|SMDC|AMCOM|DEVCOM|NASA|Marshall Space Flight Center|Air Force|Space Force|PEO [A-Z])/,
    why: "Agency names are the vocabulary buyers search in. 'Federal customers' matches nothing; 'Missile Defense Agency' matches the query.",
    weight: "high",
  },
  {
    id: "location",
    label: "Physical address stated",
    pattern: /\b(Huntsville|Madison|Redstone Arsenal|Cummings Research Park)\b[^.]{0,60}\b(AL|Alabama)\b|\b\d+ [A-Z][\w.]+ (?:Dr|Drive|Rd|Road|Blvd|Boulevard|St|Street|Ave|Avenue|Way|Pkwy|Parkway)\b/i,
    capture: /(\b\d+ [A-Z][\w. ]{2,40}(?:Dr|Drive|Rd|Road|Blvd|Boulevard|St|Street|Ave|Avenue|Way|Pkwy|Parkway)[^[\]]{0,60}?\b[A-Z]{2},? ?\d{5})/,
    why: "Geographic filters are the second most common after NAICS. 'Near Redstone Arsenal' is a literal proximity query an agent runs against a literal address.",
    weight: "high",
  },
  {
    id: "poc",
    label: "Teaming / subcontracting point of contact",
    pattern: /\b(teaming|subcontract\w* (?:opportunit|inquir)|business development|capture manager|small business liaison)\b/i,
    why: "Primes looking for a teammate need a named route in. A generic contact form is where teaming inquiries go to die.",
    weight: "medium",
  },
  {
    id: "capstatement",
    label: "Capability statement in HTML",
    pattern: /\bcapabilit(?:y|ies) statement\b/i,
    why: "Nearly every firm has one as a PDF. Almost none publish it as a web page, which is the only form a retrieval pipeline can actually read.",
    weight: "medium",
  },
];

/** Captured values are report copy, so they get collapsed and trimmed. */
function tidy(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^[\s|,;:.\-–—[\]]+/, "")
    .replace(/[\s|,;:[\]]+$/, "")
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : undefined;
}

export function scoreGovCon(ctx: AuditContext, company: string, location: string): GovConResult {
  const signals: GovConSignal[] = [];
  let earned = 0;
  let possible = 0;

  for (const spec of GOVCON_SIGNALS) {
    const hit = ctx.find(spec.pattern);
    // Fall back to the signal pattern itself so `value` is always the matched
    // term, never a paragraph of navigation scraped from around it.
    const captured = ctx.capture(spec.capture ?? spec.pattern);
    const points = WEIGHT_POINTS[spec.weight];
    possible += points;
    if (hit) earned += points;

    signals.push({
      id: spec.id,
      label: spec.label,
      found: Boolean(hit),
      value: hit ? tidy(captured?.value) : undefined,
      quote: hit?.quote,
      source: captured?.source ?? hit?.source,
      why: spec.why,
      weight: spec.weight,
    });
  }

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  const missingCritical = signals.filter((s) => !s.found && s.weight === "critical");

  const setAside = signals.find((s) => s.id === "setaside");
  const cmmc = signals.find((s) => s.id === "cmmc");
  const naics = signals.find((s) => s.id === "naics");

  const failedQuery = [
    `"Find me a ${setAside?.found ? setAside.value ?? "small business" : "[set-aside status]"} in ${location}`,
    `with ${cmmc?.found ? `CMMC ${cmmc.value ?? ""}`.trim() : "[CMMC level]"}`,
    `under NAICS ${naics?.found ? naics.value : "[code]"} for missile-defense software."`,
  ].join(" ");

  const verdict = missingCritical.length === 0
    ? `${company} states every hard-filter field an agent screens on. It survives automated qualification.`
    : `${company} is missing ${missingCritical.length} of the ${signals.filter((s) => s.weight === "critical").length} fields an agent uses as hard filters: ${missingCritical.map((s) => s.label).join(", ")}. Any query specifying one of these excludes the firm silently.`;

  return { score, signals, verdict, failedQuery };
}
