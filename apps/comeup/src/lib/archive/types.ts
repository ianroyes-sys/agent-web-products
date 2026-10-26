/**
 * The archive schema.
 *
 * The whole thesis of this product is that the structure is the moat: a
 * vector dump answers "what did he say about X", a tagged archive answers
 * "which piece of this archive does the job I'm stuck on". So tags are not a
 * loose string[] — every item is classified across six fixed axes, and the
 * vocabularies below are closed sets that both the tagger and the retriever
 * compile against.
 */

export const JOBS = [
  "find-wedge",
  "pick-customer",
  "price-offer",
  "get-distribution",
  "validate",
  "first-client",
  "ship-fast",
  "stay-broke-proof",
  "build-audience",
  "keep-going",
] as const;
export type Job = (typeof JOBS)[number];

/** Greg's own taxonomy for a startup archive, used verbatim. */
export const TOPICS = [
  "idea",
  "market",
  "wedge",
  "distribution",
  "pricing",
  "mvp",
  "community",
  "moat",
  "examples",
] as const;
export type Topic = (typeof TOPICS)[number];

export const AUDIENCES = [
  "student",
  "solo-builder",
  "creator",
  "freelancer",
  "agency-owner",
  "first-time-founder",
  "career-switcher",
] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Named, reusable methods. A framework tag is the strongest retrieval signal. */
export const FRAMEWORKS = [
  "return-equation",
  "six-loops",
  "four-questions",
  "money-ladder",
  "zero-api-rule",
  "notes-engine",
  "proof-process-position",
  "ledger-transparency",
  "taste-gap",
  "design-per-client",
  "cold-email-math",
  "retainer-stack",
  "stealth-launch",
  "constraint-as-brief",
] as const;
export type Framework = (typeof FRAMEWORKS)[number];

/** Concrete cases. Advice without one of these is a platitude. */
export const EXAMPLES = [
  "callback",
  "binderly",
  "deposit-shield",
  "reelfactory",
  "selah",
  "spendtype",
  "sumline",
  "church-apps",
  "who-worship",
  "insurance-broker-app",
  "oral-surgeon-app",
  "rmg",
  "substack",
  "omega",
  "opportunity-hunter",
  "nad-pitch",
] as const;
export type Example = (typeof EXAMPLES)[number];

export const OUTCOMES = [
  "first-invoice",
  "recurring-revenue",
  "shipped",
  "testflight",
  "app-store-rejection",
  "no-reply",
  "scrapped",
  "pivoted",
  "priced-up",
  "turned-down-work",
  "published",
  "zero-cost",
] as const;
export type Outcome = (typeof OUTCOMES)[number];

export type ArchiveKind =
  | "essay"
  | "post"
  | "note"
  | "ledger"
  | "timeline"
  | "doctrine"
  | "episode-idea"
  | "lesson"
  | "positioning";

export interface ArchiveTags {
  job: Job[];
  topic: Topic[];
  audience: Audience[];
  example: Example[];
  framework: Framework[];
  outcome: Outcome[];
}

export const TAG_AXES = ["job", "topic", "audience", "example", "framework", "outcome"] as const;
export type TagAxis = (typeof TAG_AXES)[number];

export interface ArchiveSource {
  id: string;
  label: string;
  /** Where the material physically came from, so provenance is auditable. */
  origin: string;
  url?: string;
  count: number;
}

/** A normalized unit of the archive. One idea, one citable thing. */
export interface ArchiveItem {
  id: string;
  title: string;
  source: string;
  url?: string;
  date?: string;
  body: string;
  kind: ArchiveKind;
  /** A single line the plan can quote directly. */
  pull?: string;
  /**
   * True when the item was distilled from a private working record rather than
   * lifted verbatim from something published. Rendered in the UI — a citation
   * that pretends to be a public post when it isn't is the fastest way to lose
   * the reader.
   */
  derived?: boolean;
  derivedFrom?: string;
  tags: ArchiveTags;
  /** Which axes were set by hand vs. inferred by the tagger. */
  tagSource: Partial<Record<TagAxis, "seed" | "rules" | "model">>;
}

/** Pre-tag shape emitted by scripts/build-archive.mjs. */
export interface RawArchiveRecord {
  id: string;
  title: string;
  source: string;
  url?: string;
  date?: string;
  body: string;
  kind: ArchiveKind;
  pull?: string;
  derived?: boolean;
  derivedFrom?: string;
  seedTags?: Partial<ArchiveTags>;
  modelTags?: Partial<ArchiveTags>;
}

export interface RawArchiveFile {
  generatedAt: string;
  sources: ArchiveSource[];
  items: RawArchiveRecord[];
}

export const EMPTY_TAGS: ArchiveTags = {
  job: [],
  topic: [],
  audience: [],
  example: [],
  framework: [],
  outcome: [],
};

export const AXIS_LABEL: Record<TagAxis, string> = {
  job: "Job",
  topic: "Topic",
  audience: "Audience",
  example: "Example",
  framework: "Framework",
  outcome: "Outcome",
};

export const JOB_LABEL: Record<Job, string> = {
  "find-wedge": "Narrow it to one thing",
  "pick-customer": "Pick who it's for",
  "price-offer": "Package it and price it",
  "get-distribution": "Find the first channel",
  validate: "Test it this week",
  "first-client": "Close the first one",
  "ship-fast": "Ship without a team",
  "stay-broke-proof": "Build it broke-proof",
  "build-audience": "Build the audience",
  "keep-going": "Keep going",
};
