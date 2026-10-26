/**
 * Plan composition.
 *
 * The deterministic plan is always built first and is always the floor. When
 * ANTHROPIC_API_KEY is present, the model rewrites the prose grounded strictly
 * in the retrieved archive excerpts, and anything it returns that fails
 * validation falls back to the deterministic version field by field. There is
 * no path where a missing key, a bad response, or a timeout produces an error
 * page instead of a plan.
 */

import { getItem } from "@/lib/archive/ingest";
import { composeTemplatePlan } from "./deterministic";
import { gatherEvidence, inferAudience, toCitation, type SectionEvidence } from "./retrieval";
import type { Citation, Plan, PlanInput, PlanSection, WeekPlan } from "./types";

const MODEL = "claude-sonnet-5";
const TIMEOUT_MS = 55_000;

export function validateInput(raw: unknown): { ok: true; input: PlanInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Expected a JSON object." };
  const value = raw as Record<string, unknown>;
  const situation = typeof value.situation === "string" ? value.situation.trim() : "";
  if (situation.length < 20) {
    return { ok: false, error: "Tell me a bit more — at least a sentence about what you can do and what you've got." };
  }
  if (situation.length > 4000) {
    return { ok: false, error: "That's longer than this needs. Trim it to the essentials, under 4,000 characters." };
  }
  const hours = Number(value.hoursPerWeek);
  const budget = Number(value.budget);
  return {
    ok: true,
    input: {
      situation,
      tried: typeof value.tried === "string" ? value.tried.trim().slice(0, 2000) : undefined,
      where: typeof value.where === "string" ? value.where.trim().slice(0, 120) : undefined,
      hoursPerWeek: Number.isFinite(hours) ? Math.min(80, Math.max(1, Math.round(hours))) : 10,
      budget: Number.isFinite(budget) ? Math.min(100000, Math.max(0, Math.round(budget))) : 0,
    },
  };
}

export function hasModelKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function excerptFor(evidence: readonly SectionEvidence[]): string {
  const lines: string[] = [];
  for (const section of evidence) {
    lines.push(`## Retrieved for "${section.label}" (archive job: ${section.job})`);
    for (const hit of section.hits) {
      lines.push(
        [
          `<item id="${hit.item.id}" source="${hit.item.source}"${hit.item.derived ? ' distilled="true"' : ""}>`,
          `TITLE: ${hit.item.title}`,
          hit.item.pull ? `PULL: ${hit.item.pull}` : "",
          `TAGS: ${hit.matchedOn.join(", ")}`,
          `TEXT: ${hit.item.body.slice(0, 2200)}`,
          `</item>`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }
  return lines.join("\n\n");
}

const SYSTEM = `You write one specific deliverable: a first-30-days plan for someone who has a skill and no plan, grounded entirely in one expert's archive.

The expert is Ian Royes — 21, in college, roughly 30 shipped iOS apps, an agency, a newsletter, and a first invoice of $1,500 plus $100/month. His archive is supplied to you as retrieved items. You are not him and you never speak as him; you write the plan and you attribute the thinking to the archive.

Hard rules:
- Ground every claim in the supplied items. If the archive does not support a number, do not state a number. Never invent revenue, reply rates, prices, or results.
- Cite by item id. Only cite ids that appear in the supplied items.
- Outcome-based, never conversational. No "you might consider". Say what to do.
- Short sentences. Plain nouns. No em-dash pile-ups, no emoji, no exclamation points, no "in today's landscape", no "leverage", "solutions", "empower", "unlock".
- Story beats advice: where the archive has a concrete case, use it by name rather than describing it abstractly.
- Be honest about weak spots in the reader's situation. A plan that flatters is useless.
- Second person, addressed to the reader.

Return JSON only, no prose around it, in exactly this shape:
{"readback":string,"headline":string,"sections":[{"key":"wedge"|"customer"|"offer"|"distribution"|"validate","verdict":string,"body":[string,...],"citeIds":[string,...]}],"price":{"amount":number,"unit":string,"recurring":{"amount":number,"unit":string,"what":string}|null,"rationale":string},"thirtyDays":[{"week":number,"focus":string,"moves":[string,...]}],"killCriteria":[string,...]}

Constraints on the shape: exactly five sections in the order wedge, customer, offer, distribution, validate. Each verdict is one sentence and states the answer. Each body is 3 to 5 paragraphs, each paragraph 1 to 4 sentences. price.amount is a real number in dollars. Exactly four weeks. Two to four killCriteria.`;

interface ModelSection {
  key?: string;
  verdict?: string;
  body?: unknown;
  citeIds?: unknown;
}

interface ModelPlan {
  readback?: string;
  headline?: string;
  sections?: ModelSection[];
  price?: { amount?: number; unit?: string; recurring?: { amount?: number; unit?: string; what?: string } | null; rationale?: string };
  thirtyDays?: Array<{ week?: number; focus?: string; moves?: unknown }>;
  killCriteria?: unknown;
}

function extractJson(text: string): ModelPlan | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as ModelPlan;
  } catch {
    return null;
  }
}

function stringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, max);
}

async function callModel(input: PlanInput, evidence: readonly SectionEvidence[]): Promise<ModelPlan | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const user = [
    "READER SITUATION",
    input.situation,
    input.where ? `\nWHERE: ${input.where}` : "",
    input.tried ? `\nALREADY TRIED: ${input.tried}` : "",
    `\nTIME AVAILABLE: ${input.hoursPerWeek} hours per week`,
    `MONEY AVAILABLE UP FRONT: $${input.budget}`,
    "",
    "ARCHIVE ITEMS RETRIEVED FOR EACH SECTION (tag-first retrieval, not similarity search):",
    excerptFor(evidence),
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 5000,
      temperature: 0.6,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic ${response.status}`);
  const data = (await response.json()) as { content?: Array<{ text?: string }> };
  const text = (data.content ?? []).map((block) => block.text ?? "").join("");
  return extractJson(text);
}

/** Model-chosen citations, restricted to ids that were actually retrieved. */
function citationsFor(section: PlanSection, modelSection: ModelSection | undefined, evidence: readonly SectionEvidence[]): Citation[] {
  const ids = stringArray(modelSection?.citeIds, 6);
  if (ids.length === 0) return section.citations;

  const retrieved = new Map<string, Citation>();
  for (const group of evidence) {
    for (const hit of group.hits) retrieved.set(hit.item.id, toCitation(hit));
  }

  const picked: Citation[] = [];
  for (const id of ids) {
    const fromRetrieval = retrieved.get(id);
    if (fromRetrieval) {
      picked.push(fromRetrieval);
      continue;
    }
    // The model named something real but outside its own section's slice.
    const item = getItem(id);
    if (item) {
      picked.push({
        id: item.id,
        title: item.title,
        source: item.source,
        url: item.url,
        derived: item.derived,
        pull: item.pull,
        matchedOn: ["cited-by-composer"],
      });
    }
  }
  return picked.length > 0 ? picked : section.citations;
}

function mergeModelPlan(base: Plan, model: ModelPlan, evidence: readonly SectionEvidence[]): Plan {
  const bySectionKey = new Map((model.sections ?? []).map((section) => [section.key, section]));

  const sections: PlanSection[] = base.sections.map((section) => {
    const fromModel = bySectionKey.get(section.key);
    const body = stringArray(fromModel?.body, 6);
    const verdict = typeof fromModel?.verdict === "string" ? fromModel.verdict.trim() : "";
    if (body.length < 2 || verdict.length < 8) return section;
    return {
      ...section,
      verdict,
      body,
      citations: citationsFor(section, fromModel, evidence),
    };
  });

  const weeks = (model.thirtyDays ?? [])
    .map((week, index): WeekPlan => ({
      week: Number.isFinite(week.week) ? Number(week.week) : index + 1,
      focus: typeof week.focus === "string" ? week.focus.trim() : "",
      moves: stringArray(week.moves, 5),
    }))
    .filter((week) => week.focus.length > 0 && week.moves.length > 0);

  const amount = Number(model.price?.amount);
  const price =
    Number.isFinite(amount) && amount > 0
      ? {
          ...base.price,
          amount: Math.round(amount),
          unit: typeof model.price?.unit === "string" && model.price.unit ? model.price.unit : base.price.unit,
          rationale:
            typeof model.price?.rationale === "string" && model.price.rationale.length > 20
              ? model.price.rationale
              : base.price.rationale,
          recurring:
            model.price?.recurring && Number.isFinite(Number(model.price.recurring.amount))
              ? {
                  amount: Math.round(Number(model.price.recurring.amount)),
                  unit: model.price.recurring.unit ?? "per month",
                  what: model.price.recurring.what ?? "keeping it running",
                }
              : base.price.recurring,
        }
      : base.price;

  const kill = stringArray(model.killCriteria, 4);
  const headline = typeof model.headline === "string" ? model.headline.trim() : "";
  const readback = typeof model.readback === "string" ? model.readback.trim() : "";

  return {
    ...base,
    mode: "composed",
    headline: headline.length > 8 ? headline : base.headline,
    readback: readback.length > 8 ? readback : base.readback,
    sections,
    price,
    thirtyDays: weeks.length === 4 ? weeks : base.thirtyDays,
    killCriteria: kill.length >= 2 ? kill : base.killCriteria,
  };
}

export interface ComposeResult {
  plan: Plan;
  evidence: SectionEvidence[];
}

/**
 * Step one: classify, retrieve, and build the deterministic plan. Synchronous
 * and fast, so the streaming route can report retrieval as a real completed
 * stage rather than as a spinner label.
 */
export function prepare(input: PlanInput): { evidence: SectionEvidence[]; base: Plan } {
  const audience = inferAudience(input);
  const evidence = gatherEvidence(input);
  return { evidence, base: composeTemplatePlan(input, evidence, audience) };
}

/** Step two: rewrite with the model if a key is set. Never throws. */
export async function enhance(base: Plan, input: PlanInput, evidence: readonly SectionEvidence[]): Promise<Plan> {
  if (!hasModelKey()) return base;
  try {
    const model = await callModel(input, evidence);
    if (!model) {
      return { ...base, fallbackReason: "The composer returned something unreadable, so the template plan stands." };
    }
    return mergeModelPlan(base, model, evidence);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      ...base,
      fallbackReason: `Composer unavailable (${message}). This is the template plan, built from the same retrieved archive items.`,
    };
  }
}

/** Retrieve, then compose. Always returns a plan. */
export async function buildPlan(input: PlanInput): Promise<ComposeResult> {
  const { evidence, base } = prepare(input);
  return { plan: await enhance(base, input, evidence), evidence };
}
