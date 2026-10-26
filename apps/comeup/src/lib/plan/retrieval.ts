/**
 * Per-section retrieval.
 *
 * Each of the five answers runs its own tag-scoped query against the archive
 * and excludes everything the earlier sections already used. That's the whole
 * argument against the vector-dump version of this product: one blob of
 * "similar text" would hand the same three items to all five sections.
 */

import { retrieve, type RetrievalHit } from "@/lib/archive/retrieve";
import type { Audience, Framework, Job, Topic } from "@/lib/archive/types";
import type { Citation, PlanInput, SectionKey } from "./types";

interface SectionQuery {
  key: SectionKey;
  label: string;
  job: Job;
  topics: Topic[];
}

export const SECTION_QUERIES: readonly SectionQuery[] = [
  { key: "wedge", label: "The wedge", job: "find-wedge", topics: ["wedge", "idea"] },
  { key: "customer", label: "The customer", job: "pick-customer", topics: ["market", "examples"] },
  { key: "offer", label: "The first offer", job: "price-offer", topics: ["pricing"] },
  {
    key: "distribution",
    label: "The first channel",
    job: "get-distribution",
    // Deliberately not "community": the first channel is about reaching people
    // who can buy, which is a different problem from building an audience.
    topics: ["distribution"],
  },
  { key: "validate", label: "Validate this week", job: "validate", topics: ["mvp", "market"] },
] as const;

const AUDIENCE_SIGNALS: ReadonlyArray<[Audience, RegExp]> = [
  ["student", /\b(student|college|university|campus|dorm|undergrad|semester|class(es)?|school)\b/i],
  ["creator", /\b(creator|content|film|photo|video|edit|music|art|design|audience|follower)\b/i],
  ["freelancer", /\b(freelance|client|gig|contract|commission|service|hourly)\b/i],
  ["agency-owner", /\b(agency|studio|team|shop|retainer|subcontract)\b/i],
  ["solo-builder", /\b(solo|alone|myself|indie|build|code|app|software|automat)\b/i],
  ["first-time-founder", /\b(founder|startup|business|company|launch|product)\b/i],
  ["career-switcher", /\b(job|resume|laid off|quit|career|switch|full.?time|9.?to.?5|internship)\b/i],
];

/** Cheap, deterministic audience inference. Used as a retrieval filter. */
export function inferAudience(input: PlanInput): Audience[] {
  const text = `${input.situation} ${input.tried ?? ""} ${input.where ?? ""}`;
  const found = AUDIENCE_SIGNALS.filter(([, pattern]) => pattern.test(text)).map(([audience]) => audience);
  return found.length > 0 ? found.slice(0, 3) : ["solo-builder"];
}

/**
 * Framework hints per section, derived from the reader's actual constraints.
 *
 * This is the axis earning its keep: with no money and no audience, the
 * distribution section should retrieve the cold-email arithmetic, not the
 * publishing doctrine. A similarity search cannot make that distinction
 * because both bodies of text are about "getting in front of people".
 */
function frameworkHints(input: PlanInput): Partial<Record<SectionKey, Framework[]>> {
  const text = `${input.situation} ${input.tried ?? ""}`.toLowerCase();

  // A follower count is not a surface. A surface is somewhere you already
  // publish on a rhythm, or a list you own. Getting this wrong is how people
  // end up being told to "post more" when they have nobody to post to.
  const owned = /\b(subscribers?|newsletter|email list|mailing list|audience of|my community|my list)\b/.test(text);
  const rhythm = /\b(post|publish|upload)(ing|ed)?\b[^.]{0,24}\b(daily|weekly|every day|every week|consistently|regularly|for (a )?(year|years|months))\b/.test(text);
  const sizeable = Array.from(text.matchAll(/(\d[\d,]*)\s*(k\b|thousand\b)?\s*(followers|subs|subscribers)/g)).some((match) => {
    const raw = Number(match[1].replace(/,/g, ""));
    return match[2] ? raw >= 2 : raw >= 2000;
  });
  const hasSurface = owned || rhythm || sizeable;

  const distribution: Framework[] = ["cold-email-math"];
  if (hasSurface) distribution.push("notes-engine", "proof-process-position");

  return {
    wedge: ["design-per-client", "constraint-as-brief"],
    customer: ["return-equation", "six-loops"],
    offer: ["retainer-stack", "ledger-transparency"],
    distribution,
    validate: ["four-questions", "return-equation", "cold-email-math"],
  };
}

export function toCitation(hit: RetrievalHit): Citation {
  return {
    id: hit.item.id,
    title: hit.item.title,
    source: hit.item.source,
    url: hit.item.url,
    derived: hit.item.derived,
    pull: hit.item.pull,
    matchedOn: hit.matchedOn,
  };
}

export interface SectionEvidence {
  key: SectionKey;
  label: string;
  job: Job;
  hits: RetrievalHit[];
}

/**
 * Run all five queries in order, threading an exclusion set so no item is cited
 * twice. Sections are refilled with a looser query if the strict one comes back
 * thin — an empty citation list would be worse than a slightly broader match.
 */
export function gatherEvidence(input: PlanInput, perSection = 3): SectionEvidence[] {
  const audience = inferAudience(input);
  const text = `${input.situation} ${input.tried ?? ""} ${input.where ?? ""}`;
  const used = new Set<string>();
  const evidence: SectionEvidence[] = [];
  const hints = frameworkHints(input);

  for (const query of SECTION_QUERIES) {
    let hits = retrieve({
      job: query.job,
      topics: query.topics,
      audience,
      frameworks: hints[query.key],
      text,
      exclude: Array.from(used),
      limit: perSection,
    });

    if (hits.length < perSection) {
      const broader = retrieve({
        job: query.job,
        text,
        exclude: [...Array.from(used), ...hits.map((hit) => hit.item.id)],
        limit: perSection - hits.length,
      });
      hits = [...hits, ...broader];
    }

    hits.forEach((hit) => used.add(hit.item.id));
    evidence.push({ key: query.key, label: query.label, job: query.job, hits });
  }

  return evidence;
}

export function evidenceCount(evidence: readonly SectionEvidence[]): number {
  return new Set(evidence.flatMap((section) => section.hits.map((hit) => hit.item.id))).size;
}
