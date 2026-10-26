/**
 * The structured tagging layer.
 *
 * This is the part the video says everyone gets lazy about: dump the archive
 * into a vector store, call it a product, ship a search box with confidence.
 * Instead every item gets classified across six axes against closed
 * vocabularies, deterministically, with no API key and no network.
 *
 * The rules are weighted keyword/phrase signals. A phrase that names a thing
 * exactly ("cold email", "retainer") scores higher than a word that merely
 * gestures at it ("send", "monthly"), and each axis keeps only the values that
 * clear a floor — otherwise every item ends up tagged with everything, which is
 * the same as tagging nothing.
 */

import {
  type ArchiveItem,
  type ArchiveTags,
  type Audience,
  type Example,
  type Framework,
  type Job,
  type Outcome,
  type RawArchiveRecord,
  type TagAxis,
  type Topic,
  EMPTY_TAGS,
} from "./types";

type Rule = readonly [pattern: string, weight: number];
type RuleSet<T extends string> = Readonly<Record<T, readonly Rule[]>>;

const JOB_RULES: RuleSet<Job> = {
  "find-wedge": [
    ["wedge", 5],
    ["one specific", 3],
    ["narrow", 3],
    ["niche", 3],
    ["what makes your customer open", 3],
    ["picked", 2],
    ["lane", 2],
    ["positioning", 3],
    ["one thing", 2],
  ],
  "pick-customer": [
    ["who to sell", 5],
    ["segment", 4],
    ["audience", 2],
    ["prospect", 3],
    ["ideal client", 4],
    ["vertical", 3],
    ["buyer", 3],
    ["they qualify", 3],
    ["scorecard", 3],
  ],
  "price-offer": [
    ["price", 4],
    ["pricing", 5],
    ["charge", 4],
    ["invoice", 4],
    ["retainer", 4],
    ["$", 1],
    ["per month", 2],
    ["quote", 3],
    ["offer", 3],
    ["package", 2],
  ],
  "get-distribution": [
    ["cold email", 5],
    ["outreach", 4],
    ["distribution", 5],
    ["channel", 3],
    ["notes", 2],
    ["reply", 2],
    ["dm", 2],
    ["discovery engine", 4],
    ["recommendation", 2],
    ["restack", 2],
    ["subscriber", 2],
  ],
  validate: [
    ["validate", 5],
    ["test", 3],
    ["proof", 3],
    ["evidence", 3],
    ["run the numbers", 4],
    ["diagnostic", 3],
    ["the meeting is over", 3],
    ["before you build", 4],
    ["demand", 2],
  ],
  "first-client": [
    ["first client", 5],
    ["first invoice", 5],
    ["first paying", 5],
    ["closed", 3],
    ["design partner", 4],
    ["demo booked", 4],
    ["sales call", 3],
    ["pitch", 3],
    ["signed", 2],
  ],
  "ship-fast": [
    ["shipped", 3],
    ["built it in", 4],
    ["one weekend", 4],
    ["same day", 4],
    ["one night", 4],
    ["mvp", 4],
    ["prototype", 3],
    ["agents", 2],
    ["build", 1],
    ["testflight", 2],
  ],
  "stay-broke-proof": [
    ["api bill", 5],
    ["unit economics", 5],
    ["costs me money", 5],
    ["free tier", 4],
    ["zero api", 5],
    ["broke", 3],
    ["budget", 2],
    ["burn", 3],
    ["no money", 3],
    ["$0", 3],
  ],
  "build-audience": [
    ["substack", 4],
    ["newsletter", 4],
    ["publish", 3],
    ["posting", 3],
    ["vlog", 4],
    ["film", 2],
    ["content", 3],
    ["followers", 3],
    ["episode", 3],
    ["audience", 2],
  ],
  "keep-going": [
    ["failed", 3],
    ["almost deleted", 4],
    ["embarrassing", 3],
    ["scary", 3],
    ["stomach drop", 4],
    ["waiting", 3],
    ["permission", 3],
    ["honest", 2],
    ["what went wrong", 4],
    ["mistake", 3],
  ],
};

const TOPIC_RULES: RuleSet<Topic> = {
  idea: [
    ["idea", 3],
    ["what to build", 4],
    ["picked", 2],
    ["researched", 3],
    ["opportunity", 3],
  ],
  market: [
    ["market", 4],
    ["competitor", 4],
    ["incumbent", 4],
    ["industry", 3],
    ["category", 2],
    ["retention rate", 4],
    ["segment", 3],
    ["demand", 3],
  ],
  wedge: [
    ["wedge", 5],
    ["one specific", 3],
    ["narrow", 3],
    ["entry point", 4],
    ["the loop", 3],
    ["first version", 3],
  ],
  distribution: [
    ["cold email", 5],
    ["outreach", 4],
    ["notes", 3],
    ["distribution", 5],
    ["subscribers", 3],
    ["reply", 2],
    ["inbox", 3],
    ["discovery", 3],
    ["referral", 3],
  ],
  pricing: [
    ["price", 4],
    ["pricing", 5],
    ["$", 1],
    ["retainer", 4],
    ["invoice", 4],
    ["subscription", 3],
    ["per month", 3],
    ["free tier", 2],
    ["commission", 3],
  ],
  mvp: [
    ["mvp", 5],
    ["shipped", 3],
    ["built", 2],
    ["prototype", 4],
    ["first version", 4],
    ["demo", 3],
    ["scope", 3],
    ["one weekend", 3],
  ],
  community: [
    ["community", 5],
    ["subscribers", 3],
    ["comments", 3],
    ["congregation", 3],
    ["members", 3],
    ["readers", 3],
    ["testers", 3],
  ],
  moat: [
    ["moat", 5],
    ["taste", 4],
    ["switching cost", 5],
    ["can't download", 4],
    ["nobody else", 3],
    ["unfair advantage", 5],
    ["combination is the moat", 5],
    ["defensible", 4],
  ],
  examples: [
    ["for example", 3],
    ["i built", 3],
    ["the client", 3],
    ["last month", 2],
    ["this month", 2],
    ["case", 2],
    ["receipt", 3],
  ],
};

const AUDIENCE_RULES: RuleSet<Audience> = {
  student: [
    ["college", 4],
    ["student", 4],
    ["campus", 3],
    ["dorm", 4],
    ["gpa", 4],
    ["semester", 3],
    ["21", 1],
    ["undergrad", 4],
  ],
  "solo-builder": [
    ["solo", 4],
    ["by myself", 3],
    ["one operator", 5],
    ["indie", 4],
    ["alone", 2],
    ["my laptop", 3],
    ["agents", 2],
  ],
  creator: [
    ["creator", 5],
    ["film", 3],
    ["photographer", 4],
    ["vlog", 3],
    ["audience", 2],
    ["personal brand", 5],
    ["artist", 4],
  ],
  freelancer: [
    ["freelance", 5],
    ["client work", 4],
    ["gig", 3],
    ["billed", 3],
    ["scope", 2],
    ["service", 2],
  ],
  "agency-owner": [
    ["agency", 5],
    ["retainer", 4],
    ["clients", 3],
    ["studio", 3],
    ["shop", 2],
    ["practice", 2],
  ],
  "first-time-founder": [
    ["founder", 4],
    ["startup", 4],
    ["first time", 3],
    ["never done", 3],
    ["yc", 3],
    ["company", 2],
  ],
  "career-switcher": [
    ["career", 4],
    ["job", 2],
    ["resume", 4],
    ["entry level", 4],
    ["applying", 3],
    ["quit", 3],
    ["internship", 3],
  ],
};

const FRAMEWORK_RULES: RuleSet<Framework> = {
  "return-equation": [
    ["return equation", 6],
    ["a × f × v", 6],
    ["r = ", 5],
    ["active audience", 4],
    ["value per open", 5],
    ["multiple", 2],
  ],
  "six-loops": [
    ["loop", 3],
    ["calendar loop", 6],
    ["reorder loop", 6],
    ["progress loop", 6],
    ["access loop", 6],
    ["drop loop", 6],
    ["status loop", 6],
    ["attaches to", 4],
  ],
  "four-questions": [
    ["four questions", 6],
    ["next tuesday", 5],
    ["how many times a month", 5],
    ["ninety seconds", 4],
  ],
  "money-ladder": [
    ["money ladder", 6],
    ["paid subscribers", 3],
    ["bestseller", 4],
    ["tier", 3],
    ["$5", 2],
    ["upsell", 3],
  ],
  "zero-api-rule": [
    ["zero api", 6],
    ["costs me money when", 6],
    ["on-device", 4],
    ["free tiers", 4],
    ["broke-proof", 6],
  ],
  "notes-engine": [
    ["notes are the discovery", 6],
    ["notes bank", 5],
    ["2-3 a day", 4],
    ["story notes", 5],
    ["restack", 3],
  ],
  "proof-process-position": [
    ["proof", 3],
    ["process", 2],
    ["position", 3],
    ["credibility engine", 6],
    ["trust engine", 6],
    ["memory engine", 6],
    ["business unlock", 5],
  ],
  "ledger-transparency": [
    ["the ledger", 5],
    ["real numbers", 5],
    ["radical transparency", 6],
    ["never estimate", 5],
    ["what went wrong", 4],
  ],
  "taste-gap": [
    ["taste", 5],
    ["hyphen", 5],
    ["last 10%", 5],
    ["raised the floor", 6],
    ["color grade", 5],
    ["smell the shortcuts", 6],
  ],
  "design-per-client": [
    ["never templated", 6],
    ["its own design", 5],
    ["design system", 4],
    ["distinct design", 5],
    ["nobody got a template", 6],
  ],
  "cold-email-math": [
    ["reply rate", 5],
    ["3.4%", 6],
    ["50 cold emails", 6],
    ["per closed deal", 5],
    ["warmup", 4],
  ],
  "retainer-stack": [
    ["maintenance", 4],
    ["$100/mo", 5],
    ["per month", 2],
    ["recurring", 4],
    ["mrr", 5],
    ["ten clients", 4],
  ],
  "stealth-launch": [
    ["nobody in my life", 6],
    ["stealth", 6],
    ["platform-native", 5],
    ["secrecy", 5],
  ],
  "constraint-as-brief": [
    ["constraint", 5],
    ["design brief", 5],
    ["the constraint isn't in your way", 6],
    ["forced", 3],
    ["$99", 3],
  ],
};

const EXAMPLE_RULES: RuleSet<Example> = {
  callback: [["callback", 5], ["swipehire", 5], ["swipe-to-apply", 5]],
  binderly: [["binderly", 6], ["insurance agenc", 5], ["back office", 4]],
  "deposit-shield": [["deposit shield", 6], ["renter", 4], ["security deposit", 5]],
  reelfactory: [["reelfactory", 6], ["content plan", 4], ["content-plan", 4]],
  selah: [["selah", 6], ["devotional", 4], ["faith + wellness", 5]],
  spendtype: [["spendtype", 6], ["finance app", 4], ["spending personality", 5]],
  sumline: [["sumline", 6], ["puzzle game", 5], ["number-path", 5]],
  "church-apps": [["church app", 5], ["congregation", 3], ["seven apps", 5], ["sermon", 4]],
  "who-worship": [["who worship", 6], ["app review", 3], ["rejection", 3]],
  "insurance-broker-app": [["the broker", 5], ["policyholder", 5], ["certificate of insurance", 5]],
  "oral-surgeon-app": [["oral surgeon", 6], ["post-op", 5], ["recovery guide", 4]],
  rmg: [["royz media group", 6], ["the agency", 4], ["my company", 3]],
  substack: [["substack", 5], ["field notes", 4], ["newsletter", 3]],
  omega: [["omega", 5], ["morning brief", 5], ["agentic os", 5], ["dashboard", 2]],
  "opportunity-hunter": [["opportunity hunter", 6], ["scholarship", 4], ["hunts jobs", 5]],
  "nad-pitch": [["$5,000", 5], ["pitch deck", 4], ["youth organization", 5], ["$5k", 5]],
};

const OUTCOME_RULES: RuleSet<Outcome> = {
  "first-invoice": [["first invoice", 6], ["$1,500", 5], ["first real invoice", 6], ["paid", 2]],
  "recurring-revenue": [["$100 a month", 5], ["$100/mo", 5], ["mrr", 5], ["retainer", 4], ["recurring", 4]],
  shipped: [["shipped", 4], ["built clean", 5], ["live", 2], ["deployed", 4]],
  testflight: [["testflight", 6], ["beta testers", 5], ["build 3", 3]],
  "app-store-rejection": [["rejected", 5], ["app review", 4], ["resubmission", 5], ["guideline", 3]],
  "no-reply": [["no reply", 5], ["ignored", 4], ["nobody owes you a reply", 6], ["silence", 3]],
  scrapped: [["scrap", 5], ["almost deleted", 6], ["killed", 4], ["cut", 2]],
  pivoted: [["pivot", 6], ["renamed", 4], ["re-geared", 5], ["changed the model", 5]],
  "priced-up": [["charged more", 5], ["$5,000", 4], ["would've done it for free", 6], ["raised", 3]],
  "turned-down-work": [["turned down", 6], ["said no", 5], ["telling them not to", 6], ["walk away", 4]],
  published: [["posted", 3], ["published", 4], ["went out", 3], ["sent", 2]],
  "zero-cost": [["$0", 5], ["free", 2], ["zero-cost", 6], ["no ads", 5], ["$99", 4]],
};

const RULES: { [K in TagAxis]: RuleSet<string> } = {
  job: JOB_RULES,
  topic: TOPIC_RULES,
  audience: AUDIENCE_RULES,
  example: EXAMPLE_RULES,
  framework: FRAMEWORK_RULES,
  outcome: OUTCOME_RULES,
};

/**
 * Floors per axis. Job and topic are meant to be broad enough to route on, so
 * they sit low; example and framework are claims about specificity, so they sit
 * high — an item should not get tagged `return-equation` for saying "multiple".
 */
const FLOOR: Record<TagAxis, number> = {
  job: 5,
  topic: 5,
  audience: 5,
  example: 5,
  framework: 6,
  outcome: 5,
};

/** Max values kept per axis, best-scoring first. Keeps tags meaningful. */
const CAP: Record<TagAxis, number> = {
  job: 3,
  topic: 4,
  audience: 3,
  example: 4,
  framework: 3,
  outcome: 3,
};

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1 && count < 8) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function scoreAxis(text: string, ruleSet: RuleSet<string>, axis: TagAxis): string[] {
  const scored: Array<{ value: string; score: number }> = [];
  for (const [value, rules] of Object.entries(ruleSet)) {
    let score = 0;
    for (const [pattern, weight] of rules) {
      const hits = countOccurrences(text, pattern);
      if (hits === 0) continue;
      // Diminishing returns: the second mention confirms, the eighth doesn't.
      score += weight * (1 + Math.min(hits - 1, 3) * 0.35);
    }
    if (score >= FLOOR[axis]) scored.push({ value, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, CAP[axis]).map((entry) => entry.value);
}

function dedupe<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

/**
 * Classify one record. Seed tags (set by hand at ingest time) always survive;
 * rules only ever add. Model tags, when present, are merged last and are the
 * only non-deterministic input — the app is fully functional without them.
 */
export function tagRecord(record: RawArchiveRecord): ArchiveItem {
  const text = `${record.title}\n${record.pull ?? ""}\n${record.body}`.toLowerCase();

  const tagSource: ArchiveItem["tagSource"] = {};
  const collected: Record<TagAxis, string[]> = {
    job: [],
    topic: [],
    audience: [],
    example: [],
    framework: [],
    outcome: [],
  };

  for (const axis of Object.keys(RULES) as TagAxis[]) {
    const seeded = (record.seedTags?.[axis] ?? []) as string[];
    const allowed = new Set(Object.keys(RULES[axis]));

    // A hand-set axis is authoritative. The curator deciding that an item is
    // audience-building rather than distribution material is a routing
    // decision, and letting the keyword rules quietly add the other tag back
    // would put the same five items in front of every reader.
    if (seeded.length > 0) {
      collected[axis] = dedupe(seeded).filter((value) => allowed.has(value));
      tagSource[axis] = "seed";
      continue;
    }

    const inferred = scoreAxis(text, RULES[axis], axis);
    const fromModel = (record.modelTags?.[axis] ?? []) as string[];
    collected[axis] = dedupe([...inferred, ...fromModel]).filter((value) => allowed.has(value));

    if (inferred.length > 0) tagSource[axis] = "rules";
    else if (fromModel.length > 0) tagSource[axis] = "model";
  }

  // Values are filtered against the closed vocabularies above, so the widening
  // back to the union types is checked in practice even though not by tsc.
  const tags: ArchiveTags = {
    ...EMPTY_TAGS,
    job: collected.job as Job[],
    topic: collected.topic as Topic[],
    audience: collected.audience as Audience[],
    example: collected.example as Example[],
    framework: collected.framework as Framework[],
    outcome: collected.outcome as Outcome[],
  };

  return {
    id: record.id,
    title: record.title,
    source: record.source,
    url: record.url,
    date: record.date,
    body: record.body,
    kind: record.kind,
    pull: record.pull,
    derived: record.derived,
    derivedFrom: record.derivedFrom,
    tags,
    tagSource,
  };
}

export function tagAll(records: readonly RawArchiveRecord[]): ArchiveItem[] {
  return records.map(tagRecord);
}

/** Total tag assignments across an item set — the "structure is real" number. */
export function countTags(items: readonly ArchiveItem[]): number {
  return items.reduce(
    (total, item) =>
      total +
      item.tags.job.length +
      item.tags.topic.length +
      item.tags.audience.length +
      item.tags.example.length +
      item.tags.framework.length +
      item.tags.outcome.length,
    0,
  );
}
