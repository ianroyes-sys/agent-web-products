import type { Audience, Job } from "@/lib/archive/types";

export interface PlanInput {
  /** What you can do, what you've got, where you are. The only required field. */
  situation: string;
  /** What you've already tried. Shapes the diagnosis, not just the flavour. */
  tried?: string;
  where?: string;
  hoursPerWeek: number;
  /** Dollars you can put in before anything comes out. Zero is a valid answer. */
  budget: number;
}

export interface Citation {
  id: string;
  title: string;
  source: string;
  url?: string;
  derived?: boolean;
  /** The specific line the section leaned on. */
  pull?: string;
  /** Tag matches that caused retrieval. Shown so the structure is visible. */
  matchedOn: string[];
}

export type SectionKey = "wedge" | "customer" | "offer" | "distribution" | "validate";

export interface PlanSection {
  key: SectionKey;
  label: string;
  /** One line. The answer, before the reasoning. */
  verdict: string;
  body: string[];
  citations: Citation[];
  /** The archive job this section retrieved against. */
  job: Job;
}

export interface OfferPrice {
  amount: number;
  unit: string;
  floor: number;
  ceiling: number;
  recurring?: { amount: number; unit: string; what: string };
  rationale: string;
}

export interface WeekPlan {
  week: number;
  focus: string;
  moves: string[];
}

export interface Plan {
  id: string;
  generatedAt: string;
  /** "composed" = written by claude-sonnet-5 over the retrieved items. */
  mode: "composed" | "template";
  readback: string;
  headline: string;
  sections: PlanSection[];
  price: OfferPrice;
  thirtyDays: WeekPlan[];
  /** When to stop and pick something else. An honest plan has one. */
  killCriteria: string[];
  audience: Audience[];
  archiveItemsUsed: number;
  /** Present when the model path was attempted and fell back. */
  fallbackReason?: string;
}

export interface PlanStage {
  type: "stage";
  key: "read" | "retrieve" | "compose" | "done";
  label: string;
  detail?: string;
}

export type PlanEvent = PlanStage | { type: "plan"; plan: Plan } | { type: "error"; message: string };
