/* The fix list.

   A score with no remedy is a diagnosis with no prescription, and clients
   are not paying for a diagnosis. Every fix here is derived from a specific
   failed check, carries an honest effort estimate, and — where possible —
   names the fix-kit generator that produces the artifact outright. */

import type {
  AgentQuestion,
  DimensionId,
  DimensionScore,
  Effort,
  Fix,
  FogResult,
  GovConResult,
} from "./types.ts";

interface FixSpec {
  id: string;
  title: string;
  impact: number;
  effort: Effort;
  detail: string;
  artifact?: string;
}

/** Keyed by the exact `Evidence.label` emitted in dimensions.ts. */
const CATALOG: Record<string, FixSpec> = {
  "llms.txt": {
    id: "llms-txt",
    title: "Publish an llms.txt",
    impact: 5,
    effort: "low",
    detail:
      "A single machine-first file at the domain root stating what the company is, what it sells, who it serves, and where the authoritative pages live. It is the cheapest legibility gain available and takes under an hour.",
    artifact: "llms.txt generator",
  },
  "MCP descriptor": {
    id: "mcp",
    title: "Expose an MCP endpoint for agents",
    impact: 3,
    effort: "medium",
    detail:
      "A /.well-known/mcp.json plus a small server lets an agent query capabilities, check availability, and open a teaming inquiry without a human in the loop. Almost no competitor has one.",
    artifact: "MCP server scaffold",
  },
  "JSON-LD structured data": {
    id: "jsonld",
    title: "Add JSON-LD structured data sitewide",
    impact: 5,
    effort: "low",
    detail:
      "Organization, Service, and FAQPage markup turn prose into fields. Without it, every fact about the company is a guess made by a parser.",
    artifact: "JSON-LD schema pack",
  },
  "Organization schema": {
    id: "schema-org",
    title: "Declare the company as an Organization entity",
    impact: 5,
    effort: "low",
    detail:
      "Name, legal name, address, identifiers, sameAs links to SAM and LinkedIn. This is how a model stops treating the company as a webpage and starts treating it as a thing with attributes.",
    artifact: "JSON-LD schema pack",
  },
  "Service or Offer schema": {
    id: "schema-service",
    title: "Mark up each service as a structured entity",
    impact: 4,
    effort: "low",
    detail: "One Service node per capability, each with an area served and an audience, so a requirement can be matched field by field.",
    artifact: "JSON-LD schema pack",
  },
  "FAQ schema": {
    id: "schema-faq",
    title: "Publish a structured FAQ",
    impact: 4,
    effort: "low",
    detail:
      "The buyer questions already arriving by email, answered on the page in FAQPage markup. This is the format answer engines quote most directly.",
    artifact: "Structured FAQ generator",
  },
  "Content present without JavaScript": {
    id: "ssr",
    title: "Serve the content in the HTML",
    impact: 5,
    effort: "high",
    detail:
      "The page's substance currently arrives after JavaScript runs. Most retrieval pipelines never run it. Server-render or pre-render the core pages.",
  },
  "Critical information outside PDFs": {
    id: "pdf-liberation",
    title: "Republish the capability statement as a web page",
    impact: 4,
    effort: "medium",
    detail:
      "Keep the PDF for humans who ask for it, but the same content needs an HTML home with headings and structured data. A PDF is a locked room.",
    artifact: "Capability statement (HTML) template",
  },
  "Pricing page exists": {
    id: "pricing-page",
    title: "Build a parseable pricing page",
    impact: 5,
    effort: "medium",
    detail:
      "Even without list prices: contract types, labor-category structure, typical engagement sizes, and vehicle ceilings. Something has to fill the cost column.",
    artifact: "Pricing page template",
  },
  "Numeric prices published": {
    id: "pricing-numbers",
    title: "Publish at least one real number",
    impact: 5,
    effort: "medium",
    detail:
      "A range, a starting point, or a published rate schedule. An agent comparing three vendors will rank the two with numbers above the one without, every time.",
    artifact: "Pricing page template",
  },
  "No pure contact-gate": {
    id: "pricing-gate",
    title: "Replace the pricing contact-gate",
    impact: 4,
    effort: "low",
    detail:
      "'Contact us for pricing' reads to a model as 'unknown'. Keep the contact route, but put a range or a structure beside it.",
    artifact: "Pricing page template",
  },
  "Contract types stated": {
    id: "contract-types",
    title: "State the contract types worked under",
    impact: 3,
    effort: "low",
    detail: "FFP, T&M, CPFF, IDIQ. One line on the pricing page. In this market that line is the pricing model.",
    artifact: "Pricing page template",
  },
  "Rate schedule discoverable": {
    id: "rates",
    title: "Publish or link the labor rate schedule",
    impact: 3,
    effort: "medium",
    detail: "If a GSA price list exists, it is already public. Link it from the site rather than leaving it on GSA Advantage alone.",
  },
  "Comparison page": {
    id: "comparison",
    title: "Write the comparison page yourself",
    impact: 4,
    effort: "medium",
    detail:
      "If the firm does not describe how it differs from the alternatives, a model will infer it — usually wrongly, and usually to the incumbent's benefit. An honest comparison page is a defensive asset.",
    artifact: "Comparison page template",
  },
  "Explicit differentiator": {
    id: "differentiator",
    title: "State one checkable difference",
    impact: 4,
    effort: "low",
    detail: "A sentence that a competitor could not truthfully copy. Everything else on the site is table stakes.",
  },
  "Ideal-customer statement": {
    id: "fit",
    title: "Say who this is for, and who it is not for",
    impact: 3,
    effort: "low",
    detail: "Explicit fit criteria let agents screen correctly in both directions, which raises lead quality more than it lowers lead volume.",
  },
  "Named programs and platforms": {
    id: "programs",
    title: "Name the programs and platforms supported",
    impact: 5,
    effort: "medium",
    detail:
      "Within release constraints, name them. These are the literal strings buyers search on, and 'advanced defense systems' matches none of them.",
  },
  "Quantified claims": {
    id: "quantify",
    title: "Put numbers on the claims",
    impact: 4,
    effort: "low",
    detail: "Headcount, years in market, facility size, cleared staff, contract count. Numbers are the only claims a model can rank.",
  },
  "Named customers": {
    id: "customers",
    title: "Name the customer organizations",
    impact: 5,
    effort: "medium",
    detail: "'Federal customers' matches no query. 'Missile Defense Agency' matches the query being asked.",
  },
  "Past performance documented": {
    id: "past-performance",
    title: "Give past performance a structured home",
    impact: 5,
    effort: "medium",
    detail:
      "One page, one entry per engagement: customer, scope, period, role (prime or sub), outcome. This is the single highest-value page most GovCon sites are missing.",
    artifact: "Past performance page template",
  },
  "Certifications stated": {
    id: "certs",
    title: "List certifications with levels and dates",
    impact: 4,
    effort: "low",
    detail: "ISO 9001, AS9100, CMMI, CMMC. Registration number and date. These are checkbox filters that run before a human reads anything.",
  },
  "Quantified outcomes": {
    id: "outcomes",
    title: "Attach a number to at least one result",
    impact: 3,
    effort: "medium",
    detail: "One measured outcome per case study. Cleared for release, approximate is fine — adjectives are not.",
  },
  "Attributed testimonials": {
    id: "testimonials",
    title: "Attribute the quotes",
    impact: 2,
    effort: "medium",
    detail: "A named person and organization behind each quote. Unattributed praise is discarded as noise.",
  },
  "Copyright year current": {
    id: "copyright",
    title: "Fix the copyright year",
    impact: 2,
    effort: "low",
    detail: "A five-minute fix that removes the cheapest reason a model has to discount everything else on the page.",
  },
  "Dated content within 12 months": {
    id: "dates",
    title: "Date the content",
    impact: 3,
    effort: "medium",
    detail: "Published and updated dates in visible text and in markup. Undated content is treated as possibly obsolete.",
  },
  "News, blog, or changelog": {
    id: "changelog",
    title: "Stand up a changelog",
    impact: 3,
    effort: "medium",
    detail:
      "Contract awards, certifications, hires, capability additions. Twelve entries a year is enough to give re-crawls something to record.",
    artifact: "Changelog scaffold",
  },
  "sitemap.xml": {
    id: "sitemap",
    title: "Publish a sitemap with lastmod dates",
    impact: 3,
    effort: "low",
    detail: "Complete URL inventory with accurate lastmod values, declared in robots.txt.",
  },
  "Sitemap lastmod fresh": {
    id: "sitemap-lastmod",
    title: "Emit accurate lastmod dates",
    impact: 2,
    effort: "low",
    detail: "lastmod values that reflect real edits, so crawlers spend their budget on what changed.",
  },
  "No blanket crawl block": {
    id: "robots-block",
    title: "Remove the site-wide crawl block",
    impact: 5,
    effort: "low",
    detail: "robots.txt currently disallows crawling at the root. Nothing else in this report matters until that line is changed.",
    artifact: "robots.txt template",
  },
  "Content-Signal policy": {
    id: "content-signal",
    title: "Decide the Content-Signal policy deliberately",
    impact: 5,
    effort: "low",
    detail:
      "The current ai-input directive tells assistants they may not ground answers in this content. That is usually a CDN default rather than a decision. Make it a decision.",
    artifact: "robots.txt template",
  },
  "HTTPS preserved end to end": {
    id: "https",
    title: "Stop the HTTPS downgrade",
    impact: 4,
    effort: "low",
    detail:
      "The canonical URL redirects to plain HTTP. Some crawlers refuse the fetch, and every one that accepts it discounts the source. This is a redirect rule, not a project.",
  },
  "Semantic landmarks": {
    id: "landmarks",
    title: "Add semantic landmarks",
    impact: 3,
    effort: "low",
    detail: "main, header, nav, footer. Landmarks tell a parser which text is content and which is furniture.",
  },
  "Single H1": {
    id: "h1",
    title: "Repair the heading outline",
    impact: 3,
    effort: "low",
    detail: "One H1 per page stating its subject, H2s beneath it, no level skips.",
  },
  "Marketing-speak density": {
    id: "fog",
    title: "Rewrite the foggiest copy",
    impact: 4,
    effort: "medium",
    detail:
      "Replace stock phrases with specifics: what was built, for whom, on what, with what result. Fog is the one defect that survives every redesign.",
  },
  "Images carry alt text": {
    id: "alt-text",
    title: "Caption the images",
    impact: 2,
    effort: "low",
    detail: "Anything stated only inside an image does not exist to a text-based agent.",
  },
};

const GOVCON_EFFORT: Record<string, Effort> = {
  cage: "low",
  uei: "low",
  duns: "low",
  naics: "low",
  setaside: "low",
  size: "low",
  cmmc: "medium",
  nist171: "medium",
  quality: "low",
  vehicles: "low",
  pastperf: "medium",
  clearance: "medium",
  agencies: "medium",
  location: "low",
  poc: "low",
  capstatement: "medium",
};

export function buildFixes(
  dimensions: readonly DimensionScore[],
  govcon: GovConResult,
  fog: FogResult,
): Fix[] {
  const fixes = new Map<string, Fix>();

  for (const dimension of dimensions) {
    for (const evidence of dimension.evidence) {
      if (evidence.status !== "fail" && evidence.status !== "partial") continue;
      const spec = CATALOG[evidence.label];
      if (!spec || fixes.has(spec.id)) continue;
      fixes.set(spec.id, {
        id: spec.id,
        title: spec.title,
        dimension: dimension.id,
        impact: spec.impact,
        effort: spec.effort,
        detail: spec.detail,
        artifact: spec.artifact,
      });
    }
  }

  // Crawler posture is many checks but one edit, so it collapses to one fix.
  const discoverable = dimensions.find((d) => d.id === "discoverable");
  const postureGaps = discoverable?.evidence.filter(
    (e) => /posture$/.test(e.label) && e.status !== "pass",
  );
  if (postureGaps && postureGaps.length > 0 && !fixes.has("robots-policy")) {
    const blocked = postureGaps.filter((e) => e.status === "fail");
    fixes.set("robots-policy", {
      id: "robots-policy",
      title: blocked.length > 0 ? "Unblock the AI crawlers you did not mean to block" : "State AI crawler policy explicitly",
      dimension: "discoverable",
      impact: blocked.length > 0 ? 5 : 3,
      effort: "low",
      detail:
        blocked.length > 0
          ? `${blocked.map((e) => e.label.replace(" posture", "")).join(", ")} cannot read this site. Name every AI agent in robots.txt and decide each one on purpose.`
          : `${postureGaps.length} major AI crawlers are unnamed in robots.txt, so their access depends on an inherited default. Name them.`,
      artifact: "robots.txt template",
    });
  }

  for (const signal of govcon.signals) {
    if (signal.found || signal.weight === "medium") continue;
    const id = `govcon-${signal.id}`;
    fixes.set(id, {
      id,
      title: `State ${signal.label} on the site`,
      dimension: "govcon",
      impact: signal.weight === "critical" ? 5 : 4,
      effort: GOVCON_EFFORT[signal.id] ?? "low",
      detail: signal.why,
      artifact: signal.id === "capstatement" ? "Capability statement (HTML) template" : "llms.txt generator",
    });
  }

  if (fog.worstSentence && !fixes.has("fog")) {
    fixes.set("fog", {
      id: "fog",
      title: "Rewrite the foggiest copy",
      dimension: "fog",
      impact: 4,
      effort: "medium",
      detail: CATALOG["Marketing-speak density"].detail,
    });
  }

  const effortRank: Record<Effort, number> = { low: 0, medium: 1, high: 2 };
  return [...fixes.values()].sort(
    (a, b) => b.impact - a.impact || effortRank[a.effort] - effortRank[b.effort] || a.title.localeCompare(b.title),
  );
}

/* ---------------------------------------------------------------- */
/* What an agent can actually answer today                           */
/* ---------------------------------------------------------------- */

function verdict(found: boolean, partial = false): AgentQuestion["answerable"] {
  return found ? "yes" : partial ? "partial" : "no";
}

export function buildAgentView(
  dimensions: readonly DimensionScore[],
  govcon: GovConResult,
  company: string,
): AgentQuestion[] {
  const signal = (id: string) => govcon.signals.find((s) => s.id === id);
  const dimension = (id: DimensionId) => dimensions.find((d) => d.id === id);
  const evidence = (dimensionId: DimensionId, label: string) =>
    dimension(dimensionId)?.evidence.find((e) => e.label === label);

  const setaside = signal("setaside");
  const cmmc = signal("cmmc");
  const vehicles = signal("vehicles");
  const naics = signal("naics");
  const uei = signal("uei");
  const agencies = signal("agencies");
  const clearance = signal("clearance");
  const priceCheck = evidence("priced", "Numeric prices published");
  const compareCheck = evidence("comparable", "Explicit differentiator");

  return [
    {
      id: "what-do-they-do",
      question: `What exactly does ${company} do?`,
      answerable: verdict(
        (dimension("comparable")?.score ?? 0) >= 60,
        (dimension("comparable")?.score ?? 0) >= 35,
      ),
      fromSite:
        evidence("comparable", "Named programs and platforms")?.detail ??
        "No capability evidence was recoverable from the site.",
    },
    {
      id: "socioeconomic",
      question: `Is ${company} an SDVOSB, 8(a), WOSB, or HUBZone firm?`,
      answerable: verdict(setaside?.found ?? false),
      fromSite: setaside?.found
        ? `Stated on site: ${setaside.value}`
        : "Nothing on the site states a set-aside status. An agent filtering by it excludes the firm.",
    },
    {
      id: "cmmc",
      question: `Is ${company} CMMC compliant, and at what level?`,
      answerable: verdict(cmmc?.found ?? false),
      fromSite: cmmc?.found
        ? `Stated on site: ${cmmc.value}`
        : "CMMC is never mentioned. The query 'CMMC Level 2 contractor' cannot return this firm.",
    },
    {
      id: "vehicles",
      question: `What contract vehicles does ${company} hold?`,
      answerable: verdict(vehicles?.found ?? false),
      fromSite: vehicles?.found
        ? `Stated on site: ${vehicles.value}`
        : "No contract vehicles named, so no agent can tell a buyer how to actually purchase.",
    },
    {
      id: "identity",
      question: `What is ${company}'s UEI and NAICS coverage?`,
      answerable: verdict(
        (uei?.found ?? false) && (naics?.found ?? false),
        (uei?.found ?? false) || (naics?.found ?? false),
      ),
      fromSite: [uei?.found ? `UEI: ${uei.value}` : "No UEI", naics?.found ? `NAICS: ${naics.value}` : "No NAICS codes"].join(
        " · ",
      ),
    },
    {
      id: "customers",
      question: `Who has ${company} actually delivered for?`,
      answerable: verdict(agencies?.found ?? false),
      fromSite: agencies?.found
        ? `Named on site: ${agencies.value}`
        : "No customer agency is named anywhere on the site.",
    },
    {
      id: "clearance",
      question: `Does ${company} hold a facility clearance?`,
      answerable: verdict(clearance?.found ?? false),
      fromSite: clearance?.found
        ? `Stated on site: ${clearance.value}`
        : "Clearance posture is unstated, so classified-work queries screen the firm out.",
    },
    {
      id: "cost",
      question: `What does working with ${company} cost?`,
      answerable: verdict(
        (priceCheck?.points ?? 0) >= (priceCheck?.possible ?? 1) * 0.9,
        (priceCheck?.points ?? 0) > 0,
      ),
      fromSite: priceCheck?.detail ?? "No pricing evidence found.",
    },
    {
      id: "why-them",
      question: `Why choose ${company} over the alternative?`,
      answerable: verdict(compareCheck?.status === "pass", (dimension("comparable")?.score ?? 0) >= 50),
      fromSite: compareCheck?.quote ?? "The site never contrasts the firm with an alternative.",
    },
  ];
}
