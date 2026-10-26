import type { Metadata } from "next";
import Link from "next/link";
import { archiveSources, loadArchive } from "@/lib/archive/ingest";
import { browse, facet, type BrowseFilter } from "@/lib/archive/retrieve";
import { countTags } from "@/lib/archive/tag";
import { AXIS_LABEL, JOB_LABEL, type Job, type TagAxis } from "@/lib/archive/types";
import { ArchiveCard, EmptyState, SectionHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "The archive",
  description:
    "Roughly 100 pieces of one builder's archive, classified across six axes — job, topic, audience, example, framework, outcome. Tag-first retrieval, no vector database.",
};

const FILTER_AXES: TagAxis[] = ["job", "topic", "framework", "audience", "outcome", "example"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value && value.length > 0 ? value : undefined;
}

function hrefWith(current: BrowseFilter, axis: keyof BrowseFilter, value: string | undefined): string {
  const next: Record<string, string> = {};
  for (const [key, existing] of Object.entries(current)) {
    if (existing) next[key] = existing;
  }
  if (value === undefined || next[axis] === value) delete next[axis];
  else next[axis] = value;
  const query = new URLSearchParams(next).toString();
  return query ? `/archive?${query}` : "/archive";
}

export default async function ArchivePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter: BrowseFilter = {
    job: single(params.job),
    topic: single(params.topic),
    audience: single(params.audience),
    framework: single(params.framework),
    outcome: single(params.outcome),
    q: single(params.q),
  };

  const all = loadArchive();
  const results = browse(filter);
  const active = Object.entries(filter).filter(([, value]) => Boolean(value));
  const highlight = active.filter(([key]) => key !== "q").map(([key, value]) => `${key}:${value}`);

  return (
    <div className="wrap pb-20 pt-14 sm:pt-20">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHead
          eyebrow="The refinery"
          title="The archive, with the structure showing"
          lead="One expert's material, normalized into pieces and classified across six axes against closed vocabularies. This page exists so you can check that the tagging is real before you trust anything the plan says."
        />
        <div className="flex shrink-0 gap-3">
          <div className="card px-4 py-3">
            <p className="tabular text-[19px] leading-none">{all.length}</p>
            <p className="mt-1 text-[11.5px]" style={{ color: "var(--color-faint)" }}>
              pieces
            </p>
          </div>
          <div className="card px-4 py-3">
            <p className="tabular text-[19px] leading-none">{countTags(all)}</p>
            <p className="mt-1 text-[11.5px]" style={{ color: "var(--color-faint)" }}>
              tags
            </p>
          </div>
          <div className="card px-4 py-3">
            <p className="tabular text-[19px] leading-none">{archiveSources().length}</p>
            <p className="mt-1 text-[11.5px]" style={{ color: "var(--color-faint)" }}>
              sources
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-8 lg:flex-row">
        {/* ------------------------------------------------- filter rails */}
        <aside className="lg:w-64 lg:shrink-0">
          <form action="/archive" className="mb-7">
            <label className="label" htmlFor="q">
              Search text
            </label>
            <input
              id="q"
              name="q"
              defaultValue={filter.q ?? ""}
              placeholder="pricing, cold email, retention…"
              className="field !py-2.5 text-[14px]"
            />
            {FILTER_AXES.map((axis) =>
              filter[axis] ? <input key={axis} type="hidden" name={axis} value={filter[axis]} /> : null,
            )}
          </form>

          {active.length > 0 ? (
            <div className="mb-7">
              <p className="eyebrow mb-3">Active filters</p>
              <div className="flex flex-wrap gap-1.5">
                {active.map(([key, value]) => (
                  <Link key={key} href={hrefWith(filter, key as keyof BrowseFilter, undefined)} className="tag tag-on">
                    {key}:{value} ×
                  </Link>
                ))}
                <Link href="/archive" className="tag">
                  clear all
                </Link>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-7">
            {FILTER_AXES.map((axis) => {
              const values = facet(axis);
              if (values.length === 0) return null;
              return (
                <div key={axis}>
                  <p className="eyebrow mb-3">{AXIS_LABEL[axis]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {values.slice(0, axis === "example" ? 10 : 12).map((entry) => {
                      const on = filter[axis as keyof BrowseFilter] === entry.value;
                      return (
                        <Link
                          key={entry.value}
                          href={hrefWith(filter, axis as keyof BrowseFilter, entry.value)}
                          className={`tag transition-colors hover:border-[var(--accent-line)] ${on ? "tag-on" : ""}`}
                        >
                          {axis === "job" ? JOB_LABEL[entry.value as Job] ?? entry.value : entry.value}
                          <span className="tabular" style={{ color: "var(--color-faint)" }}>
                            {entry.count}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ------------------------------------------------------ results */}
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-baseline justify-between">
            <p className="text-[13.5px]" style={{ color: "var(--color-muted)" }}>
              <span className="tabular" style={{ color: "var(--color-chalk)" }}>
                {results.length}
              </span>{" "}
              {results.length === 1 ? "piece" : "pieces"}
              {active.length > 0 ? " matching" : " in the archive"}
            </p>
            {active.length > 0 ? (
              <Link href="/archive" className="text-[13px] transition-colors hover:text-[var(--accent)]" style={{ color: "var(--color-faint)" }}>
                Reset
              </Link>
            ) : null}
          </div>

          {results.length === 0 ? (
            <EmptyState
              title="Nothing matches that combination"
              body="Filters are ANDed across axes, so it's easy to ask for something the archive doesn't hold. Drop one filter and try again."
              action={
                <Link href="/archive" className="btn btn-ghost">
                  Clear filters
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((item) => (
                <ArchiveCard key={item.id} item={item} highlight={highlight} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-16">
        <p className="eyebrow mb-4">Where it came from</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {archiveSources().map((source) => (
            <div key={source.id} className="card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[15px] font-medium" style={{ color: "var(--color-chalk)" }}>
                  {source.label}
                </p>
                <span className="tabular text-[13px]" style={{ color: "var(--accent)" }}>
                  {source.count}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {source.origin}
              </p>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer" className="link-underline mt-3 inline-block text-[13px]">
                  Visit source
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
