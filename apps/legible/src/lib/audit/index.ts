/* Public surface of the audit engine. Import from here, not from files. */

export * from "./types.ts";
export { runAudit, reportId } from "./run.ts";
export { crawl, AuditContext, STANDARD_PATHS, MACHINE_FILES } from "./crawl.ts";
export { fogIndex, FOG_PHRASES } from "./fog.ts";
export { grade } from "./scorer.ts";
export { DIMENSION_WEIGHTS, GOVCON_WEIGHT } from "./dimensions.ts";
export { GOVCON_SIGNALS, scoreGovCon } from "./govcon.ts";
export { AI_AGENTS, parseRobots, posture } from "./robots.ts";
export { PROMPT_BATTERY, BATTERY_SIZE, renderPrompt, renderWinsIf, type PromptVars } from "./prompts.ts";
export { runBattery, BATTERY_MODEL, DRY_RUN_MARKER, type BatteryOptions } from "./battery.ts";
export { buildFixes, buildAgentView } from "./fixes.ts";
