/* ------------------------------------------------------------------
   Legible — audit types.

   One rule governs this file: every number the report shows must be
   traceable to a string we actually read off the site. `Evidence.quote`
   is not decoration, it is the product. A founder does not believe a
   score. A founder believes their own sentence read back to them.
------------------------------------------------------------------- */

export const AUDIT_VERSION = "0.1.0";

export type DimensionId =
  | "discoverable"
  | "parseable"
  | "priced"
  | "comparable"
  | "proven"
  | "current"
  | "fog";

export type EvidenceStatus = "pass" | "partial" | "fail" | "info";

export interface Evidence {
  /** What was checked, in the client's language, not ours. */
  label: string;
  status: EvidenceStatus;
  /** One sentence a non-technical buyer can act on. */
  detail: string;
  /** Literal excerpt from the site. Never paraphrased, never invented. */
  quote?: string;
  /** URL the excerpt came from. */
  source?: string;
  /** Points earned / points available for this check. */
  points: number;
  possible: number;
}

export interface DimensionScore {
  id: DimensionId;
  label: string;
  /** One-line description of what this dimension measures. */
  question: string;
  score: number;
  weight: number;
  summary: string;
  evidence: Evidence[];
}

export type SignalWeight = "critical" | "high" | "medium";

export interface GovConSignal {
  id: string;
  label: string;
  found: boolean;
  /** The literal value found on the site, when there is one. */
  value?: string;
  /** Surrounding excerpt, so the client can see it in context. */
  quote?: string;
  source?: string;
  /** Why an agent cannot shortlist the firm without it. */
  why: string;
  weight: SignalWeight;
}

export interface GovConResult {
  score: number;
  signals: GovConSignal[];
  verdict: string;
  /** The named query this firm would fail, spelled out. */
  failedQuery: string;
}

export type Effort = "low" | "medium" | "high";

export interface Fix {
  id: string;
  title: string;
  dimension: DimensionId | "govcon";
  /** 1–5. 5 = changes whether an agent can recommend the firm at all. */
  impact: number;
  effort: Effort;
  detail: string;
  /** Fix-kit generator that produces the artifact, when one exists. */
  artifact?: string;
}

export interface PageRecord {
  path: string;
  url: string;
  status: number;
  ok: boolean;
  bytes: number;
  ms: number;
  contentType: string;
  error?: string;
  /** True when the path was found by reading the homepage nav, not guessed. */
  discovered?: boolean;
}

export interface FogHit {
  phrase: string;
  count: number;
  weight: number;
}

export interface FogResult {
  /** Weighted marketing-speak hits per 1,000 words. */
  per1k: number;
  score: number;
  words: number;
  hits: FogHit[];
  /** The single foggiest sentence on the site, verbatim. The screenshot. */
  worstSentence?: string;
  worstSource?: string;
}

export type Answerable = "yes" | "partial" | "no";

export interface AgentQuestion {
  id: string;
  question: string;
  answerable: Answerable;
  /** What the site actually supports, quoted or summarized from evidence. */
  fromSite: string;
  /** Supplied by the client at intake. Empty until they fill it in. */
  clientClaim?: string;
}

export interface BatteryPrompt {
  id: string;
  category: "discovery" | "comparison" | "qualification" | "risk" | "commercial";
  /** Templated with {company}, {location}, {naics}, {domain}. */
  text: string;
  /** What a good answer would have to contain for the client to win. */
  winsIf: string;
}

export interface BatteryAnswer {
  promptId: string;
  prompt: string;
  answer: string;
  /** Did the model name the client unprompted. */
  mentioned: boolean;
  latencyMs: number;
  error?: string;
}

export interface BatteryResult {
  mode: "live" | "dry-run";
  model: string;
  ran: string;
  promptCount: number;
  answers: BatteryAnswer[];
  /** Share of discovery prompts that surfaced the client. Live mode only. */
  mentionRate?: number;
  notes: string[];
}

export interface AuditReport {
  id: string;
  version: string;
  domain: string;
  siteUrl: string;
  company: string;
  location: string;
  generated: string;
  durationMs: number;
  score: number;
  grade: string;
  headline: string;
  dimensions: DimensionScore[];
  govcon: GovConResult;
  fog: FogResult;
  pages: PageRecord[];
  fixes: Fix[];
  agentView: AgentQuestion[];
  battery?: BatteryResult;
  notes: string[];
}

export interface AuditOptions {
  /** Display name. Defaults to a title-cased guess from the domain. */
  company?: string;
  location?: string;
  timeoutMs?: number;
  /** Extra paths to probe beyond the standard battery. */
  extraPaths?: string[];
  onProgress?: (message: string) => void;
}
