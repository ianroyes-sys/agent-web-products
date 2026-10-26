#!/usr/bin/env node
/**
 * Come Up — archive extractor.
 *
 * Reads the real source material, normalizes it into raw archive records, and
 * writes src/data/archive.json. Tagging and retrieval live in TypeScript
 * (src/lib/archive) so the app, the JSON API and the MCP tools all share one
 * implementation; this script only does the Node-only part: touching the disk
 * and the network.
 *
 *   node scripts/build-archive.mjs            # deterministic, offline-tolerant
 *   node scripts/build-archive.mjs --enrich   # + optional model tag pass
 *   node scripts/build-archive.mjs --no-net   # skip the Substack fetch
 *
 * Sources that aren't present are skipped with a warning. The script never
 * throws for a missing source, because the committed archive.json is the
 * artifact that ships — a machine without Ian's folders should still be able
 * to run everything else.
 */

import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, "..");
const HOME = homedir();

const ARGS = new Set(process.argv.slice(2));
const NO_NET = ARGS.has("--no-net");
const ENRICH = ARGS.has("--enrich");

const SRC = {
  ebc: join(HOME, "Developer/everything-but-college"),
  vlog: join(HOME, "Developer/omega/data/vlog.json"),
  business: join(HOME, "Developer/omega/data/business.json"),
  seed: join(APP, "data/seed/build-lessons.json"),
  substackApi: "https://ianroyz.substack.com/api/v1/archive?sort=new&limit=50",
};

const items = [];
const sources = [];
const warnings = [];

/* ---------------------------------------------------------------- helpers */

/**
 * Safety net. The private working record is dense with things that should
 * never reach a public JSON file — mail addresses, absolute home paths,
 * key-shaped tokens, internal artifact links. Curation at authoring time is
 * the real defence; this is the second one.
 */
function redact(text) {
  return String(text)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/\/Users\/[\w.-]+/g, "~")
    .replace(/https?:\/\/claude\.ai\/\S+/g, "[internal link]")
    .replace(/\b(sk|pk|rk)[-_][A-Za-z0-9_-]{12,}\b/g, "[key]")
    .replace(/\bacct_[A-Za-z0-9]{8,}\b/g, "[account]")
    .replace(/\b[a-z]{20}\b/g, (match) => (/[aeiou]{2}/.test(match) ? match : "[ref]"))
    .replace(/\b\+?1?[-. (]?\d{3}[-. )]\s?\d{3}[-. ]\d{4}\b/g, "[phone]");
}

function tidy(text) {
  return redact(text).replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function add(record) {
  if (!record.title || !record.body) return;
  items.push({ ...record, body: tidy(record.body), pull: record.pull ? tidy(record.pull) : undefined });
}

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function countSince(startIndex) {
  return items.length - startIndex;
}

function noteSource(id, label, origin, url, startIndex) {
  const count = countSince(startIndex);
  if (count > 0) sources.push({ id, label, origin, url, count });
  return count;
}

/* -------------------------------------------- 1. Everything But College */

function ingestEverythingButCollege() {
  const start = items.length;
  const root = SRC.ebc;
  if (!existsSync(root)) {
    warnings.push(`missing source: ${root}`);
    return;
  }

  // The one finished long-form essay. It carries the frameworks the plan
  // engine leans on hardest, so it gets parsed properly rather than dumped.
  const essayPath = join(root, "content/2026-08-09-the-return-equation.md");
  const essay = read(essayPath);
  if (essay) {
    const title = /\*\*Title:\*\*\s*(.+)/.exec(essay)?.[1]?.trim() ?? "The Return Equation";
    const subtitle = /\*\*Subtitle:\*\*\s*(.+)/.exec(essay)?.[1]?.trim();
    const body = essay.split(/\n---\n---\n/)[1] ?? essay;

    // Split on the essay's own H2s so each framework is separately citable.
    const parts = splitByHeading(body, 2);
    const intro = body.split(/\n##\s/)[0].trim();
    add({
      id: "ebc-return-equation",
      title,
      source: "Everything But College",
      url: "https://ianroyz.substack.com",
      date: "2026-08-09",
      kind: "essay",
      pull: subtitle ?? "An app doesn't create a habit. It attaches to one.",
      body: intro.length > 200 ? intro : body,
      seedTags: {
        job: ["validate", "pick-customer", "find-wedge"],
        topic: ["market", "idea", "wedge", "examples"],
        audience: ["freelancer", "agency-owner", "first-time-founder"],
        framework: ["return-equation"],
        example: ["insurance-broker-app"],
        outcome: ["turned-down-work"],
      },
    });

    for (const part of parts) {
      const slug = slugify(part.heading);
      if (!slug) continue;
      add({
        id: `ebc-return-equation-${slug}`,
        title: `${part.heading}`,
        source: "Everything But College",
        url: "https://ianroyz.substack.com",
        date: "2026-08-09",
        kind: "essay",
        body: part.body,
        seedTags: { topic: ["market", "idea"], job: ["validate"] },
      });
    }
  } else {
    warnings.push(`missing source: ${essayPath}`);
  }

  // Six Field Notes essays + the Ledger template.
  const postsDir = join(root, "content/2026-07-22-30day-pack/posts");
  if (existsSync(postsDir)) {
    for (const file of readdirSync(postsDir).filter((name) => name.endsWith(".md")).sort()) {
      const raw = read(join(postsDir, file));
      if (!raw) continue;
      const title = /^#\s*(.+)/m.exec(raw)?.[1]?.trim() ?? file.replace(/\.md$/, "");
      const isLedger = /ledger/i.test(file);
      const body = raw
        .replace(/^#.*$/m, "")
        .replace(/^\*Section:[^\n]*\*$/m, "")
        .replace(/\n---\n\*[^*]*\*\s*$/m, "")
        .trim();
      add({
        id: `ebc-${file.replace(/\.md$/, "")}`,
        title,
        source: "Everything But College",
        url: "https://ianroyz.substack.com",
        date: "2026-07-22",
        kind: isLedger ? "ledger" : "essay",
        pull: firstStrongLine(body),
        body,
        seedTags: isLedger
          ? { framework: ["ledger-transparency"], topic: ["pricing", "examples"], job: ["price-offer"] }
          : {},
      });
    }
  } else {
    warnings.push(`missing source: ${postsDir}`);
  }

  // The compiled 30-day timeline — split per week so a plan can cite the
  // specific week that matches where a reader actually is.
  const timeline = read(join(root, "content/2026-07-22-30day-pack/01-timeline-30-days.md"));
  if (timeline) {
    for (const part of splitByHeading(timeline, 2)) {
      const slug = slugify(part.heading);
      if (!slug) continue;
      add({
        id: `ebc-timeline-${slug}`,
        title: part.heading,
        source: "Everything But College",
        date: "2026-07-22",
        kind: "timeline",
        body: part.body,
        seedTags: {
          job: ["ship-fast", "keep-going"],
          topic: ["mvp", "examples"],
          audience: ["student", "solo-builder"],
        },
      });
    }
  }

  // The money plan: cadence, ladder, voice rules.
  const moneyPlan = read(join(root, "content/2026-07-22-30day-pack/00-README-money-plan.md"));
  if (moneyPlan) {
    for (const part of splitByHeading(moneyPlan, 2)) {
      const slug = slugify(part.heading);
      if (!slug || slug === "what-s-in-here") continue;
      add({
        id: `ebc-plan-${slug}`,
        title: part.heading,
        source: "Everything But College",
        date: "2026-07-22",
        kind: "doctrine",
        body: part.body,
        seedTags: /ladder/i.test(part.heading)
          ? {
              job: ["price-offer", "build-audience"],
              topic: ["pricing", "community"],
              framework: ["money-ladder"],
            }
          : { job: ["build-audience"], topic: ["community"], framework: ["notes-engine"] },
      });
    }
  }

  // The 28-note bank. Each note is its own record: they're the shortest,
  // sharpest units in the archive and they cite beautifully.
  const notes = read(join(root, "content/2026-07-22-30day-pack/notes-bank.md"));
  if (notes) {
    let category = "";
    for (const line of notes.split("\n")) {
      const heading = /^##\s+(.+)/.exec(line);
      if (heading) {
        category = heading[1].replace(/\s*\(.*\)\s*$/, "").trim();
        continue;
      }
      const note = /^(\d{1,2})\.\s+(.+)/.exec(line.trim());
      if (!note || /^How to use/i.test(category)) continue;
      const [, number, text] = note;
      add({
        id: `ebc-note-${number.padStart(2, "0")}`,
        title: truncateWords(text, 11),
        source: "Everything But College",
        url: "https://ianroyz.substack.com",
        date: "2026-07-22",
        kind: "note",
        pull: text,
        body: `${text}\n\nFrom the Notes bank, category: ${category}. Notes are the discovery engine — story notes recruit subscribers, tip notes only get likes.`,
        seedTags: { job: ["build-audience"], topic: ["distribution"], framework: ["notes-engine"] },
      });
    }
  }

  // The publication brief. Only the sections that are actually archive
  // material — the personal-details and internal-links sections are skipped
  // at extraction time rather than published and redacted.
  const brief = read(join(root, "PROJECT-BRIEF.md"));
  if (brief) {
    const keep = /publication|sections|strategy|stealth|how i want/i;
    // "Who I am" is biography, "Reference docs" is internal links, and
    // "Current state" is a stale to-do list. None are archive material.
    const skip = /reference docs|who i am|current state/i;
    for (const part of splitByHeading(brief, 2)) {
      if (!keep.test(part.heading) || skip.test(part.heading)) continue;
      add({
        id: `ebc-brief-${slugify(part.heading)}`,
        title: `${part.heading} — Everything But College`,
        source: "Everything But College",
        date: "2026-07-13",
        kind: "doctrine",
        body: part.body,
        // Publication mechanics are audience-building. Only the stealth rule
        // is a distribution doctrine, so only it gets that job tag — otherwise
        // these five items crowd out the outreach material for everybody.
        seedTags: /stealth/i.test(part.heading)
          ? {
              job: ["build-audience", "get-distribution"],
              topic: ["distribution", "community"],
              framework: ["stealth-launch"],
            }
          : { job: ["build-audience"], topic: ["community"], framework: ["notes-engine"] },
      });
    }
  }

  noteSource(
    "everything-but-college",
    "Everything But College",
    "~/Developer/everything-but-college — drafts, the compiled 30-day timeline, and the notes bank",
    "https://ianroyz.substack.com",
    start,
  );
}

/* --------------------------------------------- 2. Substack, published */

async function ingestSubstack() {
  const start = items.length;
  if (NO_NET) {
    warnings.push("skipped Substack fetch (--no-net)");
    return;
  }
  let posts = [];
  try {
    const response = await fetch(SRC.substackApi, {
      headers: { "user-agent": "comeup-archive-extractor" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    posts = await response.json();
  } catch (error) {
    warnings.push(`Substack archive unreachable (${error.message}) — continuing without it`);
    return;
  }

  for (const post of Array.isArray(posts) ? posts : []) {
    if (!post?.title) continue;
    const paywalled = post.audience && post.audience !== "everyone";
    add({
      id: `sub-${post.slug ?? slugify(post.title)}`,
      title: post.title,
      source: "Everything But College (published)",
      url: post.canonical_url,
      date: String(post.post_date ?? "").slice(0, 10),
      kind: "post",
      pull: post.subtitle ?? undefined,
      body: [
        post.subtitle ?? "",
        "",
        paywalled
          ? "Published on the Substack and paywalled, so the archive holds the title, the subtitle and the link rather than the text. Cited here when the plan needs the piece itself, not a summary of it."
          : "Published on the Substack. Cited here with a link to the full piece.",
      ]
        .join("\n")
        .trim(),
      seedTags: { job: ["build-audience"], topic: ["examples"], audience: ["solo-builder"] },
    });
  }

  noteSource(
    "substack-live",
    "Substack, published",
    "ianroyz.substack.com public archive API, fetched at build time",
    "https://ianroyz.substack.com/archive",
    start,
  );
}

/* ------------------------------------------------ 3. The vlog doctrine */

function ingestVlog() {
  const start = items.length;
  const raw = read(SRC.vlog);
  if (!raw) {
    warnings.push(`missing source: ${SRC.vlog}`);
    return;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    warnings.push(`could not parse vlog.json: ${error.message}`);
    return;
  }

  if (data.thesis && data.lens) {
    add({
      id: "vlog-thesis",
      title: "The reframe: a personal channel is a growth channel or it isn't worth shooting",
      source: "The Channel",
      date: data.reframedOn,
      kind: "doctrine",
      pull: data.thesis,
      body: `${data.thesis}\n\nOld lens: ${data.lens.old}\n\nNew lens: ${data.lens.new}\n\nWhy: ${data.lens.why}`,
      seedTags: {
        job: ["build-audience", "get-distribution", "find-wedge"],
        topic: ["distribution", "community", "moat"],
        audience: ["creator", "agency-owner", "solo-builder"],
        framework: ["proof-process-position"],
      },
    });
  }

  for (const layer of data.layers ?? []) {
    add({
      id: `vlog-layer-${layer.key}`,
      title: `${layer.name} — the ${String(layer.does).toLowerCase()}`,
      source: "The Channel",
      date: data.reframedOn,
      kind: "doctrine",
      pull: layer.why,
      body: `${layer.what}\n\nWhy it works: ${layer.why}\n\nWhat feeds it: ${layer.sources}`,
      seedTags: {
        job: ["build-audience", "get-distribution"],
        topic: ["distribution", "community", "moat"],
        audience: ["creator", "solo-builder"],
        framework: ["proof-process-position"],
      },
    });
  }

  (data.rules ?? []).forEach((rule, index) => {
    add({
      id: `vlog-rule-${index + 1}`,
      title: rule.rule,
      source: "The Channel",
      date: data.reframedOn,
      kind: "doctrine",
      pull: rule.rule,
      body: rule.detail,
      seedTags: {
        job: ["build-audience", "get-distribution"],
        topic: ["distribution", "community"],
        audience: ["creator", "solo-builder"],
        framework: ["proof-process-position"],
      },
    });
  });

  if (Array.isArray(data.funnel) && data.funnel.length) {
    add({
      id: "vlog-funnel",
      title: "Three assets, one funnel: what each property is actually for",
      source: "The Channel",
      date: data.reframedOn,
      kind: "doctrine",
      pull: "Every piece of content points at exactly one of them. Disconnected assets don't compound.",
      body: data.funnel
        .map((entry) => `${entry.name} — ${entry.role} Call to action: "${entry.cta}"`)
        .join("\n\n"),
      seedTags: {
        job: ["get-distribution", "build-audience"],
        topic: ["distribution", "community"],
        audience: ["creator", "agency-owner"],
        framework: ["money-ladder"],
      },
    });
  }

  for (const idea of data.ideas ?? []) {
    add({
      id: `vlog-idea-${idea.id}`,
      title: idea.title,
      source: "The Channel",
      date: idea.added,
      kind: "episode-idea",
      pull: `${String(idea.layer).toUpperCase()} layer · points at ${idea.cta}`,
      body: idea.body,
      seedTags: {
        job: ["build-audience"],
        topic: ["distribution", "examples"],
        audience: ["creator", "solo-builder"],
      },
    });
  }

  noteSource(
    "the-channel",
    "The Channel",
    "~/Developer/omega/data/vlog.json — the doctrine file for the vlog as a growth channel",
    undefined,
    start,
  );
}

/* ------------------------------------------------------- 4. The ledger */

function ingestLedger() {
  const start = items.length;
  const raw = read(SRC.business);
  if (!raw) {
    warnings.push(`missing source: ${SRC.business}`);
    return;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    warnings.push(`could not parse business.json: ${error.message}`);
    return;
  }
  const ledger = data.ledger;
  if (!ledger) return;

  const retainers = (data.retainers ?? []).filter((entry) => entry.status === "active");
  add({
    id: "ledger-current",
    title: "The live ledger, as of the last time money actually moved",
    source: "Ledger",
    date: ledger.asOf,
    kind: "ledger",
    derived: true,
    derivedFrom: "Ian's hand-maintained revenue ledger",
    pull: `$${ledger.collected.toLocaleString()} collected · $${ledger.mrr.toLocaleString()}/mo recurring · ${retainers.length} active retainer${retainers.length === 1 ? "" : "s"}.`,
    body: `Collected to date: $${ledger.collected.toLocaleString()}. Recurring: $${ledger.mrr.toLocaleString()} per month across ${retainers.length} active retainer${retainers.length === 1 ? "" : "s"}. As of ${ledger.asOf}.\n\nThis file has one rule written at the top of it: never put an estimated number here. Nothing that hasn't cleared appears in it. Proposals sitting with a client, verbal yeses, and pipeline all live somewhere else, because the moment a maybe gets into the revenue column you start spending against money that doesn't exist.\n\nThe number worth watching isn't the total. It's the recurring line, because that's the one that arrives whether or not you open the laptop.`,
    seedTags: {
      job: ["price-offer", "first-client"],
      topic: ["pricing", "examples"],
      audience: ["solo-builder", "freelancer", "student"],
      framework: ["ledger-transparency", "retainer-stack"],
      outcome: ["first-invoice", "recurring-revenue"],
    },
  });

  noteSource(
    "ledger",
    "Ledger",
    "~/Developer/omega/data/business.json — the hand-maintained revenue record",
    undefined,
    start,
  );
}

/* -------------------------------------------------- 5. The build log */

function ingestBuildLog() {
  const start = items.length;
  const raw = read(SRC.seed);
  if (!raw) {
    warnings.push(`missing source: ${SRC.seed}`);
    return;
  }
  const data = JSON.parse(raw);
  for (const entry of data.items ?? []) {
    add({
      ...entry,
      source: data.source ?? "Build log",
      derived: true,
      derivedFrom: data.derivedFrom ?? "private build record",
    });
  }
  noteSource(
    "build-log",
    "Build log",
    "Distilled from Ian's private build record — roughly 30 shipped apps, an agency, and the numbers behind them. Marked as distilled everywhere it's cited.",
    undefined,
    start,
  );
}

/* ------------------------------------------- optional model enrichment */

async function enrichWithModel() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    warnings.push("--enrich requested but ANTHROPIC_API_KEY is unset — kept the rule-based tags");
    return;
  }
  const vocab = {
    job: ["find-wedge", "pick-customer", "price-offer", "get-distribution", "validate", "first-client", "ship-fast", "stay-broke-proof", "build-audience", "keep-going"],
    topic: ["idea", "market", "wedge", "distribution", "pricing", "mvp", "community", "moat", "examples"],
    audience: ["student", "solo-builder", "creator", "freelancer", "agency-owner", "first-time-founder", "career-switcher"],
  };

  const batches = [];
  for (let index = 0; index < items.length; index += 12) batches.push(items.slice(index, index + 12));

  let enriched = 0;
  for (const batch of batches) {
    const payload = batch.map((item) => ({ id: item.id, title: item.title, excerpt: item.body.slice(0, 700) }));
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(90000),
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 2000,
          system:
            "You tag an archive of startup/builder material. For each item return only tags drawn from the supplied vocabularies. Prefer precision: two right tags beat five plausible ones. Reply with JSON only, shape {\"tags\":[{\"id\":string,\"job\":string[],\"topic\":string[],\"audience\":string[]}]}.",
          messages: [
            {
              role: "user",
              content: `Vocabularies:\n${JSON.stringify(vocab)}\n\nItems:\n${JSON.stringify(payload)}`,
            },
          ],
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const text = (data.content ?? []).map((block) => block.text ?? "").join("");
      const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      for (const tag of parsed.tags ?? []) {
        const item = items.find((candidate) => candidate.id === tag.id);
        if (!item) continue;
        item.modelTags = {
          job: (tag.job ?? []).filter((value) => vocab.job.includes(value)),
          topic: (tag.topic ?? []).filter((value) => vocab.topic.includes(value)),
          audience: (tag.audience ?? []).filter((value) => vocab.audience.includes(value)),
        };
        enriched += 1;
      }
    } catch (error) {
      warnings.push(`enrichment batch failed (${error.message}) — rule tags stand`);
    }
  }
  console.log(`  enriched ${enriched} items with model tags`);
}

/* ------------------------------------------------------------- utilities */

function splitByHeading(markdown, level) {
  const marker = "#".repeat(level);
  const lines = markdown.split("\n");
  const parts = [];
  let current = null;
  for (const line of lines) {
    const match = new RegExp(`^${marker}\\s+(?!#)(.+)`).exec(line);
    if (match) {
      if (current) parts.push(current);
      current = { heading: match[1].replace(/[*_`]/g, "").trim(), body: "" };
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  if (current) parts.push(current);
  return parts
    .map((part) => ({ heading: part.heading, body: part.body.trim() }))
    .filter((part) => part.body.length > 120);
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function truncateWords(text, count) {
  const words = String(text).trim().split(/\s+/);
  const clipped = words.slice(0, count).join(" ").replace(/[.,;:]$/, "");
  return words.length > count ? `${clipped}…` : clipped;
}

function firstStrongLine(body) {
  const bold = /\*\*(.{20,140}?)\*\*/.exec(body);
  if (bold) return bold[1].replace(/\s+/g, " ").trim();
  const sentence = body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 40 && !line.startsWith("#") && !line.startsWith("*"));
  return sentence ? truncateWords(sentence, 24) : undefined;
}

/* ------------------------------------------------------------------ main */

async function main() {
  console.log("Come Up — building the archive\n");

  ingestEverythingButCollege();
  await ingestSubstack();
  ingestVlog();
  ingestLedger();
  ingestBuildLog();

  if (ENRICH) await enrichWithModel();

  const outDir = join(APP, "src/data");
  mkdirSync(outDir, { recursive: true });
  const out = {
    generatedAt: new Date().toISOString(),
    sources: sources.sort((a, b) => b.count - a.count),
    items,
  };
  writeFileSync(join(outDir, "archive.json"), `${JSON.stringify(out, null, 2)}\n`, "utf8");

  for (const source of out.sources) console.log(`  ${String(source.count).padStart(3)}  ${source.label}`);
  console.log(`\n  ${items.length} items → src/data/archive.json`);
  if (warnings.length) {
    console.log("\nWarnings:");
    for (const warning of warnings) console.log(`  - ${warning}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
