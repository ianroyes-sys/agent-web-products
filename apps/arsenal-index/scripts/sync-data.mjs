#!/usr/bin/env node
/**
 * Copies the refinery output into the app so the bundle is self-contained
 * and deployable to Vercel without the parent repo's data directory.
 *
 * Source of truth stays in ../../data/out — this only ever reads it.
 */
import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const APP = resolve(here, "..");
const SRC = resolve(APP, "../../data/out");
const DEST = join(APP, "src/data");

const REQUIRED = "index.json";

async function main() {
  if (!existsSync(SRC)) {
    // A previously synced copy is good enough to build from — the refinery
    // does not have to be present on a deploy machine.
    if (existsSync(join(DEST, REQUIRED))) {
      console.log(`[sync-data] no refinery at ${SRC}; using existing src/data`);
      return;
    }
    console.error(`[sync-data] FATAL: no data at ${SRC} and no cached copy at ${DEST}`);
    process.exit(1);
  }

  await mkdir(DEST, { recursive: true });

  const files = (await readdir(SRC)).filter((f) => f.endsWith(".json"));
  if (!files.includes(REQUIRED)) {
    console.error(`[sync-data] FATAL: ${REQUIRED} missing from ${SRC}`);
    process.exit(1);
  }

  let bytes = 0;
  for (const f of files) {
    await cp(join(SRC, f), join(DEST, f));
    bytes += (await stat(join(DEST, f))).size;
  }

  const meta = JSON.parse(await readFile(join(DEST, REQUIRED), "utf8")).meta;
  await writeFile(
    join(DEST, "SYNCED.txt"),
    `synced_at=${new Date().toISOString()}\ngenerated=${meta.generated}\nfirms=${meta.firm_count}\nrecompetes=${meta.recompete_count}\n`,
    "utf8",
  );

  console.log(
    `[sync-data] ${files.length} files, ${(bytes / 1e6).toFixed(1)} MB — generated ${meta.generated}, ` +
      `${meta.firm_count} firms, ${meta.recompete_count} recompetes`,
  );
}

main().catch((err) => {
  console.error("[sync-data] FATAL", err);
  process.exit(1);
});
