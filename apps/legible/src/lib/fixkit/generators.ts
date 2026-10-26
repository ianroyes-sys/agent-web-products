/* Artifact generators. Each one produces a file a client can ship today. */

import { FILL, list, value, type Artifact, type FirmProfile } from "./types.ts";

/* ---------------------------------------------------------------- */
/* llms.txt                                                          */
/* ---------------------------------------------------------------- */

export function generateLlmsTxt(p: FirmProfile): Artifact {
  const services = p.services.length
    ? p.services.map((s) => `- **${s.name}** — ${s.description}`).join("\n")
    : `- ${FILL("service line — name it the way a buyer would search for it")}`;

  const content = `# ${p.company}

> ${p.summary}

${p.company} is headquartered in ${p.location}${p.address ? ` at ${p.address}` : ""}. This file is written for
machines. It states the facts an agent needs to qualify, compare, and
recommend this company, in one place, without inference.

## Entity

- Legal name: ${value(p.company, "legal entity name as registered in SAM")}
- Website: ${p.siteUrl}
- CAGE code: ${value(p.cage, "5-character CAGE code")}
- UEI: ${value(p.uei, "12-character SAM Unique Entity ID")}
- NAICS: ${list(p.naics, "primary and secondary NAICS codes")}
- Business status: ${value(p.setAside, "8(a) / SDVOSB / WOSB / HUBZone / other than small")}
- Location: ${p.location}

## What we do

${services}

## Why us

${
  p.differentiators.length
    ? p.differentiators.map((d) => `- ${d}`).join("\n")
    : `- ${FILL("one difference a competitor could not truthfully claim")}`
}

## Qualifications

- Certifications: ${list(p.certifications, "ISO 9001 / AS9100 / CMMI / CMMC with level and date")}
- Contract vehicles: ${list(p.vehicles, "GSA MAS / SEWP / CIO-SP / IDIQ, with contract numbers")}
- Facility clearance: ${value(p.clearance, "FCL level, or state that none is held")}
- Contract types: ${list(p.contractTypes, "FFP / T&M / CPFF / IDIQ")}

## Past performance

${
  p.agencies.length
    ? p.agencies.map((a) => `- ${a} — ${FILL("scope, period of performance, prime or sub, outcome")}`).join("\n")
    : `- ${FILL("customer agency — scope, period of performance, prime or sub, outcome")}`
}

## Contact

- ${value(p.contact.name, "name")} — ${value(p.contact.role, "role, e.g. Director of Business Development")}
- Email: ${value(p.contact.email, "teaming inquiry address")}
- Phone: ${value(p.contact.phone, "direct line")}

## Canonical pages

- ${p.siteUrl}
- ${p.siteUrl.replace(/\/$/, "")}/capabilities
- ${p.siteUrl.replace(/\/$/, "")}/past-performance
- ${p.siteUrl.replace(/\/$/, "")}/pricing
- ${p.siteUrl.replace(/\/$/, "")}/faq

## Notes for agents

- Facts on this page are maintained by ${p.company} and updated on change.
- Last updated: ${new Date().toISOString().slice(0, 10)}
- Corrections: ${value(p.contact.email, "email address for factual corrections")}
`;

  return {
    id: "llms-txt",
    name: "llms.txt",
    filename: "llms.txt",
    language: "markdown",
    description: "Serve at the domain root. The single highest-leverage file in this kit.",
    fixes: "Discoverable — no machine-first summary on the domain",
    content,
  };
}

/* ---------------------------------------------------------------- */
/* JSON-LD                                                           */
/* ---------------------------------------------------------------- */

export function generateOrganizationSchema(p: FirmProfile): Artifact {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: p.company,
    url: p.siteUrl,
    description: p.summary,
    address: {
      "@type": "PostalAddress",
      streetAddress: p.address ?? FILL("street address"),
      addressLocality: p.location.split(",")[0]?.trim() ?? FILL("city"),
      addressRegion: p.location.split(",")[1]?.trim() ?? FILL("state"),
      addressCountry: "US",
    },
    identifier: [
      { "@type": "PropertyValue", propertyID: "CAGE", value: p.cage ?? FILL("CAGE code") },
      { "@type": "PropertyValue", propertyID: "UEI", value: p.uei ?? FILL("UEI") },
    ],
    naics: p.naics.length > 0 ? p.naics : [FILL("primary NAICS code")],
    knowsAbout: p.services.map((s) => s.name),
    hasCredential: p.certifications.map((c) => ({
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "certification",
      name: c,
    })),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "teaming and subcontracting",
        email: p.contact.email ?? FILL("teaming email"),
        telephone: p.contact.phone ?? FILL("phone"),
      },
    ],
    sameAs: [
      FILL("https://www.linkedin.com/company/…"),
      FILL("https://sam.gov entity registration URL"),
    ],
  };

  return {
    id: "schema-organization",
    name: "Organization schema",
    filename: "organization.jsonld",
    language: "json",
    description: "Drop into a <script type=\"application/ld+json\"> in the site <head>, on every page.",
    fixes: "Parseable — the company is not declared as an entity",
    content: JSON.stringify(schema, null, 2),
  };
}

export function generateServiceSchema(p: FirmProfile): Artifact {
  const services = p.services.length > 0 ? p.services : [{ name: FILL("service name"), description: FILL("what it is") }];
  const schema = {
    "@context": "https://schema.org",
    "@graph": services.map((service) => ({
      "@type": "Service",
      name: service.name,
      description: service.description,
      provider: { "@type": "Organization", name: p.company, url: p.siteUrl },
      areaServed: { "@type": "Place", name: p.location },
      audience: { "@type": "Audience", audienceType: "Federal government, defense primes" },
      serviceType: service.name,
      additionalProperty: [
        { "@type": "PropertyValue", name: "NAICS", value: p.naics[0] ?? FILL("NAICS code") },
        { "@type": "PropertyValue", name: "Contract types", value: p.contractTypes.join(", ") || FILL("FFP / T&M / CPFF") },
      ],
    })),
  };

  return {
    id: "schema-service",
    name: "Service schema",
    filename: "services.jsonld",
    language: "json",
    description: "One Service node per capability, so a requirement can be matched field by field.",
    fixes: "Parseable — services exist only as prose",
    content: JSON.stringify(schema, null, 2),
  };
}

export function generateFaqSchema(p: FirmProfile): Artifact {
  const faqs = p.faqs.length > 0 ? p.faqs : defaultFaqs(p);
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return {
    id: "schema-faq",
    name: "FAQPage schema",
    filename: "faq.jsonld",
    language: "json",
    description: "Pairs with the FAQ page. This is the format answer engines quote most directly.",
    fixes: "Parseable — buyer questions are answered nowhere a machine can read",
    content: JSON.stringify(schema, null, 2),
  };
}

/* ---------------------------------------------------------------- */
/* Page templates                                                    */
/* ---------------------------------------------------------------- */

export function generatePricingPage(p: FirmProfile): Artifact {
  const content = `# How ${p.company} prices work

<!--
  Rule for this page: an agent must leave it able to put a number, a range,
  or a rate structure in a comparison table. "Contact us" is not an answer,
  it is a redirect, and a model records it as unknown.
-->

## Contract types we work under

${
  p.contractTypes.length > 0
    ? p.contractTypes.map((t) => `- **${t}**`).join("\n")
    : `- **Firm Fixed Price (FFP)** — ${FILL("when you use it")}
- **Time & Materials (T&M)** — ${FILL("when you use it")}
- **Cost Plus Fixed Fee (CPFF)** — ${FILL("when you use it")}`
}

## Typical engagement sizes

| Engagement | Typical range | Duration | Contract type |
| --- | --- | --- | --- |
| ${FILL("e.g. Systems engineering task order")} | ${FILL("$250K–$1.5M")} | ${FILL("12 months")} | ${FILL("T&M")} |
| ${FILL("e.g. Prototype development")} | ${FILL("$1.5M–$6M")} | ${FILL("18–24 months")} | ${FILL("FFP")} |
| ${FILL("e.g. Sustainment support")} | ${FILL("$400K/yr")} | ${FILL("Base + 4 options")} | ${FILL("IDIQ task")} |

## Labor rate structure

${
  p.vehicles.some((v) => /GSA/i.test(v))
    ? `Our GSA rates are public. See ${FILL("GSA Advantage price list URL")}.`
    : `${FILL("Link the published rate schedule, or state the labor categories and the range for each.")}`
}

| Labor category | Rate basis |
| --- | --- |
| ${FILL("Senior Systems Engineer")} | ${FILL("$/hr or 'GSA schedule rate'")} |
| ${FILL("Software Engineer III")} | ${FILL("$/hr")} |

## Vehicles you can buy through

${p.vehicles.length > 0 ? p.vehicles.map((v) => `- ${v}`).join("\n") : `- ${FILL("vehicle name and contract number")}`}

## What we do not do

${FILL("Name the work you decline. Screening yourself out of the wrong deals raises the quality of the right ones, and agents obey exclusion criteria literally.")}

---

Questions on scope or price: ${value(p.contact.email, "teaming email")}
`;

  return {
    id: "pricing-page",
    name: "Pricing page",
    filename: "pricing.md",
    language: "markdown",
    description: "A pricing page that survives contact with an agent. Publish as HTML with the tables intact.",
    fixes: "Priced — cost is unknowable without a human",
    content,
  };
}

export function generateComparisonPage(p: FirmProfile): Artifact {
  const content = `# ${p.company} compared to the alternatives

<!--
  Honesty is the mechanism here, not the ethics. A comparison page that
  claims to win every row is discarded by both humans and models. A page
  that concedes two rows is quoted.
-->

## Who we are the right answer for

${
  p.differentiators.length > 0
    ? p.differentiators.map((d) => `- ${d}`).join("\n")
    : `- ${FILL("the specific situation where you are clearly the best choice")}`
}

## Who we are the wrong answer for

- ${FILL("the situation where a large prime is genuinely better — say so")}
- ${FILL("the situation where a niche specialist is genuinely better — say so")}

## Side by side

| | ${p.company} | ${FILL("Large prime")} | ${FILL("Niche specialist")} |
| --- | --- | --- | --- |
| Typical award size | ${FILL("range")} | ${FILL("range")} | ${FILL("range")} |
| Set-aside status | ${value(p.setAside, "status")} | Other than small | ${FILL("status")} |
| Contract vehicles | ${list(p.vehicles, "vehicles")} | ${FILL("vehicles")} | ${FILL("vehicles")} |
| Clearance | ${value(p.clearance, "FCL level")} | ${FILL("level")} | ${FILL("level")} |
| Time to start | ${FILL("weeks")} | ${FILL("weeks")} | ${FILL("weeks")} |
| Where we lose | ${FILL("be specific — this row is why the page is believed")} | — | — |

## How to verify any of this

- SAM.gov entity: ${value(p.uei, "UEI")}
- CAGE: ${value(p.cage, "CAGE code")}
- Past performance: ${p.siteUrl.replace(/\/$/, "")}/past-performance
`;

  return {
    id: "comparison-page",
    name: "Comparison page",
    filename: "comparison.md",
    language: "markdown",
    description: "Write it yourself, or a model will infer it — usually in the incumbent's favor.",
    fixes: "Comparable — nothing on the site contrasts the firm with an alternative",
    content,
  };
}

export function generateFaqPage(p: FirmProfile): Artifact {
  const faqs = p.faqs.length > 0 ? p.faqs : defaultFaqs(p);
  const content = `# Frequently asked questions

<!-- Pair this page with faq.jsonld so the same answers exist in markup. -->

${faqs.map((faq) => `## ${faq.question}\n\n${faq.answer}\n`).join("\n")}`;

  return {
    id: "faq-page",
    name: "Structured FAQ",
    filename: "faq.md",
    language: "markdown",
    description: "The buyer questions already arriving by email, answered where a machine can read them.",
    fixes: "Parseable / Comparable — qualification questions are unanswerable",
    content,
  };
}

export function generateChangelog(p: FirmProfile): Artifact {
  const today = new Date().toISOString().slice(0, 10);
  const content = `# ${p.company} changelog

<!--
  Twelve entries a year is enough. The purpose is not traffic; it is to give
  every re-crawl a dated, factual delta to record. A site with no heartbeat
  is treated as possibly obsolete no matter how current it actually is.
-->

## ${today}

- ${FILL("contract award, certification, capability addition, or key hire")}

## ${FILL("YYYY-MM-DD")}

- ${FILL("what changed")}

---

Entry types worth publishing:

- Contract awards and task orders (within release constraints)
- New or renewed certifications, with level and date
- Contract vehicle additions
- Facility, lab, or clearance changes
- Leadership and key technical hires
- New capability areas
`;

  return {
    id: "changelog",
    name: "Changelog scaffold",
    filename: "changelog.md",
    language: "markdown",
    description: "A dated heartbeat. Publish at /changelog and link it from the footer.",
    fixes: "Current — nothing on the site is dated",
    content,
  };
}

export function generateCapabilityStatement(p: FirmProfile): Artifact {
  const content = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Capability Statement — ${p.company}</title>
  <meta name="description" content="${p.summary}" />
</head>
<body>
  <main>
    <h1>${p.company} — Capability Statement</h1>
    <p>${p.summary}</p>

    <h2>Company data</h2>
    <table>
      <tbody>
        <tr><th scope="row">CAGE</th><td>${value(p.cage, "CAGE code")}</td></tr>
        <tr><th scope="row">UEI</th><td>${value(p.uei, "UEI")}</td></tr>
        <tr><th scope="row">NAICS</th><td>${list(p.naics, "NAICS codes")}</td></tr>
        <tr><th scope="row">Business status</th><td>${value(p.setAside, "set-aside status")}</td></tr>
        <tr><th scope="row">Certifications</th><td>${list(p.certifications, "certifications")}</td></tr>
        <tr><th scope="row">Vehicles</th><td>${list(p.vehicles, "contract vehicles")}</td></tr>
        <tr><th scope="row">Facility clearance</th><td>${value(p.clearance, "FCL level")}</td></tr>
        <tr><th scope="row">Location</th><td>${value(p.address, "street address")}, ${p.location}</td></tr>
      </tbody>
    </table>

    <h2>Core competencies</h2>
    <ul>
${(p.services.length > 0 ? p.services : [{ name: FILL("capability"), description: FILL("what it means in practice") }])
  .map((s) => `      <li><strong>${s.name}</strong> — ${s.description}</li>`)
  .join("\n")}
    </ul>

    <h2>Past performance</h2>
    <ul>
${(p.agencies.length > 0 ? p.agencies : [FILL("customer agency")])
  .map((a) => `      <li>${a} — ${FILL("scope, period, role, outcome")}</li>`)
  .join("\n")}
    </ul>

    <h2>Contact</h2>
    <address>
      ${value(p.contact.name, "name")}, ${value(p.contact.role, "role")}<br />
      <a href="mailto:${p.contact.email ?? "email@example.com"}">${value(p.contact.email, "email")}</a><br />
      ${value(p.contact.phone, "phone")}
    </address>
  </main>
</body>
</html>
`;

  return {
    id: "capability-statement",
    name: "Capability statement (HTML)",
    filename: "capability-statement.html",
    language: "html",
    description: "The same content as the PDF, in a form a retrieval pipeline can actually read. Keep the PDF too.",
    fixes: "Parseable — the capability statement is locked in a PDF",
    content,
  };
}

/* ---------------------------------------------------------------- */
/* robots.txt                                                        */
/* ---------------------------------------------------------------- */

export function generateRobotsTxt(p: FirmProfile): Artifact {
  const content = `# robots.txt — ${p.domain}
# Every AI agent is named on purpose. An unnamed agent's access depends on
# whatever default the CDN ships this quarter, which is not a policy.

User-agent: *
Allow: /

# Answer engines. Allowing these is how the company appears inside answers.
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

# Training-only crawlers. Decide these separately from the answer engines
# above — allowing an answer engine is a distribution decision, allowing a
# training crawler is a licensing one.
User-agent: CCBot
Allow: /

User-agent: Bytespider
Disallow: /

# If Cloudflare or another CDN injects Content-Signal directives, set them
# deliberately. ai-input=no tells assistants they may not ground an answer
# in this site, which is almost never what a company selling services wants.
# Content-Signal: search=yes, ai-input=yes, ai-train=${FILL("yes or no — a licensing decision")}

Sitemap: ${p.siteUrl.replace(/\/$/, "")}/sitemap.xml
`;

  return {
    id: "robots-txt",
    name: "robots.txt",
    filename: "robots.txt",
    language: "text",
    description: "Replaces the inherited default with a stated policy, agent by agent.",
    fixes: "Discoverable — AI crawler policy is undefined or inherited",
    content,
  };
}

/* ---------------------------------------------------------------- */
/* MCP server scaffold                                               */
/* ---------------------------------------------------------------- */

export function generateMcpDescriptor(p: FirmProfile): Artifact {
  const base = p.siteUrl.replace(/\/$/, "");
  const descriptor = {
    name: p.company,
    description: p.summary,
    version: "1.0.0",
    contact: p.contact.email ?? FILL("teaming email"),
    endpoints: { mcp: `${base}/api/mcp` },
    tools: [
      { name: "get_company_profile", description: `Identity, NAICS, CAGE, UEI, status, and certifications for ${p.company}.` },
      { name: "list_capabilities", description: "Service lines with descriptions, NAICS mapping, and relevant past performance." },
      { name: "check_qualification", description: "Given a requirement, return whether this firm meets it and what evidence supports the answer." },
      { name: "open_teaming_inquiry", description: "Submit a teaming or subcontracting inquiry and receive a tracking reference." },
    ],
  };

  return {
    id: "mcp-descriptor",
    name: "MCP descriptor",
    filename: ".well-known/mcp.json",
    language: "json",
    description: "Served at /.well-known/mcp.json. How an agent discovers that this company is callable.",
    fixes: "Discoverable — agents can read the company but cannot transact with it",
    content: JSON.stringify(descriptor, null, 2),
  };
}

export function generateMcpServer(p: FirmProfile): Artifact {
  const content = `/* Minimal MCP server for ${p.company}.
 *
 * Four tools, no dependencies beyond the MCP SDK. The point is not to build
 * a platform — it is that an agent evaluating vendors can query this company
 * directly instead of scraping a marketing site and guessing.
 *
 *   npm i @modelcontextprotocol/sdk
 *   node mcp/server.mjs
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const PROFILE = {
  company: ${JSON.stringify(p.company)},
  summary: ${JSON.stringify(p.summary)},
  location: ${JSON.stringify(p.location)},
  cage: ${JSON.stringify(p.cage ?? FILL("CAGE code"))},
  uei: ${JSON.stringify(p.uei ?? FILL("UEI"))},
  naics: ${JSON.stringify(p.naics.length > 0 ? p.naics : [FILL("NAICS code")])},
  setAside: ${JSON.stringify(p.setAside ?? FILL("set-aside status"))},
  certifications: ${JSON.stringify(p.certifications)},
  vehicles: ${JSON.stringify(p.vehicles)},
  clearance: ${JSON.stringify(p.clearance ?? FILL("FCL level"))},
  agencies: ${JSON.stringify(p.agencies)},
  services: ${JSON.stringify(p.services, null, 2).replace(/\n/g, "\n  ")},
  contact: ${JSON.stringify(p.contact)},
};

const TOOLS = [
  {
    name: "get_company_profile",
    description: "Identity, codes, status, and certifications.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_capabilities",
    description: "Service lines with descriptions.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "check_qualification",
    description: "Does this firm meet a stated requirement?",
    inputSchema: {
      type: "object",
      properties: { requirement: { type: "string", description: "e.g. 'CMMC Level 2', 'SDVOSB', 'NAICS 541330'" } },
      required: ["requirement"],
    },
  },
  {
    name: "open_teaming_inquiry",
    description: "Submit a teaming or subcontracting inquiry.",
    inputSchema: {
      type: "object",
      properties: {
        organization: { type: "string" },
        opportunity: { type: "string" },
        contact_email: { type: "string" },
      },
      required: ["organization", "contact_email"],
    },
  },
];

function checkQualification(requirement) {
  const needle = String(requirement).toLowerCase();
  const haystack = [
    PROFILE.setAside,
    PROFILE.clearance,
    ...PROFILE.naics,
    ...PROFILE.certifications,
    ...PROFILE.vehicles,
    ...PROFILE.services.map((s) => s.name + " " + s.description),
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());

  const evidence = haystack.filter((entry) => entry.includes(needle) || needle.includes(entry));
  return {
    requirement,
    meets: evidence.length > 0,
    evidence,
    note: evidence.length > 0
      ? "Matched against published company facts."
      : "No published fact supports this requirement. Absence here means absence of a claim, not absence of the capability.",
  };
}

const server = new Server({ name: ${JSON.stringify(p.domain)}, version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler({ method: "tools/list" }, async () => ({ tools: TOOLS }));

server.setRequestHandler({ method: "tools/call" }, async (request) => {
  const { name, arguments: args = {} } = request.params;
  let payload;

  switch (name) {
    case "get_company_profile":
      payload = PROFILE;
      break;
    case "list_capabilities":
      payload = { services: PROFILE.services, naics: PROFILE.naics };
      break;
    case "check_qualification":
      payload = checkQualification(args.requirement);
      break;
    case "open_teaming_inquiry":
      // Wire this to a real inbox or CRM before shipping.
      payload = {
        received: true,
        reference: "TI-" + Date.now().toString(36).toUpperCase(),
        route_to: PROFILE.contact.email,
      };
      break;
    default:
      throw new Error("Unknown tool: " + name);
  }

  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
});

await server.connect(new StdioServerTransport());
`;

  return {
    id: "mcp-server",
    name: "MCP server scaffold",
    filename: "mcp/server.mjs",
    language: "javascript",
    description: "Four tools that let an agent qualify the firm and open a teaming inquiry without a human.",
    fixes: "Discoverable — the company is readable but not callable",
    content,
  };
}

/* ---------------------------------------------------------------- */

function defaultFaqs(p: FirmProfile) {
  return [
    {
      question: `What does ${p.company} actually do?`,
      answer: p.summary,
    },
    {
      question: `Is ${p.company} a small business, and does it hold a set-aside status?`,
      answer: `${p.company} is ${p.setAside ?? FILL("state the status: 8(a), SDVOSB, WOSB, HUBZone, small business, or other than small")}. Verify at SAM.gov under UEI ${p.uei ?? FILL("UEI")}.`,
    },
    {
      question: `What NAICS codes does ${p.company} work under?`,
      answer: `Primary and secondary NAICS: ${list(p.naics, "codes")}.`,
    },
    {
      question: `Is ${p.company} CMMC compliant?`,
      answer: FILL("State the level, the assessment date, and the SPRS score if you have one. If certification is in progress, say so and give the target date."),
    },
    {
      question: `What contract vehicles can ${p.company} be reached through?`,
      answer: p.vehicles.length > 0 ? `${p.vehicles.join(", ")}.` : FILL("vehicle names with contract numbers"),
    },
    {
      question: `Does ${p.company} hold a facility clearance?`,
      answer: p.clearance ?? FILL("State the FCL level, or state plainly that no facility clearance is held. Both answers are useful; silence is not."),
    },
    {
      question: `How much does a typical engagement with ${p.company} cost?`,
      answer: FILL("A range and the contract types you work under. Even a wide range beats no answer."),
    },
    {
      question: `How do I start a teaming conversation?`,
      answer: `Contact ${value(p.contact.name, "name")}, ${value(p.contact.role, "role")}, at ${value(p.contact.email, "email")}.`,
    },
  ];
}
