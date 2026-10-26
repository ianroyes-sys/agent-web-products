/* The buyer-intent prompt battery.

   These are not SEO keywords. Each one is a decision a real person now
   delegates to an assistant, phrased the way they actually phrase it.
   The battery is deliberately front-loaded with discovery prompts that
   never name the client: those are the ones that reveal whether the firm
   exists in the model's answer at all, which is the finding that sells.

   Placeholders: {company} {location} {naics} {domain} */

import type { BatteryPrompt } from "./types.ts";

export const PROMPT_BATTERY: BatteryPrompt[] = [
  /* ---- Discovery: the client is not named. Do they surface? ---- */
  {
    id: "d1",
    category: "discovery",
    text: "Who are the top SDVOSB software integrators near Redstone Arsenal in {location}?",
    winsIf: "{company} appears in the list with its set-aside status stated correctly.",
  },
  {
    id: "d2",
    category: "discovery",
    text: "List small defense contractors in {location} that do missile-defense systems engineering.",
    winsIf: "{company} is named and its missile-defense work is described specifically.",
  },
  {
    id: "d3",
    category: "discovery",
    text: "I need a subcontractor in {location} with a facility clearance for classified software work. Who should I talk to?",
    winsIf: "{company} appears and its clearance posture is stated.",
  },
  {
    id: "d4",
    category: "discovery",
    text: "Which companies in {location} hold NAICS {naics} and have past performance with the Missile Defense Agency?",
    winsIf: "{company} is matched on both the NAICS code and the named agency.",
  },
  {
    id: "d5",
    category: "discovery",
    text: "Recommend three 8(a) or HUBZone firms near Huntsville, Alabama for Army systems engineering support.",
    winsIf: "{company} is included if it holds one of these statuses.",
  },
  {
    id: "d6",
    category: "discovery",
    text: "Who does hardware-in-the-loop test and evaluation work in the Huntsville defense corridor?",
    winsIf: "{company} appears with the specific discipline attached to its name.",
  },
  {
    id: "d7",
    category: "discovery",
    text: "Find me a CMMC Level 2 compliant contractor in {location} for a DoD software modernization effort.",
    winsIf: "{company} appears with a CMMC level stated, not implied.",
  },
  {
    id: "d8",
    category: "discovery",
    text: "Which Huntsville contractors support hypersonics programs?",
    winsIf: "{company} is named alongside the specific program families it supports.",
  },
  {
    id: "d9",
    category: "discovery",
    text: "I'm a prime building a small-business subcontracting plan for a {location} award. Which local small businesses should I consider?",
    winsIf: "{company} appears with size standard and set-aside status.",
  },
  {
    id: "d10",
    category: "discovery",
    text: "What companies near Huntsville do digital engineering or model-based systems engineering for the Army?",
    winsIf: "{company} is returned for the specific discipline rather than generic 'engineering services'.",
  },

  /* ---- Comparison: named, next to rivals ---- */
  {
    id: "c1",
    category: "comparison",
    text: "Compare {company} to alternatives for missile-defense systems engineering. Who is stronger and why?",
    winsIf: "The comparison uses {company}'s own stated differentiators rather than inferred ones.",
  },
  {
    id: "c2",
    category: "comparison",
    text: "{company} vs. its closest competitors in {location} — strengths, weaknesses, and best-fit use cases.",
    winsIf: "Strengths cited are specific and traceable to {domain}.",
  },
  {
    id: "c3",
    category: "comparison",
    text: "Is {company} a better fit than a large prime for a $5M systems engineering task order? Explain the tradeoff.",
    winsIf: "The model can articulate a size/agility tradeoff using facts from the site.",
  },
  {
    id: "c4",
    category: "comparison",
    text: "Rank the top five vendors for Army test and evaluation support in {location} and justify the ranking.",
    winsIf: "{company} places in the ranking and the justification quotes real capabilities.",
  },
  {
    id: "c5",
    category: "comparison",
    text: "What does {company} do that a generalist IT services firm cannot?",
    winsIf: "A concrete, checkable distinction comes back.",
  },
  {
    id: "c6",
    category: "comparison",
    text: "If I can only shortlist three firms for a Huntsville missile-defense recompete, should {company} be one of them?",
    winsIf: "The answer is a yes with a stated reason, not a hedge.",
  },

  /* ---- Qualification: hard filters ---- */
  {
    id: "q1",
    category: "qualification",
    text: "Is {company} CMMC compliant? What level, and as of when?",
    winsIf: "A level and a date come back, sourced to the company's own site.",
  },
  {
    id: "q2",
    category: "qualification",
    text: "What contract vehicles does {company} hold?",
    winsIf: "Named vehicles come back — GSA MAS, SEWP, CIO-SP, RS3, or an IDIQ.",
  },
  {
    id: "q3",
    category: "qualification",
    text: "What is {company}'s CAGE code and UEI?",
    winsIf: "Both identifiers are returned and match SAM.gov.",
  },
  {
    id: "q4",
    category: "qualification",
    text: "What NAICS codes does {company} operate under?",
    winsIf: "Specific six-digit codes are returned rather than prose descriptions.",
  },
  {
    id: "q5",
    category: "qualification",
    text: "Does {company} qualify as a small business under its primary NAICS code?",
    winsIf: "Size standard and status are both stated.",
  },
  {
    id: "q6",
    category: "qualification",
    text: "Does {company} hold a facility clearance, and at what level?",
    winsIf: "Clearance posture is answerable at all.",
  },
  {
    id: "q7",
    category: "qualification",
    text: "What quality certifications does {company} hold — ISO 9001, AS9100, CMMI?",
    winsIf: "Registration names and levels come back.",
  },
  {
    id: "q8",
    category: "qualification",
    text: "Which federal agencies has {company} actually delivered work for?",
    winsIf: "Named agencies come back, not 'various federal customers'.",
  },
  {
    id: "q9",
    category: "qualification",
    text: "Where is {company} physically located and how close is it to Redstone Arsenal?",
    winsIf: "A street address resolves and proximity can be computed.",
  },
  {
    id: "q10",
    category: "qualification",
    text: "How many employees does {company} have and how many are cleared?",
    winsIf: "Headcount is stated; cleared headcount is a bonus almost nobody publishes.",
  },

  /* ---- Risk: the questions procurement really asks ---- */
  {
    id: "r1",
    category: "risk",
    text: "What are the risks of choosing {company} as a subcontractor on a major program?",
    winsIf: "Risks cited are real and addressable, not artifacts of missing information.",
  },
  {
    id: "r2",
    category: "risk",
    text: "Has {company} had any contract performance issues, protests, or terminations?",
    winsIf: "The answer is grounded in the record rather than speculation.",
  },
  {
    id: "r3",
    category: "risk",
    text: "Is {company} financially stable enough to carry a multi-year cost-plus contract?",
    winsIf: "The model can point at tenure, contract history, or bonding rather than guessing.",
  },
  {
    id: "r4",
    category: "risk",
    text: "What is {company}'s cybersecurity posture for handling CUI?",
    winsIf: "NIST SP 800-171, DFARS 7012, or an SPRS score is cited.",
  },
  {
    id: "r5",
    category: "risk",
    text: "Is any information about {company} out of date or contradictory across sources?",
    winsIf: "No contradictions surface between the site, SAM, and USAspending.",
  },
  {
    id: "r6",
    category: "risk",
    text: "What would make you hesitate to recommend {company}?",
    winsIf: "Hesitation is about fit, not about the absence of basic facts.",
  },

  /* ---- Commercial: money and next steps ---- */
  {
    id: "m1",
    category: "commercial",
    text: "What does it cost to work with {company}? Give me a range.",
    winsIf: "Any defensible range or rate structure can be produced.",
  },
  {
    id: "m2",
    category: "commercial",
    text: "Does {company} publish labor rates or a GSA price list?",
    winsIf: "A rate schedule is discoverable.",
  },
  {
    id: "m3",
    category: "commercial",
    text: "What contract types does {company} work under — FFP, T&M, cost-plus?",
    winsIf: "Contract types are stated on the site.",
  },
  {
    id: "m4",
    category: "commercial",
    text: "How do I start a teaming conversation with {company} this week? Who do I contact?",
    winsIf: "A named role or route in is returned, not a generic contact form.",
  },
  {
    id: "m5",
    category: "commercial",
    text: "Write a short justification I can paste into a source-selection memo for choosing {company}.",
    winsIf: "The memo writes itself from published facts, with nothing invented.",
  },
];

export interface PromptVars {
  company: string;
  location: string;
  naics: string;
  domain: string;
}

export function renderPrompt(prompt: BatteryPrompt, vars: PromptVars): string {
  return fill(prompt.text, vars);
}

export function renderWinsIf(prompt: BatteryPrompt, vars: PromptVars): string {
  return fill(prompt.winsIf, vars);
}

function fill(template: string, vars: PromptVars): string {
  return template
    .replaceAll("{company}", vars.company)
    .replaceAll("{location}", vars.location)
    .replaceAll("{naics}", vars.naics)
    .replaceAll("{domain}", vars.domain);
}

export const BATTERY_SIZE = PROMPT_BATTERY.length;
