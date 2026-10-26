/**
 * Ingest — normalize whatever the extractor produced into typed ArchiveItems.
 *
 * The split is deliberate: `scripts/build-archive.mjs` does the Node-only work
 * (reading Ian's machine, hitting the Substack public API) and writes a raw
 * file; this module owns normalization, validation and tagging, so the exact
 * same structure is what the pages, the JSON API and the MCP tools all see.
 *
 * The raw file is committed, so the app builds and deploys with no filesystem
 * access, no network and no database.
 */

import rawArchive from "@/data/archive.json";
import { tagAll } from "./tag";
import {
  type ArchiveItem,
  type ArchiveKind,
  type ArchiveSource,
  type RawArchiveFile,
  type RawArchiveRecord,
} from "./types";

const KINDS: ReadonlySet<string> = new Set<ArchiveKind>([
  "essay",
  "post",
  "note",
  "ledger",
  "timeline",
  "doctrine",
  "episode-idea",
  "lesson",
  "positioning",
]);

/** Bodies are for grounding a plan, not for reprinting a paywalled essay. */
const MAX_BODY = 9000;

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
}

function normalizeRecord(input: RawArchiveRecord, index: number): RawArchiveRecord | null {
  const id = clean(input.id) || `item-${index}`;
  const title = clean(input.title);
  const body = clean(input.body);
  if (!title || !body) return null;

  return {
    ...input,
    id,
    title,
    body: body.length > MAX_BODY ? `${body.slice(0, MAX_BODY).trimEnd()}…` : body,
    source: clean(input.source) || "unknown",
    kind: KINDS.has(input.kind) ? input.kind : "lesson",
    pull: clean(input.pull) || undefined,
    url: clean(input.url) || undefined,
    date: clean(input.date) || undefined,
  };
}

export function normalize(file: RawArchiveFile): ArchiveItem[] {
  const seen = new Set<string>();
  const records: RawArchiveRecord[] = [];

  file.items.forEach((item, index) => {
    const record = normalizeRecord(item, index);
    if (!record || seen.has(record.id)) return;
    seen.add(record.id);
    records.push(record);
  });

  return tagAll(records);
}

const file = rawArchive as unknown as RawArchiveFile;

let cache: ArchiveItem[] | null = null;

/** Every tagged item. Computed once per process. */
export function loadArchive(): ArchiveItem[] {
  if (!cache) cache = normalize(file);
  return cache;
}

export function getItem(id: string): ArchiveItem | undefined {
  return loadArchive().find((item) => item.id === id);
}

export function archiveSources(): ArchiveSource[] {
  return file.sources ?? [];
}

export function archiveGeneratedAt(): string {
  return file.generatedAt;
}
