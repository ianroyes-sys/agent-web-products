#!/usr/bin/env node
/* Legible — prompt battery runner.
 *
 *   node scripts/battery.mjs "Torch Technologies" --out battery.json
 *
 * With ANTHROPIC_API_KEY set this queries the model and records answers
 * verbatim. Without it, the run is a labeled DRY RUN: prompts are rendered,
 * nothing is sent, and no answer is invented.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runBattery } from "../src/lib/audit/battery.ts";
import { PROMPT_BATTERY } from "../src/lib/audit/prompts.ts";

const HELP = `
Legible — buyer-intent prompt battery (${PROMPT_BATTERY.length} prompts)

  node scripts/battery.mjs "<company>" [options]

Options
  --domain <domain>     Company domain (default: derived from the name)
  --location <place>    Default: Huntsville, Alabama
  --naics <code>        Default: 541330
  --limit <n>           Run only the first n prompts
  --category <name>     discovery | comparison | qualification | risk | commercial
  --out <path>          Write results as JSON
  --help
`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || args._.length === 0) {
  process.stdout.write(HELP);
  process.exit(args.help ? 0 : 1);
}

const company = args._[0];
const vars = {
  company,
  domain: typeof args.domain === "string" ? args.domain : `${company.toLowerCase().replace(/\s+/g, "")}.com`,
  location: typeof args.location === "string" ? args.location : "Huntsville, Alabama",
  naics: typeof args.naics === "string" ? args.naics : "541330",
};

const live = Boolean(process.env.ANTHROPIC_API_KEY);
process.stderr.write(`\nLegible — prompt battery for ${company}\n  mode: ${live ? "LIVE" : "DRY RUN (no ANTHROPIC_API_KEY)"}\n\n`);

const result = await runBattery(vars, {
  limit: args.limit ? Number(args.limit) : undefined,
  categories: typeof args.category === "string" ? [args.category] : undefined,
  onProgress: (done, total, id) => process.stderr.write(`  ${done}/${total} ${id}\n`),
});

for (const note of result.notes) process.stderr.write(`  · ${note}\n`);

if (result.mode === "dry-run") {
  process.stderr.write(`\n  Prompts that would be sent:\n\n`);
  for (const answer of result.answers) {
    process.stderr.write(`  [${answer.promptId}] ${answer.prompt}\n`);
  }
  process.stderr.write("\n");
} else {
  const mentioned = result.answers.filter((a) => a.mentioned).length;
  process.stderr.write(`\n  ${company} mentioned in ${mentioned}/${result.answers.length} answers\n\n`);
}

const json = `${JSON.stringify(result, null, 2)}\n`;
if (typeof args.out === "string") {
  const target = resolve(process.cwd(), args.out);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, json, "utf8");
  process.stderr.write(`  written → ${target}\n\n`);
} else {
  process.stdout.write(json);
}
