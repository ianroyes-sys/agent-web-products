/* The battery runner.

   With ANTHROPIC_API_KEY set, this asks a real model real buyer questions
   and records what comes back, verbatim. Without a key it runs a dry run:
   the prompts are rendered and returned with empty answers, every record
   flagged `DRY RUN`. It never fabricates an answer, because a fabricated
   answer would destroy the only thing this report sells — the screenshot
   of what the machine actually said. */

import { PROMPT_BATTERY, renderPrompt, type PromptVars } from "./prompts.ts";
import type { BatteryAnswer, BatteryPrompt, BatteryResult } from "./types.ts";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";
const DRY_RUN_MARKER = "DRY RUN — no ANTHROPIC_API_KEY present. Prompt was rendered but not sent.";

export interface BatteryOptions {
  apiKey?: string;
  model?: string;
  /** Cap the run. Defaults to the full battery. */
  limit?: number;
  /** Only run these categories. */
  categories?: BatteryPrompt["category"][];
  maxTokens?: number;
  onProgress?: (done: number, total: number, promptId: string) => void;
}

export async function runBattery(vars: PromptVars, options: BatteryOptions = {}): Promise<BatteryResult> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
  const model = options.model ?? MODEL;

  let prompts = PROMPT_BATTERY;
  if (options.categories && options.categories.length > 0) {
    prompts = prompts.filter((p) => options.categories?.includes(p.category));
  }
  if (options.limit && options.limit > 0) prompts = prompts.slice(0, options.limit);

  if (!apiKey) {
    return {
      mode: "dry-run",
      model,
      ran: new Date().toISOString(),
      promptCount: prompts.length,
      answers: prompts.map((prompt) => ({
        promptId: prompt.id,
        prompt: renderPrompt(prompt, vars),
        answer: "",
        mentioned: false,
        latencyMs: 0,
        error: DRY_RUN_MARKER,
      })),
      notes: [
        "DRY RUN. No model was queried and no answers exist.",
        "Set ANTHROPIC_API_KEY and re-run to capture what assistants actually say.",
        `${prompts.length} prompts were rendered and are listed below exactly as they would be sent.`,
      ],
    };
  }

  const answers: BatteryAnswer[] = [];
  let done = 0;

  // Sequential on purpose: a battery is cheap, rate limits are not, and the
  // order of the transcript matters when it lands in a client deck.
  for (const prompt of prompts) {
    const text = renderPrompt(prompt, vars);
    const started = Date.now();
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens ?? 700,
          messages: [{ role: "user", content: text }],
        }),
      });

      if (!res.ok) {
        answers.push({
          promptId: prompt.id,
          prompt: text,
          answer: "",
          mentioned: false,
          latencyMs: Date.now() - started,
          error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
        });
      } else {
        const payload = (await res.json()) as { content?: { type: string; text?: string }[] };
        const answer = (payload.content ?? [])
          .filter((block) => block.type === "text")
          .map((block) => block.text ?? "")
          .join("\n")
          .trim();

        answers.push({
          promptId: prompt.id,
          prompt: text,
          answer,
          mentioned: mentions(answer, vars.company),
          latencyMs: Date.now() - started,
        });
      }
    } catch (err) {
      answers.push({
        promptId: prompt.id,
        prompt: text,
        answer: "",
        mentioned: false,
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    done += 1;
    options.onProgress?.(done, prompts.length, prompt.id);
  }

  const discovery = answers.filter((a) => a.promptId.startsWith("d") && !a.error);
  const mentionRate =
    discovery.length > 0
      ? Math.round((discovery.filter((a) => a.mentioned).length / discovery.length) * 100)
      : undefined;

  const failures = answers.filter((a) => a.error).length;

  return {
    mode: "live",
    model,
    ran: new Date().toISOString(),
    promptCount: prompts.length,
    answers,
    mentionRate,
    notes: [
      `Live run against ${model}.`,
      mentionRate === undefined
        ? "No discovery prompts completed, so no mention rate could be computed."
        : `${vars.company} surfaced unprompted in ${mentionRate}% of discovery queries.`,
      failures > 0 ? `${failures} prompt(s) errored and are recorded with their error text.` : "All prompts completed.",
      "Answers are recorded verbatim. Model output is not evidence of fact, only evidence of what the machine currently believes.",
    ],
  };
}

/** Loose match: legal suffixes and punctuation vary between the site and prose. */
function mentions(answer: string, company: string): boolean {
  const core = company
    .replace(/\b(inc|llc|corp(oration)?|company|co|ltd|technologies|technology|group|solutions)\b\.?/gi, "")
    .replace(/[^\w\s]/g, " ")
    .trim();
  const needle = (core.length >= 4 ? core : company).replace(/\s+/g, "\\s+");
  return new RegExp(needle, "i").test(answer);
}

export { DRY_RUN_MARKER, MODEL as BATTERY_MODEL };
