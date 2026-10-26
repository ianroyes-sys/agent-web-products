/* A small, dependency-free HTML reader.

   This is intentionally not a DOM. It extracts the handful of things that
   determine whether a machine can understand a page: structured data,
   heading skeleton, visible text, links, and whether the markup carries
   any meaning at all. Regexes are the right tool here because we are
   grading surface signals, not rendering. */

export interface Heading {
  level: number;
  text: string;
}

export interface Link {
  href: string;
  text: string;
}

export interface ParsedHtml {
  title: string;
  lang: string;
  metaDescription: string;
  metaRobots: string;
  headings: Heading[];
  /** Visible text, whitespace-collapsed. */
  text: string;
  /** Parsed JSON-LD blocks. Invalid JSON is counted but not returned. */
  jsonLd: Record<string, unknown>[];
  jsonLdBlocks: number;
  jsonLdInvalid: number;
  microdataTypes: string[];
  links: Link[];
  images: { src: string; alt: string }[];
  tables: number;
  lists: number;
  semantic: {
    main: boolean;
    nav: boolean;
    header: boolean;
    footer: boolean;
    article: boolean;
    section: boolean;
    address: boolean;
  };
  /** Rough signal for a JS-only shell: lots of markup, almost no text. */
  textRatio: number;
}

const BLOCK_TAGS =
  "address|article|aside|blockquote|br|div|dd|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul";

export function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function collapse(input: string): string {
  return input.replace(/[ \t\r\f\v]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

function attr(tag: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  if (!match) return "";
  return decodeEntities(match[2] ?? match[3] ?? match[4] ?? "").trim();
}

export function stripTags(html: string): string {
  const withoutNoise = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ");

  // Preserve block boundaries so sentences from adjacent elements do not fuse.
  const spaced = withoutNoise
    .replace(new RegExp(`</?(?:${BLOCK_TAGS})\\b[^>]*>`, "gi"), "\n")
    .replace(/<[^>]+>/g, " ");

  return collapse(decodeEntities(spaced));
}

export function parseHtml(html: string): ParsedHtml {
  const title = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").trim();
  const htmlTag = /<html\b[^>]*>/i.exec(html)?.[0] ?? "";
  const lang = attr(htmlTag, "lang");

  let metaDescription = "";
  let metaRobots = "";
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = attr(tag, "name").toLowerCase() || attr(tag, "property").toLowerCase();
    if (name === "description" && !metaDescription) metaDescription = attr(tag, "content");
    if (name === "robots" && !metaRobots) metaRobots = attr(tag, "content");
  }

  const headings: Heading[] = [];
  for (const match of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = stripTags(match[2]);
    if (text) headings.push({ level: Number(match[1]), text });
  }

  const jsonLd: Record<string, unknown>[] = [];
  let jsonLdBlocks = 0;
  let jsonLdInvalid = 0;
  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    jsonLdBlocks += 1;
    try {
      const parsed: unknown = JSON.parse(decodeEntities(match[1].trim()));
      const flat = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of flat) {
        if (node && typeof node === "object") jsonLd.push(node as Record<string, unknown>);
      }
    } catch {
      jsonLdInvalid += 1;
    }
  }

  const microdataTypes: string[] = [];
  for (const match of html.matchAll(/itemtype\s*=\s*["']([^"']+)["']/gi)) {
    const type = match[1].split("/").pop();
    if (type && !microdataTypes.includes(type)) microdataTypes.push(type);
  }

  const links: Link[] = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attr(`<a ${match[1]}>`, "href");
    if (!href) continue;
    links.push({ href, text: stripTags(match[2]).slice(0, 120) });
  }

  const images: { src: string; alt: string }[] = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    images.push({ src: attr(match[0], "src"), alt: attr(match[0], "alt") });
  }

  const text = stripTags(html);
  const semantic = {
    main: /<main\b/i.test(html),
    nav: /<nav\b/i.test(html),
    header: /<header\b/i.test(html),
    footer: /<footer\b/i.test(html),
    article: /<article\b/i.test(html),
    section: /<section\b/i.test(html),
    address: /<address\b/i.test(html),
  };

  return {
    title,
    lang,
    metaDescription,
    metaRobots,
    headings,
    text,
    jsonLd,
    jsonLdBlocks,
    jsonLdInvalid,
    microdataTypes,
    links,
    images,
    tables: (html.match(/<table\b/gi) ?? []).length,
    lists: (html.match(/<[uo]l\b/gi) ?? []).length,
    semantic,
    textRatio: html.length > 0 ? text.length / html.length : 0,
  };
}

/** Every `@type` present anywhere in the JSON-LD graph, flattened. */
export function jsonLdTypes(nodes: readonly Record<string, unknown>[]): string[] {
  const types = new Set<string>();

  const walk = (node: unknown, depth: number): void => {
    if (depth > 6 || !node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child, depth + 1);
      return;
    }
    const record = node as Record<string, unknown>;
    const raw = record["@type"];
    if (typeof raw === "string") types.add(raw);
    if (Array.isArray(raw)) for (const t of raw) if (typeof t === "string") types.add(t);
    for (const value of Object.values(record)) {
      if (value && typeof value === "object") walk(value, depth + 1);
    }
  };

  for (const node of nodes) walk(node, 0);
  return [...types];
}

/** Escape a literal string for use inside a RegExp. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 400);
}

export function wordCount(text: string): number {
  const matches = text.match(/[A-Za-z0-9'’-]+/g);
  return matches ? matches.length : 0;
}

/** Pull a short verbatim excerpt around a match, for quoting in the report. */
export function excerpt(text: string, needle: RegExp, radius = 90): string | undefined {
  const match = needle.exec(text);
  if (!match) return undefined;
  const start = Math.max(0, match.index - radius);
  const end = Math.min(text.length, match.index + match[0].length + radius);
  const slice = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`;
}
