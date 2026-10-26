/* The six web dimensions.

   Each returns a DimensionScore whose evidence array is a complete audit
   trail: what we looked for, whether we found it, and the literal text we
   found. Nothing in a Legible report should require the reader to trust us. */

import type { AuditContext } from "./crawl.ts";
import { escapeRegex, jsonLdTypes } from "./html.ts";
import { AI_AGENTS, parseRobots, posture } from "./robots.ts";
import { Scorer } from "./scorer.ts";
import type { DimensionScore, FogResult } from "./types.ts";

export const DIMENSION_WEIGHTS = {
  discoverable: 0.14,
  parseable: 0.16,
  priced: 0.12,
  comparable: 0.13,
  proven: 0.12,
  current: 0.08,
  fog: 0.1,
} as const;

/** GovCon carries the remaining 0.15. It is the vertical's whole thesis. */
export const GOVCON_WEIGHT = 0.15;

/* ---------------------------------------------------------------- */
/* Discoverable                                                      */
/* ---------------------------------------------------------------- */

export function scoreDiscoverable(ctx: AuditContext): DimensionScore {
  const s = new Scorer();
  const robotsRaw = ctx.raw("/robots.txt");
  const robots = parseRobots(robotsRaw);
  const robotsUrl = ctx.page("/robots.txt")?.record.url;

  s.check({
    label: "robots.txt served",
    award: robots.present ? 1 : 0,
    points: 8,
    detail: robots.present
      ? "A robots.txt exists, so crawler policy is at least stated."
      : "No robots.txt. Crawler policy is undefined, which most agents read as permissive but no auditor can confirm.",
    source: robotsUrl,
  });

  const wildcard = robots.groups.get("*");
  const blanketBlock = wildcard?.disallow.includes("/") ?? false;
  s.check({
    label: "No blanket crawl block",
    award: blanketBlock ? 0 : 1,
    points: 10,
    detail: blanketBlock
      ? "robots.txt disallows every crawler at the root. The site is invisible to answer engines by instruction."
      : "No site-wide Disallow. Crawlers can reach the content.",
    quote: blanketBlock ? "User-agent: *\nDisallow: /" : undefined,
    source: robotsUrl,
  });

  for (const agent of AI_AGENTS.slice(0, 4)) {
    const result = posture(robots, agent);
    const award = result.posture === "allowed" ? 1 : result.posture === "blocked" ? 0 : 0.6;
    s.check({
      label: `${agent} posture`,
      award,
      points: 5,
      detail:
        result.posture === "blocked"
          ? `${agent} is explicitly blocked. Content from this site cannot be used by the assistant it feeds.`
          : result.posture === "allowed"
            ? `${agent} is named and permitted — an intentional, auditable decision.`
            : `${agent} is unnamed. Access is implied rather than granted, and it changes whenever the CDN default changes.`,
      quote: result.line,
      source: robotsUrl,
    });
  }

  const signals = robots.contentSignals;
  const signalKeys = Object.keys(signals);
  if (signalKeys.length > 0) {
    const aiInput = signals["ai-input"];
    const aiTrain = signals["ai-train"];
    s.check({
      label: "Content-Signal policy",
      award: aiInput === "no" ? 0 : aiInput === "yes" ? 1 : 0.5,
      points: 8,
      detail:
        aiInput === "no"
          ? "Content-Signal sets ai-input=no, telling assistants they may not use this content to ground an answer. This is usually an inherited CDN default, not a decision the company made."
          : aiInput === "yes"
            ? "Content-Signal permits ai-input, so assistants may ground answers in this content."
            : `Content-Signal is present (${signalKeys.join(", ")}) but does not address ai-input directly.`,
      quote: aiTrain ? `ai-train=${aiTrain}, ai-input=${aiInput ?? "unset"}` : undefined,
      source: robotsUrl,
    });
  }

  const sitemapPage = ctx.page("/sitemap.xml");
  const sitemapOk = sitemapPage?.record.ok === true && /<urlset|<sitemapindex/i.test(ctx.raw("/sitemap.xml"));
  const urlCount = (ctx.raw("/sitemap.xml").match(/<loc>/gi) ?? []).length;
  s.check({
    label: "sitemap.xml",
    award: sitemapOk ? 1 : 0,
    points: 10,
    detail: sitemapOk
      ? `Sitemap resolves with ${urlCount} URLs, giving crawlers a complete inventory.`
      : "No usable sitemap.xml. Crawlers must guess the site's shape from links alone.",
    source: sitemapPage?.record.url,
  });

  s.check({
    label: "Sitemap declared in robots.txt",
    award: robots.sitemaps.length > 0 ? 1 : 0,
    points: 4,
    detail:
      robots.sitemaps.length > 0
        ? "robots.txt points to the sitemap, which is how most crawlers find it."
        : "The sitemap is not declared in robots.txt, so it is only found by convention.",
    quote: robots.sitemaps[0],
    source: robotsUrl,
  });

  const llms = ctx.page("/llms.txt");
  const llmsOk = llms?.record.ok === true && ctx.raw("/llms.txt").length > 40;
  s.check({
    label: "llms.txt",
    award: llmsOk ? 1 : 0,
    points: 16,
    detail: llmsOk
      ? "An llms.txt exists — a curated, machine-first summary of what this company is and does."
      : "No llms.txt. There is no file on this domain written for a model rather than a browser, so every assistant reconstructs the company from marketing pages.",
    source: llms?.record.url,
  });

  const mcp = ctx.page("/.well-known/mcp.json");
  s.check({
    label: "MCP descriptor",
    award: mcp?.record.ok ? 1 : 0,
    points: 8,
    detail: mcp?.record.ok
      ? "A /.well-known/mcp.json descriptor is published, so agents can discover callable tools."
      : "No /.well-known/mcp.json. Agents can read this company but cannot transact with it.",
    source: mcp?.record.url,
  });

  const noindex = /noindex/i.test(ctx.homepage?.metaRobots ?? "");
  s.check({
    label: "Homepage indexable",
    award: noindex ? 0 : 1,
    points: 6,
    detail: noindex
      ? "The homepage carries a noindex directive."
      : "The homepage is indexable.",
    quote: noindex ? ctx.homepage?.metaRobots : undefined,
  });

  const finalUrl = ctx.page("/")?.record.url ?? "";
  const httpsHeld = finalUrl.startsWith("https://");
  s.check({
    label: "HTTPS preserved end to end",
    award: httpsHeld ? 1 : 0,
    points: 6,
    detail: httpsHeld
      ? "The homepage resolves over HTTPS."
      : `A request to https://${ctx.domain} lands on ${finalUrl}. Agents and crawlers treat a downgrade to plain HTTP as a trust signal, and some refuse the fetch outright.`,
    quote: httpsHeld ? undefined : finalUrl,
  });

  const blocked = AI_AGENTS.slice(0, 4)
    .map((a) => posture(robots, a))
    .filter((p) => p.posture === "blocked").length;

  return {
    id: "discoverable",
    label: "Discoverable",
    question: "Can an agent legally and technically reach this content?",
    score: s.score,
    weight: DIMENSION_WEIGHTS.discoverable,
    summary: blocked > 0
      ? `${blocked} of the four major AI crawlers are blocked outright.`
      : llmsOk
        ? "Crawlable, with a machine-first summary published."
        : "Crawlable, but nothing on this domain is written for a machine.",
    evidence: s.evidence,
  };
}

/* ---------------------------------------------------------------- */
/* Parseable                                                         */
/* ---------------------------------------------------------------- */

export function scoreParseable(ctx: AuditContext): DimensionScore {
  const s = new Scorer();
  const home = ctx.homepage;
  const homeUrl = ctx.page("/")?.record.url;

  const allNodes = ctx.htmlPages().flatMap((p) => p.parsed?.jsonLd ?? []);
  const types = jsonLdTypes(allNodes);
  const blocks = ctx.htmlPages().reduce((n, p) => n + (p.parsed?.jsonLdBlocks ?? 0), 0);
  const invalid = ctx.htmlPages().reduce((n, p) => n + (p.parsed?.jsonLdInvalid ?? 0), 0);

  s.check({
    label: "JSON-LD structured data",
    award: blocks > 0 ? 1 : 0,
    points: 14,
    detail: blocks > 0
      ? `${blocks} JSON-LD blocks found across the crawl, declaring: ${types.slice(0, 8).join(", ") || "no recognizable types"}.`
      : "No JSON-LD anywhere. Every fact about this company — name, address, services, hours — has to be inferred from prose.",
    source: homeUrl,
  });

  const hasOrg = types.some((t) => /Organization|LocalBusiness|Corporation/i.test(t));
  s.check({
    label: "Organization schema",
    award: hasOrg ? 1 : 0,
    points: 12,
    detail: hasOrg
      ? "An Organization-class entity is declared, so the company resolves as a thing rather than a page."
      : "No Organization schema. There is no machine-readable statement of who this company is.",
  });

  const hasService = types.some((t) => /Service|Product|Offer|ProfessionalService/i.test(t));
  s.check({
    label: "Service or Offer schema",
    award: hasService ? 1 : 0,
    points: 8,
    detail: hasService
      ? "Services are declared as structured entities and can be matched to a buyer's requirement."
      : "Services exist only as headings and paragraphs. Nothing is comparable field-by-field.",
  });

  const hasFaq = types.some((t) => /FAQPage|Question/i.test(t));
  s.check({
    label: "FAQ schema",
    award: hasFaq ? 1 : 0,
    points: 6,
    detail: hasFaq
      ? "FAQ schema is present, which is the format answer engines quote most directly."
      : "No FAQPage schema. Buyer questions are answered, if at all, in unmarked prose.",
  });

  s.check({
    label: "Structured data parses cleanly",
    award: blocks === 0 ? 0 : invalid === 0 ? 1 : 0.3,
    points: 4,
    detail:
      blocks === 0
        ? "Nothing to parse."
        : invalid === 0
          ? "All JSON-LD blocks are valid JSON."
          : `${invalid} JSON-LD block(s) fail to parse and are discarded by every consumer.`,
  });

  const sem = home?.semantic;
  const landmarks = sem ? [sem.main, sem.header, sem.footer, sem.nav].filter(Boolean).length : 0;
  s.check({
    label: "Semantic landmarks",
    award: landmarks / 4,
    points: 8,
    detail: `${landmarks} of 4 landmark elements (main, header, footer, nav) present. Landmarks tell a parser which text is content and which is chrome.`,
    source: homeUrl,
  });

  const h1s = home?.headings.filter((h) => h.level === 1) ?? [];
  s.check({
    label: "Single H1",
    award: h1s.length === 1 ? 1 : h1s.length === 0 ? 0 : 0.4,
    points: 6,
    detail:
      h1s.length === 1
        ? "Exactly one H1 states the page's subject."
        : h1s.length === 0
          ? "No H1 on the homepage. The page has no declared subject."
          : `${h1s.length} H1 elements compete to define the page's subject.`,
    quote: h1s[0]?.text,
    source: homeUrl,
  });

  const levels = home?.headings.map((h) => h.level) ?? [];
  const skips = levels.filter((level, i) => i > 0 && level - levels[i - 1] > 1).length;
  s.check({
    label: "Heading hierarchy",
    award: levels.length < 3 ? 0.2 : skips === 0 ? 1 : 0.5,
    points: 6,
    detail:
      levels.length < 3
        ? "Fewer than three headings on the homepage — there is no outline for a model to follow."
        : skips === 0
          ? `${levels.length} headings form a clean outline.`
          : `${skips} heading-level skips break the outline a parser builds from the page.`,
    source: homeUrl,
  });

  const hasTitle = (home?.title.length ?? 0) > 10;
  const hasDesc = (home?.metaDescription.length ?? 0) > 40;
  s.check({
    label: "Title and meta description",
    award: (hasTitle ? 0.5 : 0) + (hasDesc ? 0.5 : 0),
    points: 8,
    detail: hasTitle && hasDesc
      ? "Title and description both present and substantive."
      : `Missing or thin: ${[!hasTitle && "title", !hasDesc && "meta description"].filter(Boolean).join(" and ")}.`,
    quote: home?.title || undefined,
    source: homeUrl,
  });

  const textLength = home?.text.length ?? 0;
  s.check({
    label: "Content present without JavaScript",
    award: textLength >= 1200 ? 1 : textLength >= 400 ? 0.5 : 0,
    points: 12,
    detail:
      textLength >= 1200
        ? `${textLength.toLocaleString()} characters of text are in the served HTML. Agents that do not run a browser still read the page.`
        : textLength >= 400
          ? `Only ${textLength} characters of text in the served HTML. Much of the page likely renders client-side, where most crawlers never see it.`
          : "Almost no text in the served HTML. To a non-rendering agent this site is effectively blank.",
    source: homeUrl,
  });

  const pdfLinks = ctx
    .htmlPages()
    .flatMap((p) => p.parsed?.links ?? [])
    .filter((l) => /\.pdf(\?|$)/i.test(l.href));
  const criticalPdf = pdfLinks.filter((l) =>
    /capabilit|statement|brochure|rate|price|past performance|line card/i.test(`${l.text} ${l.href}`),
  );
  s.check({
    label: "Critical information outside PDFs",
    award: criticalPdf.length === 0 ? 1 : criticalPdf.length <= 2 ? 0.4 : 0,
    points: 8,
    detail:
      criticalPdf.length === 0
        ? "No capability statements or rate sheets are locked in PDFs."
        : `${criticalPdf.length} core document(s) are PDF-only. A capability statement in a PDF is invisible to most retrieval pipelines.`,
    quote: criticalPdf[0] ? `${criticalPdf[0].text || "PDF"} → ${criticalPdf[0].href}` : undefined,
  });

  const images = home?.images ?? [];
  const missingAlt = images.filter((i) => !i.alt.trim()).length;
  s.check({
    label: "Images carry alt text",
    award: images.length === 0 ? 1 : 1 - Math.min(1, missingAlt / images.length),
    points: 4,
    detail:
      images.length === 0
        ? "No images to caption on the homepage."
        : `${missingAlt} of ${images.length} homepage images have no alt text. Anything stated only inside an image is unreadable.`,
    source: homeUrl,
  });

  s.check({
    label: "Language declared",
    award: home?.lang ? 1 : 0,
    points: 2,
    detail: home?.lang ? `Document language declared as "${home.lang}".` : "No lang attribute on <html>.",
  });

  const structural = (home?.tables ?? 0) + (home?.lists ?? 0);
  s.check({
    label: "Structured elements used",
    award: structural >= 3 ? 1 : structural >= 1 ? 0.5 : 0,
    points: 2,
    detail: `${structural} list or table elements. Lists and tables are the cheapest structure a page can carry.`,
  });

  return {
    id: "parseable",
    label: "Parseable",
    question: "Once an agent has the page, can it extract facts from it?",
    score: s.score,
    weight: DIMENSION_WEIGHTS.parseable,
    summary: blocks === 0
      ? "No structured data at all — every fact must be inferred from prose."
      : hasOrg
        ? "Structured data present; the company resolves as an entity."
        : "Some structured data, but the company itself is not declared.",
    evidence: s.evidence,
  };
}

/* ---------------------------------------------------------------- */
/* Priced                                                            */
/* ---------------------------------------------------------------- */

const PRICE_PATTERN = /\$\s?\d[\d,]*(?:\.\d{2})?(?:\s?(?:k|m|million|billion))?/gi;
const GATE_PATTERN =
  /\b(contact (?:us|our team|sales)(?: (?:for|to get|to request))?\s*(?:a )?(?:pricing|quote|price|estimate)|request a quote|get a quote|pricing (?:available )?upon request|call for pricing|let'?s talk|schedule a consultation)\b/i;
const RATE_PATTERN =
  /\b(gsa (?:schedule|mas|advantage|price list)|labor (?:category|categories|rates?)|rate (?:card|schedule|sheet)|hourly rate|price list|slin|clin)\b/i;
const CONTRACT_TYPE_PATTERN =
  /\b(firm[- ]fixed[- ]price|ffp\b|time[- ]and[- ]materials|t&m\b|cost[- ]plus[- ]fixed[- ]fee|cpff\b|cost[- ]plus|idiq\b|labor[- ]hour)\b/i;

/** Words that make a dollar figure a *price* rather than a donation, a
    contract ceiling, or a revenue milestone. Without this filter a
    charitable-giving page reads as a published rate card. */
const PRICE_CONTEXT =
  /\b(pric\w+|cost(?:s|ing)?|rate|rates|fee|fees|per (?:hour|month|year|seat|user|unit|project)|\/(?:mo|yr|hr|user|seat)|starting at|from|plan|package|tier|retainer|subscription|quote|invoice|billed|budget)\b/i;

function findQuotedPrices(text: string, onPricingPage: boolean): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(PRICE_PATTERN)) {
    const value = match[0];
    if (/^\$\s?0+$/.test(value)) continue;
    if (!onPricingPage) {
      const window = text.slice(Math.max(0, match.index - 90), match.index + value.length + 90);
      if (!PRICE_CONTEXT.test(window)) continue;
    }
    found.push(value);
  }
  return found;
}

export function scorePriced(ctx: AuditContext): DimensionScore {
  const s = new Scorer();
  const pricingPage = ["/pricing", "/rates", "/plans"]
    .map((p) => ctx.page(p))
    .find((p) => p?.record.ok);
  const pricingLink = ctx
    .htmlPages()
    .flatMap((p) => p.parsed?.links ?? [])
    .find((l) => /\bprici?ng\b|\brates?\b|price list/i.test(l.text));

  s.check({
    label: "Pricing page exists",
    award: pricingPage ? 1 : pricingLink ? 0.5 : 0,
    points: 20,
    detail: pricingPage
      ? "A dedicated pricing page resolves."
      : pricingLink
        ? `No /pricing route, but the site links to something priced ("${pricingLink.text}").`
        : "No pricing page. An agent comparing vendors has nothing to put in the cost column.",
    source: pricingPage?.record.url,
  });

  const priceText = pricingPage?.parsed?.text ?? ctx.allText;
  const meaningful = findQuotedPrices(priceText, Boolean(pricingPage));
  s.check({
    label: "Numeric prices published",
    award: meaningful.length >= 3 ? 1 : meaningful.length >= 1 ? 0.5 : 0,
    points: 24,
    detail:
      meaningful.length >= 3
        ? `${meaningful.length} explicit figures found (${meaningful.slice(0, 4).join(", ")}).`
        : meaningful.length >= 1
          ? `Only ${meaningful.length} figure found. Not enough for an agent to model cost.`
          : "No dollar figures anywhere on the site. Cost is unknowable without a human conversation.",
    quote: meaningful[0] ? ctx.find(new RegExp(escapeRegex(meaningful[0])))?.quote : undefined,
    source: meaningful[0] ? ctx.find(new RegExp(escapeRegex(meaningful[0])))?.source : undefined,
  });

  const units = /\b(per (?:month|year|seat|user|hour|unit|project)|\/(?:mo|yr|hr|user|seat)\b|monthly|annually|starting at|from \$)/i.test(
    priceText,
  );
  s.check({
    label: "Units and tiers stated",
    award: units ? 1 : 0,
    points: 10,
    detail: units
      ? "Pricing carries units or tiers, so a figure means something."
      : "No units, tiers, or 'starting at' language. Any number present cannot be normalized against a competitor.",
  });

  const gate = GATE_PATTERN.exec(ctx.allText);
  s.check({
    label: "No pure contact-gate",
    award: gate && meaningful.length === 0 ? 0 : gate ? 0.5 : 1,
    points: 14,
    detail: gate
      ? meaningful.length === 0
        ? "Pricing is gated behind a contact request with no figures published. To an agent this reads as 'unknown', and unknown loses to a competitor who published a range."
        : "Some pricing is gated, but figures exist elsewhere."
      : "Nothing hides cost behind a contact form.",
    quote: gate ? ctx.find(GATE_PATTERN)?.quote : undefined,
    source: gate ? ctx.find(GATE_PATTERN)?.source : undefined,
  });

  const contractType = ctx.find(CONTRACT_TYPE_PATTERN);
  s.check({
    label: "Contract types stated",
    award: contractType ? 1 : 0,
    points: 16,
    detail: contractType
      ? "The site names the contract vehicles types it works under, which is how price works in this market."
      : "No mention of FFP, T&M, CPFF, or IDIQ. In GovCon these are the pricing model, and stating them is the honest substitute for a price tag.",
    quote: contractType?.quote,
    source: contractType?.source,
  });

  const rates = ctx.find(RATE_PATTERN);
  s.check({
    label: "Rate schedule discoverable",
    award: rates ? 1 : 0,
    points: 16,
    detail: rates
      ? "A rate card, labor-category schedule, or GSA price list is referenced."
      : "No labor rates or GSA price list referenced. A contracting officer's agent cannot estimate cost from this site.",
    quote: rates?.quote,
    source: rates?.source,
  });

  s.note(
    "Market note",
    "Published list pricing is rare in defense services and its absence is not a failure of nerve. What is scored here is whether cost is knowable at all: rate schedules, contract types, and vehicle ceilings are the legible substitute.",
  );

  return {
    id: "priced",
    label: "Priced",
    question: "Can an agent determine what working with this company costs?",
    score: s.score,
    weight: DIMENSION_WEIGHTS.priced,
    summary:
      meaningful.length === 0 && !rates
        ? "Cost is entirely unknowable without contacting a human."
        : meaningful.length > 0
          ? "Figures are published and can be compared."
          : "No figures, but the pricing model is at least described.",
    evidence: s.evidence,
  };
}

/* ---------------------------------------------------------------- */
/* Comparable                                                        */
/* ---------------------------------------------------------------- */

const PROGRAM_PATTERN =
  /\b(PAC-3|THAAD|GMD|IBCS|Patriot|Hellfire|JAGM|SLS|Artemis|Space Launch System|hypersonic\w*|LRHW|MDA|GPI|NGI|Sentinel|Black Hawk|Apache|Chinook|FLRAA|FTUAS|C-UAS|CJADC2|JADC2)\b/g;
const TECH_PATTERN =
  /\b(digital engineering|model[- ]based systems engineering|MBSE|hardware[- ]in[- ]the[- ]loop|HWIL|guidance navigation and control|GNC|signal processing|RF\b|electro[- ]optical|EO\/IR|machine learning|reliability engineering|systems integration|cybersecurity|DevSecOps|test and evaluation|prototyping|additive manufacturing)\b/gi;
const QUANT_PATTERN =
  /\b(\d{2,5}\+? (?:employees|engineers|professionals|people|staff)|\d{1,3}\+? years|since (?:19|20)\d{2}|\d{1,3}(?:,\d{3})* square feet|\$\d[\d.,]*\s?(?:m|b|million|billion))\b/gi;

export function scoreComparable(ctx: AuditContext, fog: FogResult): DimensionScore {
  const s = new Scorer();
  const text = ctx.allText;

  const programs = [...new Set(text.match(PROGRAM_PATTERN) ?? [])];
  s.check({
    label: "Named programs and platforms",
    award: programs.length >= 4 ? 1 : programs.length >= 1 ? programs.length / 4 : 0,
    points: 18,
    detail:
      programs.length > 0
        ? `${programs.length} named programs or platforms referenced (${programs.slice(0, 6).join(", ")}). These are the terms a buyer's agent actually searches on.`
        : "No named programs, platforms, or weapon systems. The site describes work in the abstract, which matches no specific requirement.",
    quote: programs[0] ? ctx.find(new RegExp(programs[0], "i"))?.quote : undefined,
    source: programs[0] ? ctx.find(new RegExp(programs[0], "i"))?.source : undefined,
  });

  const quants = [...new Set(text.match(QUANT_PATTERN) ?? [])];
  s.check({
    label: "Quantified claims",
    award: quants.length >= 4 ? 1 : quants.length / 4,
    points: 14,
    detail:
      quants.length > 0
        ? `${quants.length} quantified statements found (${quants.slice(0, 4).join("; ")}). Numbers are the only claims an agent can rank.`
        : "No headcount, tenure, facility size, or contract value stated anywhere. Nothing here can be ranked against a competitor.",
  });

  const tech = [...new Set((text.match(TECH_PATTERN) ?? []).map((t) => t.toLowerCase()))];
  s.check({
    label: "Specific technical disciplines",
    award: tech.length >= 5 ? 1 : tech.length / 5,
    points: 12,
    detail:
      tech.length > 0
        ? `${tech.length} specific disciplines named (${tech.slice(0, 5).join(", ")}).`
        : "Capability copy names no specific engineering discipline.",
  });

  const differentiator = ctx.find(
    /\b(unlike|whereas most|the difference is|what sets us apart|we are the only|our approach differs|rather than)\b/i,
  );
  s.check({
    label: "Explicit differentiator",
    award: differentiator ? 1 : 0,
    points: 10,
    detail: differentiator
      ? "The site states a difference in terms that can be checked."
      : "No sentence anywhere contrasts this firm with an alternative. An agent asked to compare has to invent the comparison.",
    quote: differentiator?.quote,
    source: differentiator?.source,
  });

  const comparePage = ctx
    .htmlPages()
    .find((p) => /compare|alternatives|why[- ]us|vs\b/i.test(p.record.path));
  s.check({
    label: "Comparison page",
    award: comparePage ? 1 : 0,
    points: 12,
    detail: comparePage
      ? `A comparison-style page exists at ${comparePage.record.path}.`
      : "No comparison or alternatives page. The firm has no say in how it is described next to rivals.",
    source: comparePage?.record.url,
  });

  const fit = ctx.find(
    /\b(we work (?:best )?with|ideal (?:for|client|customer)|designed for|built for|our clients are|we serve|not a fit|we do not)\b/i,
  );
  s.check({
    label: "Ideal-customer statement",
    award: fit ? 1 : 0,
    points: 8,
    detail: fit
      ? "The site says who it is for, which lets an agent screen in or out correctly."
      : "No statement of who this firm is for. Agents will include it in the wrong shortlists and exclude it from the right ones.",
    quote: fit?.quote,
    source: fit?.source,
  });

  s.check({
    label: "Capability copy is specific, not atmospheric",
    award: fog.per1k <= 3 ? 1 : fog.per1k >= 10 ? 0 : (10 - fog.per1k) / 7,
    points: 8,
    detail: `Fog density is ${fog.per1k} weighted marketing phrases per 1,000 words. Above roughly 6, capability statements stop carrying comparable information.`,
    quote: fog.worstSentence,
    source: fog.worstSource,
  });

  const naics = /\bNAICS\b/i.test(text);
  s.check({
    label: "Service taxonomy stated",
    award: naics ? 1 : 0,
    points: 8,
    detail: naics
      ? "NAICS codes appear on the site, tying services to the taxonomy buyers actually filter on."
      : "No NAICS codes. The firm's services are described only in its own words, in a market that procures by code.",
    quote: naics ? ctx.find(/NAICS/i)?.quote : undefined,
    source: naics ? ctx.find(/NAICS/i)?.source : undefined,
  });

  return {
    id: "comparable",
    label: "Comparable",
    question: "Can an agent place this firm side by side with a rival and see a difference?",
    score: s.score,
    weight: DIMENSION_WEIGHTS.comparable,
    summary:
      programs.length === 0 && quants.length === 0
        ? "Nothing specific enough to compare — no programs, no numbers."
        : differentiator
          ? "Specific claims present and a stated difference."
          : "Some specifics, but no explicit contrast with alternatives.",
    evidence: s.evidence,
  };
}

/* ---------------------------------------------------------------- */
/* Proven                                                            */
/* ---------------------------------------------------------------- */

const AGENCY_PATTERN =
  /\b(U\.?S\.? Army|Missile Defense Agency|MDA|NASA|SMDC|AMCOM|DEVCOM|PEO [A-Z][\w &]{2,30}|Air Force|Space Force|Navy|DARPA|DLA|Redstone Arsenal|Marshall Space Flight Center|Department of Defense|DoD)\b/g;
const CERT_PATTERN =
  /\b(ISO ?9001(?::\d{4})?|AS ?9100[A-Z]?|ISO ?27001|CMMI[- ]?(?:DEV|SVC)?[ /]?(?:Level|ML) ?[1-5]|CMMC(?: Level)? ?[1-3]?|ITAR[- ]registered|NIST ?SP ?800-171|FedRAMP)\b/gi;
const OUTCOME_PATTERN =
  /\b(reduced|increased|saved|improved|cut|accelerated|delivered)\b[^.]{0,60}\b(\d{1,3}(?:\.\d)?%|\$\d[\d.,]*\s?(?:k|m|million|billion)?|\d+ (?:days|weeks|months|hours))/i;

export function scoreProven(ctx: AuditContext): DimensionScore {
  const s = new Scorer();
  const text = ctx.allText;

  const agencies = [...new Set(text.match(AGENCY_PATTERN) ?? [])];
  s.check({
    label: "Named customers",
    award: agencies.length >= 3 ? 1 : agencies.length / 3,
    points: 18,
    detail:
      agencies.length > 0
        ? `${agencies.length} customer organizations named (${agencies.slice(0, 5).join(", ")}).`
        : "No customer or agency is named anywhere. 'Trusted by government customers' is not a citation.",
    quote: agencies[0] ? ctx.find(new RegExp(escapeRegex(agencies[0]), "i"))?.quote : undefined,
    source: agencies[0] ? ctx.find(new RegExp(escapeRegex(agencies[0]), "i"))?.source : undefined,
  });

  const ppPage = ctx.htmlPages().find((p) => /past-performance|experience|case-stud|portfolio|projects/i.test(p.record.path));
  const ppMention = ctx.find(/\b(past performance|contract (?:number|award)|prime contract|subcontract(?:or)? to)\b/i);
  s.check({
    label: "Past performance documented",
    award: ppPage ? 1 : ppMention ? 0.5 : 0,
    points: 16,
    detail: ppPage
      ? `Past-performance content lives at ${ppPage.record.path}.`
      : ppMention
        ? "Past performance is mentioned in passing but has no dedicated, structured home."
        : "No past-performance page and no contract citations. Nothing supports a claim of experience.",
    quote: ppMention?.quote,
    source: ppPage?.record.url ?? ppMention?.source,
  });

  const outcome = OUTCOME_PATTERN.exec(text);
  s.check({
    label: "Quantified outcomes",
    award: outcome ? 1 : 0,
    points: 12,
    detail: outcome
      ? "At least one result is stated with a number attached."
      : "No outcome is quantified. Every claim of impact is adjectival.",
    quote: outcome ? ctx.find(OUTCOME_PATTERN)?.quote : undefined,
    source: outcome ? ctx.find(OUTCOME_PATTERN)?.source : undefined,
  });

  const certs = [...new Set((text.match(CERT_PATTERN) ?? []).map((c) => c.toUpperCase().replace(/\s+/g, " ")))];
  s.check({
    label: "Certifications stated",
    award: certs.length >= 2 ? 1 : certs.length / 2,
    points: 14,
    detail:
      certs.length > 0
        ? `${certs.length} certifications named (${certs.slice(0, 4).join(", ")}).`
        : "No quality or security certifications named. Compliance filters will drop this firm before a human ever sees it.",
    quote: certs[0] ? ctx.find(new RegExp(escapeRegex(certs[0]), "i"))?.quote : undefined,
  });

  const testimonial = ctx.find(/["“][^"”]{40,240}["”]\s*[—-]\s*[A-Z]/);
  s.check({
    label: "Attributed testimonials",
    award: testimonial ? 1 : 0,
    points: 8,
    detail: testimonial
      ? "At least one quote is attributed to a named person or organization."
      : "No attributed testimonials. Unattributed praise is discarded by any model weighing evidence.",
    quote: testimonial?.quote,
    source: testimonial?.source,
  });

  const award = ctx.find(/\b(award(?:ed|s)?|recognized|named (?:one of|to)|ranked)\b[^.]{0,80}\b(?:19|20)\d{2}/i);
  s.check({
    label: "Dated recognition",
    award: award ? 1 : 0,
    points: 6,
    detail: award
      ? "Awards or recognition are stated with dates."
      : "No dated awards or recognition. Undated praise cannot be weighed for recency.",
    quote: award?.quote,
    source: award?.source,
  });

  const bios = ctx.find(/\b(chief executive|president|founder|chief technology|vice president|program manager)\b/i);
  s.check({
    label: "Named leadership",
    award: bios ? 1 : 0,
    points: 6,
    detail: bios
      ? "Leadership is named, giving the entity real people to resolve against."
      : "No named leadership. The company has no people an agent can verify.",
    quote: bios?.quote,
    source: bios?.source,
  });

  return {
    id: "proven",
    label: "Proven",
    question: "Can an agent verify that this firm has actually done the work?",
    score: s.score,
    weight: DIMENSION_WEIGHTS.proven,
    summary:
      agencies.length === 0
        ? "No named customers — experience claims are unverifiable."
        : certs.length > 0
          ? "Customers and certifications are both on the record."
          : "Customers named, but no certifications to pass a compliance filter.",
    evidence: s.evidence,
  };
}

/* ---------------------------------------------------------------- */
/* Current                                                           */
/* ---------------------------------------------------------------- */

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";

export function scoreCurrent(ctx: AuditContext): DimensionScore {
  const s = new Scorer();
  const text = ctx.allText;
  const thisYear = ctx.generated.getFullYear();

  const copyrightMatch = /(?:©|&copy;|copyright)\s*(?:\d{4}\s*[–-]\s*)?((?:19|20)\d{2})/i.exec(text);
  const copyrightYear = copyrightMatch ? Number(copyrightMatch[1]) : 0;
  s.check({
    label: "Copyright year current",
    award: copyrightYear >= thisYear ? 1 : copyrightYear === thisYear - 1 ? 0.5 : 0,
    points: 12,
    detail: copyrightYear
      ? copyrightYear >= thisYear
        ? `Footer reads ${copyrightYear}. The site looks maintained.`
        : `Footer still reads ${copyrightYear}. A stale copyright is the first thing a model uses to discount everything else on the page.`
      : "No copyright year found, so there is no cheap freshness signal at all.",
    quote: copyrightMatch?.[0],
  });

  const dateMatches = [
    ...text.matchAll(new RegExp(`\\b(?:${MONTHS})\\.?\\s+\\d{1,2},?\\s+((?:19|20)\\d{2})\\b`, "gi")),
    ...text.matchAll(/\b(20\d{2})-(?:0[1-9]|1[0-2])-(?:[0-2]\d|3[01])\b/g),
  ];
  const years = dateMatches.map((m) => Number(m[1])).filter((y) => y > 2000 && y <= thisYear + 1);
  const newest = years.length > 0 ? Math.max(...years) : 0;
  s.check({
    label: "Dated content within 12 months",
    award: newest >= thisYear ? 1 : newest === thisYear - 1 ? 0.5 : 0,
    points: 16,
    detail: newest
      ? newest >= thisYear
        ? `Most recent dated item is from ${newest}.`
        : `The newest dated item on the site is from ${newest}. Anything a model reads here it will treat as possibly obsolete.`
      : "No dated content anywhere. Nothing on this site can be placed in time.",
  });

  const newsPage = ctx.htmlPages().find((p) => /news|blog|insights|press|changelog|updates/i.test(p.record.path));
  s.check({
    label: "News, blog, or changelog",
    award: newsPage ? 1 : 0,
    points: 10,
    detail: newsPage
      ? `Updates are published at ${newsPage.record.path}.`
      : "No news, blog, or changelog. The site has no heartbeat, so re-crawls find nothing new to record.",
    source: newsPage?.record.url,
  });

  const sitemapRaw = ctx.raw("/sitemap.xml");
  const lastmods = [...sitemapRaw.matchAll(/<lastmod>([^<]+)<\/lastmod>/gi)].map((m) => m[1].slice(0, 10));
  const newestLastmod = lastmods.sort().at(-1);
  const lastmodYear = newestLastmod ? Number(newestLastmod.slice(0, 4)) : 0;
  s.check({
    label: "Sitemap lastmod fresh",
    award: lastmodYear >= thisYear ? 1 : lastmodYear === thisYear - 1 ? 0.5 : 0,
    points: 8,
    detail: newestLastmod
      ? `Newest sitemap lastmod is ${newestLastmod}.`
      : "The sitemap carries no lastmod dates, so crawlers cannot tell what changed.",
  });

  const lastModified = ctx.page("/")?.result.lastModified;
  const lmYear = lastModified ? new Date(lastModified).getFullYear() : 0;
  s.check({
    label: "Last-Modified header",
    award: lmYear >= thisYear ? 1 : lmYear > 0 ? 0.4 : 0,
    points: 4,
    detail: lastModified
      ? `Homepage reports Last-Modified: ${lastModified}.`
      : "No Last-Modified header on the homepage.",
  });

  const stale = ctx.find(/\b(lorem ipsum|coming soon|under construction|placeholder text|copyright 20(?:0\d|1[0-9]))\b/i);
  s.check({
    label: "No stale artifacts",
    award: stale ? 0 : 1,
    points: 6,
    detail: stale
      ? "Placeholder or abandoned content is still live on the site."
      : "No placeholder or abandoned content found.",
    quote: stale?.quote,
    source: stale?.source,
  });

  return {
    id: "current",
    label: "Current",
    question: "Can an agent tell whether any of this is still true?",
    score: s.score,
    weight: DIMENSION_WEIGHTS.current,
    summary:
      newest >= thisYear
        ? "Freshness signals are present and recent."
        : newest > 0
          ? `Newest dated content is from ${newest}.`
          : "Nothing on the site is dated.",
    evidence: s.evidence,
  };
}

/* ---------------------------------------------------------------- */
/* Fog, expressed as a dimension                                     */
/* ---------------------------------------------------------------- */

export function fogDimension(fog: FogResult): DimensionScore {
  const s = new Scorer();

  s.check({
    label: "Marketing-speak density",
    award: fog.score / 100,
    points: 60,
    detail: `${fog.per1k} weighted stock phrases per 1,000 words across ${fog.words.toLocaleString()} words of site copy. Under 2 reads as a company describing itself; over 8 reads as a company describing nothing.`,
    quote: fog.worstSentence,
    source: fog.worstSource,
  });

  const top = fog.hits[0];
  s.check({
    label: "No single dominant filler phrase",
    award: !top ? 1 : top.count <= 3 ? 1 : top.count >= 20 ? 0 : 1 - (top.count - 3) / 17,
    points: 20,
    detail: top
      ? `"${top.phrase}" appears ${top.count} times. A phrase repeated this often is the site's actual thesis, whether the company meant it to be or not.`
      : "No stock phrase dominates the copy.",
  });

  s.check({
    label: "Foggiest sentence is survivable",
    award: fog.worstSentence ? 0 : 1,
    points: 20,
    detail: fog.worstSentence
      ? "At least one sentence is built almost entirely from stock phrases. This is the sentence a model will summarize the company with."
      : "No sentence on the site is pure filler.",
    quote: fog.worstSentence,
    source: fog.worstSource,
  });

  return {
    id: "fog",
    label: "Fog index",
    question: "Is the copy specific enough to carry information at all?",
    score: s.score,
    weight: DIMENSION_WEIGHTS.fog,
    summary:
      fog.per1k <= 2
        ? "Copy is concrete."
        : fog.per1k <= 6
          ? "Some filler, but real content underneath."
          : "Dense marketing fog — the copy states very little.",
    evidence: s.evidence,
  };
}
