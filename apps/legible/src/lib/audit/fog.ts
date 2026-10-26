/* The fog index.

   Marketing fog is the single most expensive habit on a B2B site, because
   it is the one thing that survives every redesign. "Unlocking operational
   excellence" tells a human nothing and tells a model less: there is no
   entity, no capability, no number, nothing to compare against a rival.

   Weights are judgment, and they are stated openly:
     3 = pure vapor. Removing it loses zero information.
     2 = a real idea buried under a stock phrase.
     1 = tolerable in small doses, damaging in volume. */

import { sentences, wordCount } from "./html.ts";
import type { FogHit, FogResult } from "./types.ts";

interface FogPhrase {
  pattern: RegExp;
  label: string;
  weight: number;
}

const phrase = (source: string, weight: number, label?: string): FogPhrase => ({
  pattern: new RegExp(`\\b${source}\\b`, "gi"),
  label: label ?? readableLabel(source),
  weight,
});

/** Turn a pattern back into something a client can read in a report row. */
function readableLabel(source: string): string {
  return source
    .replace(/\(\?:[^)]*\)\??/g, "") // drop optional inflection groups entirely
    .replace(/\[- ]/g, " ")
    .replace(/\\[sbwd]\+?\*?/g, " ")
    .replace(/[()?|+*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const FOG_PHRASES: FogPhrase[] = [
  // Pure vapor.
  phrase("operational excellence", 3),
  phrase("unlocking(?:\\s+\\w+){0,2}\\s+(?:value|potential|excellence)", 3, "unlocking value / potential"),
  phrase("synergy|synergies|synergistic", 3, "synergy"),
  phrase("paradigm shift(?:ing)?", 3, "paradigm shift"),
  phrase("holistic approach", 3),
  phrase("thought leader(?:ship)?", 3),
  phrase("world[- ]class", 3),
  phrase("best[- ]in[- ]class", 3),
  phrase("industry[- ]leading", 3),
  phrase("cutting[- ]edge", 3),
  phrase("state[- ]of[- ]the[- ]art", 3),
  phrase("next[- ]generation|next[- ]gen", 3, "next-generation"),
  phrase("unparalleled", 3),
  phrase("unwavering commitment", 3),
  phrase("value[- ]added", 3),
  phrase("core competenc(?:y|ies)", 3, "core competencies"),
  phrase("customer[- ]centric", 3),
  phrase("results[- ]driven", 3),
  phrase("passionate about", 3),
  phrase("(?:we )?go(?:es)? above and beyond", 3, "above and beyond"),
  phrase("full[- ]spectrum", 3),
  phrase("turnkey", 3),
  phrase("force multiplier", 3),

  // A real idea, wrapped in stock language.
  phrase("leverag(?:e|es|ing)", 2, "leverage"),
  phrase("empower(?:s|ing|ed)?", 2, "empower"),
  phrase("harness(?:es|ing)?", 2, "harness"),
  phrase("enabl(?:e|es|ing)", 2, "enable"),
  phrase("driv(?:e|es|ing)\\s+(?:innovation|success|value|growth|results)", 2, "driving innovation / value"),
  phrase("transform(?:s|ing|ation(?:al)?)?", 2, "transform / transformation"),
  phrase("innovativ(?:e|ely)|innovation", 2, "innovative / innovation"),
  phrase("seamless(?:ly)?", 2, "seamless"),
  phrase("end[- ]to[- ]end", 2),
  phrase("mission[- ]critical", 2),
  phrase("trusted (?:partner|advisor|provider)", 2, "trusted partner"),
  phrase("proven track record", 2),
  phrase("tailored solutions?", 2, "tailored solutions"),
  phrase("comprehensive (?:suite|range|portfolio|solutions?)", 2, "comprehensive suite / portfolio"),
  phrase("delivering value", 2),
  phrase("commitment to excellence", 2),
  phrase("agile(?:\\s+methodolog\\w+)?", 1, "agile"),
  phrase("dedicated team", 2),
  phrase("premier", 2),
  phrase("bespoke", 2),
  phrase("game[- ]chang(?:er|ing)", 3, "game-changing"),
  phrase("disrupt(?:ive|ing|ion)", 2, "disruptive"),
  phrase("robust(?:ness)?", 1, "robust"),
  phrase("scalab(?:le|ility)", 1, "scalable"),
  phrase("streamlin(?:e|es|ing|ed)", 1, "streamline"),
  phrase("optimiz(?:e|es|ing|ation)", 1, "optimize"),
  phrase("stakeholders?", 1, "stakeholders"),
  phrase("ecosystems?", 1, "ecosystem"),
  phrase("solutions?", 1, "solutions"),
  phrase("capabilit(?:y|ies)", 1, "capabilities"),
  phrase("strategic(?:ally)?", 1, "strategic"),
  phrase("360[- ]degree", 2),
  phrase("boots on the ground", 2),
  phrase("white[- ]glove", 2),
];

/**
 * Density of stock marketing language, per 1,000 words.
 *
 * Score band: 1 hit per 1k reads as human; 12 per 1k is a page that has
 * been written entirely out of a phrasebook.
 */
export function fogIndex(text: string, sourceUrl?: string): FogResult {
  const words = wordCount(text);
  const hits: FogHit[] = [];
  let weighted = 0;

  for (const entry of FOG_PHRASES) {
    entry.pattern.lastIndex = 0;
    const matches = text.match(entry.pattern);
    if (!matches || matches.length === 0) continue;
    hits.push({ phrase: entry.label, count: matches.length, weight: entry.weight });
    weighted += matches.length * entry.weight;
  }

  hits.sort((a, b) => b.count * b.weight - a.count * a.weight);

  const per1k = words > 0 ? (weighted / words) * 1000 : 0;
  const score = clampScore(100 - ((per1k - 1) * 100) / 11);

  let worstSentence: string | undefined;
  let worstDensity = 0;
  for (const sentence of sentences(text)) {
    const sentenceWords = wordCount(sentence);
    if (sentenceWords < 6) continue;
    let sentenceWeight = 0;
    for (const entry of FOG_PHRASES) {
      entry.pattern.lastIndex = 0;
      const matches = sentence.match(entry.pattern);
      if (matches) sentenceWeight += matches.length * entry.weight;
    }
    const density = sentenceWeight / sentenceWords;
    if (sentenceWeight >= 4 && density > worstDensity) {
      worstDensity = density;
      worstSentence = sentence;
    }
  }

  return {
    per1k: Math.round(per1k * 10) / 10,
    score,
    words,
    hits: hits.slice(0, 14),
    worstSentence,
    worstSource: worstSentence ? sourceUrl : undefined,
  };
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
