/**
 * Structured retrieval.
 *
 * The differentiator, stated plainly: selection happens on TAGS first. Text
 * relevance only ever breaks ties inside an already tag-qualified set, and it
 * is hard-capped below the weight of a single job match so a keyword pile-up
 * can never outrank a correctly-tagged item. That is the difference between
 * this and a similarity search wearing a product's clothes.
 *
 * No vector store, no embeddings, no network.
 */

import { loadArchive } from "./ingest";
import {
  type ArchiveItem,
  type Audience,
  type Example,
  type Framework,
  type Job,
  type Outcome,
  type TagAxis,
  type Topic,
} from "./types";

export interface RetrievalQuery {
  /** The painful job being solved. The strongest signal by design. */
  job?: Job;
  topics?: Topic[];
  audience?: Audience[];
  frameworks?: Framework[];
  outcomes?: Outcome[];
  /** Free text from the user. Tie-breaker only. */
  text?: string;
  /** Items already used elsewhere in the same plan, so sections don't repeat. */
  exclude?: string[];
  limit?: number;
}

export interface RetrievalHit {
  item: ArchiveItem;
  score: number;
  /** Human-readable proof of why this item came back. Rendered in the UI. */
  matchedOn: string[];
  tagScore: number;
  textScore: number;
}

const WEIGHT = {
  job: 100,
  topic: 26,
  framework: 22,
  audience: 12,
  outcome: 10,
  /** Ceiling on text contribution. Deliberately below one topic match. */
  textCap: 20,
} as const;

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "have", "has", "was", "are", "you", "your",
  "but", "not", "can", "how", "what", "who", "why", "get", "got", "out", "all", "any",
  "one", "two", "own", "its", "it's", "i'm", "i've", "just", "like", "some", "into", "from",
  "they", "them", "there", "here", "then", "than", "will", "would", "could", "should", "about",
  "been", "were", "want", "need", "make", "made", "much", "very", "more", "most", "know",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$%.\s'-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^['-]+|['-]+$/g, ""))
    .filter((token) => token.length > 2 && !STOP.has(token));
}

/**
 * Lightweight lexical overlap with an inverse-document-frequency weighting, so
 * a rare word ("policyholder") counts and a common one ("build") barely does.
 */
function buildIdf(items: readonly ArchiveItem[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const item of items) {
    const seen = new Set(tokenize(`${item.title} ${item.body}`));
    for (const token of seen) df.set(token, (df.get(token) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  const total = items.length || 1;
  for (const [token, count] of df) idf.set(token, Math.log(1 + total / (1 + count)));
  return idf;
}

let idfCache: Map<string, number> | null = null;
function idf(): Map<string, number> {
  if (!idfCache) idfCache = buildIdf(loadArchive());
  return idfCache;
}

function textScore(item: ArchiveItem, queryTokens: readonly string[]): number {
  if (queryTokens.length === 0) return 0;
  const haystack = new Set(tokenize(`${item.title} ${item.title} ${item.pull ?? ""} ${item.body}`));
  const table = idf();
  let raw = 0;
  let possible = 0;
  for (const token of new Set(queryTokens)) {
    const weight = table.get(token) ?? 1.2;
    possible += weight;
    if (haystack.has(token)) raw += weight;
  }
  if (possible === 0) return 0;
  return (raw / possible) * WEIGHT.textCap;
}

function overlap<T extends string>(a: readonly T[] | undefined, b: readonly T[]): T[] {
  if (!a || a.length === 0) return [];
  const set = new Set(b);
  return a.filter((value) => set.has(value));
}

/**
 * Score one item against a query. Returns null when nothing on any axis
 * matched and the query actually specified axes — a tag-first retriever should
 * decline rather than pad the result with vaguely-similar prose.
 */
function scoreItem(
  item: ArchiveItem,
  query: RetrievalQuery,
  queryTokens: readonly string[],
): RetrievalHit | null {
  const matchedOn: string[] = [];
  let tagScore = 0;

  if (query.job && item.tags.job.includes(query.job)) {
    tagScore += WEIGHT.job;
    matchedOn.push(`job:${query.job}`);
  }

  const topics = overlap<Topic>(query.topics, item.tags.topic);
  tagScore += topics.length * WEIGHT.topic;
  topics.forEach((topic) => matchedOn.push(`topic:${topic}`));

  const frameworks = overlap<Framework>(query.frameworks, item.tags.framework);
  tagScore += frameworks.length * WEIGHT.framework;
  frameworks.forEach((framework) => matchedOn.push(`framework:${framework}`));

  const audiences = overlap<Audience>(query.audience, item.tags.audience);
  tagScore += audiences.length * WEIGHT.audience;
  audiences.forEach((audience) => matchedOn.push(`audience:${audience}`));

  const outcomes = overlap<Outcome>(query.outcomes, item.tags.outcome);
  tagScore += outcomes.length * WEIGHT.outcome;
  outcomes.forEach((outcome) => matchedOn.push(`outcome:${outcome}`));

  const text = textScore(item, queryTokens);

  const askedForTags = Boolean(
    query.job ||
      query.topics?.length ||
      query.frameworks?.length ||
      query.audience?.length ||
      query.outcomes?.length,
  );

  if (askedForTags && tagScore === 0) return null;
  if (!askedForTags && text <= 0) return null;

  // An item carrying a concrete example is worth more than one that doesn't:
  // the archive's job is to hand back receipts, not opinions.
  const specificity = item.tags.example.length > 0 ? 4 : 0;

  return {
    item,
    score: tagScore + text + specificity,
    matchedOn,
    tagScore,
    textScore: Number(text.toFixed(2)),
  };
}

export function retrieve(query: RetrievalQuery): RetrievalHit[] {
  const items = loadArchive();
  const exclude = new Set(query.exclude ?? []);
  const queryTokens = tokenize(query.text ?? "");
  const limit = Math.min(Math.max(query.limit ?? 6, 1), 40);

  const hits: RetrievalHit[] = [];
  for (const item of items) {
    if (exclude.has(item.id)) continue;
    const hit = scoreItem(item, query, queryTokens);
    if (hit) hits.push(hit);
  }

  hits.sort((a, b) => {
    if (b.tagScore !== a.tagScore) return b.tagScore - a.tagScore;
    if (b.score !== a.score) return b.score - a.score;
    return a.item.id.localeCompare(b.item.id);
  });

  return hits.slice(0, limit);
}

/** Browse-side filtering for /archive. Tag filters are AND across axes. */
export interface BrowseFilter {
  job?: string;
  topic?: string;
  audience?: string;
  framework?: string;
  outcome?: string;
  example?: string;
  q?: string;
}

export function browse(filter: BrowseFilter): ArchiveItem[] {
  const query = filter.q?.trim().toLowerCase() ?? "";
  return loadArchive().filter((item) => {
    if (filter.job && !item.tags.job.includes(filter.job as Job)) return false;
    if (filter.topic && !item.tags.topic.includes(filter.topic as Topic)) return false;
    if (filter.audience && !item.tags.audience.includes(filter.audience as Audience)) return false;
    if (filter.framework && !item.tags.framework.includes(filter.framework as Framework)) {
      return false;
    }
    if (filter.outcome && !item.tags.outcome.includes(filter.outcome as Outcome)) return false;
    if (filter.example && !item.tags.example.includes(filter.example as Example)) return false;
    if (query) {
      const haystack = `${item.title} ${item.pull ?? ""} ${item.body}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/** Counts per value on one axis, for the filter rails. */
export function facet(axis: TagAxis, items: readonly ArchiveItem[] = loadArchive()) {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const value of item.tags[axis]) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}
