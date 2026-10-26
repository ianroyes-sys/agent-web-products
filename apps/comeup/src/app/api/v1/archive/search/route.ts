import { archiveGeneratedAt, loadArchive } from "@/lib/archive/ingest";
import { retrieve, browse } from "@/lib/archive/retrieve";
import type { Audience, Job, Topic } from "@/lib/archive/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchArgs {
  job?: string;
  topics?: string[];
  audience?: string[];
  text?: string;
  limit?: number;
}

function run(args: SearchArgs) {
  const limit = Number.isFinite(Number(args.limit)) ? Math.min(25, Math.max(1, Number(args.limit))) : 8;

  const hits = retrieve({
    job: args.job as Job | undefined,
    topics: args.topics as Topic[] | undefined,
    audience: args.audience as Audience[] | undefined,
    text: args.text,
    limit,
  });

  const results = hits.length
    ? hits.map((hit) => ({
        id: hit.item.id,
        title: hit.item.title,
        source: hit.item.source,
        url: hit.item.url,
        date: hit.item.date,
        kind: hit.item.kind,
        distilled: Boolean(hit.item.derived),
        pull: hit.item.pull,
        tags: hit.item.tags,
        matchedOn: hit.matchedOn,
        tagScore: hit.tagScore,
        textScore: hit.textScore,
        excerpt: hit.item.body.slice(0, 1200),
      }))
    : browse({ q: args.text }).slice(0, limit).map((item) => ({
        id: item.id,
        title: item.title,
        source: item.source,
        url: item.url,
        date: item.date,
        kind: item.kind,
        distilled: Boolean(item.derived),
        pull: item.pull,
        tags: item.tags,
        matchedOn: ["text-only"],
        tagScore: 0,
        textScore: 0,
        excerpt: item.body.slice(0, 1200),
      }));

  return {
    query: { job: args.job, topics: args.topics, audience: args.audience, text: args.text, limit },
    retrieval: "tag-first — tags select, text only breaks ties",
    archive: { items: loadArchive().length, compiled: archiveGeneratedAt() },
    count: results.length,
    results,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const list = (key: string) => {
    const values = params.getAll(key).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean);
    return values.length > 0 ? values : undefined;
  };

  return Response.json(
    run({
      job: params.get("job") ?? undefined,
      topics: list("topic") ?? list("topics"),
      audience: list("audience"),
      text: params.get("text") ?? params.get("q") ?? undefined,
      limit: params.get("limit") ? Number(params.get("limit")) : undefined,
    }),
    { headers: { "cache-control": "public, max-age=300" } },
  );
}

export async function POST(request: Request) {
  let body: SearchArgs;
  try {
    body = (await request.json()) as SearchArgs;
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }
  return Response.json(run(body), { headers: { "cache-control": "no-store" } });
}
