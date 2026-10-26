/* Every dimension is scored the same way: a list of weighted checks, each
   producing a point award and a sentence of evidence. Scores are therefore
   earned points over available points — never a vibe, never a curve. */

import type { Evidence, EvidenceStatus } from "./types.ts";

export interface CheckInput {
  label: string;
  /** 0 = fail, 1 = full credit, anything between = partial. */
  award: number;
  points: number;
  detail: string;
  quote?: string;
  source?: string;
  /** Force a status instead of deriving it from `award`. */
  status?: EvidenceStatus;
}

export class Scorer {
  private earned = 0;
  private possible = 0;
  private readonly items: Evidence[] = [];

  check(input: CheckInput): this {
    const award = Math.max(0, Math.min(1, input.award));
    const earned = Math.round(award * input.points * 10) / 10;
    this.earned += earned;
    this.possible += input.points;

    this.items.push({
      label: input.label,
      status: input.status ?? (award >= 0.99 ? "pass" : award <= 0.01 ? "fail" : "partial"),
      detail: input.detail,
      quote: input.quote,
      source: input.source,
      points: earned,
      possible: input.points,
    });
    return this;
  }

  /** Context that carries no points but belongs in the evidence trail. */
  note(label: string, detail: string, quote?: string, source?: string): this {
    this.items.push({ label, status: "info", detail, quote, source, points: 0, possible: 0 });
    return this;
  }

  get score(): number {
    if (this.possible === 0) return 0;
    return Math.max(0, Math.min(100, Math.round((this.earned / this.possible) * 100)));
  }

  get evidence(): Evidence[] {
    return this.items;
  }

  /** Failed checks, worst first — the raw material for the fix list. */
  get failures(): Evidence[] {
    return this.items
      .filter((e) => e.status === "fail" || e.status === "partial")
      .sort((a, b) => b.possible - b.points - (a.possible - a.points));
  }
}

export function grade(score: number): string {
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 60) return "D";
  return "F";
}
