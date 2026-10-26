#!/usr/bin/env node
/* Legible — audit CLI.
 *
 *   node scripts/audit.mjs torchtechnologies.com --out samples/torch.json
 *
 * The engine is TypeScript. Node 22.18+/24 strips types on import, so there
 * is no build step between the terminal and the same code the site runs.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runAudit } from "../src/lib/audit/run.ts";
import { runBattery } from "../src/lib/audit/battery.ts";

const HELP = `
Legible — agent readiness audit

  node scripts/audit.mjs <domain> [options]

Options
  --out <path>        Write the report JSON to a file
  --company <name>    Override the detected company name
  --location <place>  Market context for GovCon checks (default: Huntsville, Alabama)
  --naics <code>      NAICS code used in the prompt battery (default: 541330)
  --battery           Also run the buyer-intent prompt battery
  --battery-limit <n> Cap the battery at n prompts
  --timeout <ms>      Per-request timeout (default: 12000)
  --quiet             Suppress progress output
  --help              Show this

Without ANTHROPIC_API_KEY, --battery runs in labeled DRY RUN mode and
queries nothing.
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
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
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

const domain = args._[0];
const quiet = Boolean(args.quiet);
const log = (message) => {
  if (!quiet) process.stderr.write(`  ${message}\n`);
};

const bar = (score) => {
  const filled = Math.round(score / 5);
  return `${"█".repeat(filled)}${"·".repeat(20 - filled)}`;
};

if (!quiet) process.stderr.write(`\nLegible — auditing ${domain}\n\n`);

const report = await runAudit(domain, {
  company: typeof args.company === "string" ? args.company : undefined,
  location: typeof args.location === "string" ? args.location : undefined,
  timeoutMs: args.timeout ? Number(args.timeout) : undefined,
  onProgress: log,
});

if (args.battery) {
  const limit = args["battery-limit"] ? Number(args["battery-limit"]) : undefined;
  log(process.env.ANTHROPIC_API_KEY ? "running prompt battery (live)" : "rendering prompt battery (dry run)");
  report.battery = await runBattery(
    {
      company: report.company,
      location: report.location,
      naics: typeof args.naics === "string" ? args.naics : "541330",
      domain: report.domain,
    },
    {
      limit,
      onProgress: (done, total, id) => log(`battery ${done}/${total} (${id})`),
    },
  );
}

if (!quiet) {
  const out = process.stderr;
  out.write(`\n  ${report.company} — ${report.siteUrl}\n`);
  out.write(`  Legibility score: ${report.score} (${report.grade})\n\n`);
  for (const dimension of report.dimensions) {
    out.write(`  ${dimension.label.padEnd(14)} ${String(dimension.score).padStart(3)}  ${bar(dimension.score)}\n`);
  }
  out.write(`  ${"GovCon".padEnd(14)} ${String(report.govcon.score).padStart(3)}  ${bar(report.govcon.score)}\n`);
  out.write(`\n  Fog: ${report.fog.per1k} stock phrases per 1,000 words across ${report.fog.words} words\n`);
  if (report.fog.worstSentence) out.write(`  Foggiest: "${report.fog.worstSentence.slice(0, 160)}"\n`);
  out.write(`\n  Missing hard filters: ${report.govcon.signals.filter((s) => !s.found && s.weight === "critical").map((s) => s.label).join(", ") || "none"}\n`);
  out.write(`  Top fixes:\n`);
  for (const fix of report.fixes.slice(0, 5)) {
    out.write(`    · [impact ${fix.impact}/5, ${fix.effort}] ${fix.title}\n`);
  }
  if (report.battery) {
    out.write(`\n  Battery: ${report.battery.mode.toUpperCase()} — ${report.battery.promptCount} prompts\n`);
  }
  out.write(`\n  ${report.pages.filter((p) => p.ok).length}/${report.pages.length} probed paths returned content in ${(report.durationMs / 1000).toFixed(1)}s\n\n`);
}

const json = `${JSON.stringify(report, null, 2)}\n`;

if (typeof args.out === "string") {
  const target = resolve(process.cwd(), args.out);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, json, "utf8");
  if (!quiet) process.stderr.write(`  written → ${target}\n\n`);
} else {
  process.stdout.write(json);
}
