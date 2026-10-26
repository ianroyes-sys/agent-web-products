/* robots.txt, read the way an AI crawler reads it.

   The four agents below are the ones that decide whether a company shows
   up inside an answer. Blocking them is a legitimate business choice —
   but most firms that block them never made a choice at all, they
   inherited a default from a CDN or a plugin. Naming that is half the
   value of the audit. */

export type Posture = "allowed" | "blocked" | "unspecified" | "no-robots";

export interface AgentPosture {
  agent: string;
  posture: Posture;
  /** The literal directive line responsible for the verdict. */
  line?: string;
}

export interface RobotsFile {
  present: boolean;
  groups: Map<string, { allow: string[]; disallow: string[]; lines: string[] }>;
  sitemaps: string[];
  /** Cloudflare-style Content-Signal directives, e.g. `ai-train=no`. */
  contentSignals: Record<string, string>;
  raw: string;
}

export const AI_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
] as const;

export function parseRobots(raw: string): RobotsFile {
  const groups = new Map<string, { allow: string[]; disallow: string[]; lines: string[] }>();
  const sitemaps: string[] = [];
  const contentSignals: Record<string, string> = {};

  let current: string[] = [];
  let sawDirective = false;

  for (const rawLine of raw.split(/\r?\n/)) {
    const commentBody = /^\s*#(.*)$/.exec(rawLine)?.[1];
    if (commentBody !== undefined) {
      // Content-Signal lives in comments by design.
      for (const match of commentBody.matchAll(/([a-z-]+)\s*=\s*(yes|no)/gi)) {
        contentSignals[match[1].toLowerCase()] = match[2].toLowerCase();
      }
      continue;
    }

    const line = rawLine.trim();
    if (!line) continue;
    const [rawField, ...rest] = line.split(":");
    const field = rawField.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (field === "user-agent") {
      if (sawDirective) {
        current = [];
        sawDirective = false;
      }
      const agent = value.toLowerCase();
      current.push(agent);
      if (!groups.has(agent)) groups.set(agent, { allow: [], disallow: [], lines: [] });
      continue;
    }

    if (field === "sitemap") {
      sitemaps.push(value);
      continue;
    }

    if (field === "content-signal") {
      for (const match of value.matchAll(/([a-z-]+)\s*=\s*(yes|no)/gi)) {
        contentSignals[match[1].toLowerCase()] = match[2].toLowerCase();
      }
      continue;
    }

    if (field === "allow" || field === "disallow") {
      sawDirective = true;
      for (const agent of current) {
        const group = groups.get(agent);
        if (!group) continue;
        if (field === "allow") group.allow.push(value);
        else group.disallow.push(value);
        group.lines.push(line);
      }
    }
  }

  return { present: raw.trim().length > 0, groups, sitemaps, contentSignals, raw };
}

export function posture(robots: RobotsFile, agent: string): AgentPosture {
  if (!robots.present) return { agent, posture: "no-robots" };

  const named = robots.groups.get(agent.toLowerCase());
  if (named) {
    const blocked = named.disallow.some((rule) => rule === "/" || rule === "");
    const blockingLine = named.lines.find((l) => /disallow:\s*\/?\s*$/i.test(l));
    if (blocked && !named.allow.includes("/")) {
      return { agent, posture: "blocked", line: blockingLine ?? `User-agent: ${agent} → Disallow: /` };
    }
    return { agent, posture: "allowed", line: `User-agent: ${agent} (named, not blocked)` };
  }

  const wildcard = robots.groups.get("*");
  if (wildcard) {
    const blocked = wildcard.disallow.includes("/");
    if (blocked) {
      return { agent, posture: "blocked", line: "User-agent: * → Disallow: /" };
    }
  }

  return { agent, posture: "unspecified" };
}
