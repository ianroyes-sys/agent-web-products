import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem, loadArchive } from "@/lib/archive/ingest";
import { retrieve } from "@/lib/archive/retrieve";
import { AXIS_LABEL, TAG_AXES, type TagAxis } from "@/lib/archive/types";
import { ArchiveCard, DerivedBadge } from "@/components/ui";

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return loadArchive().map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const item = getItem(id);
  if (!item) return { title: "Not in the archive" };
  return {
    title: item.title,
    description: item.pull ?? item.body.slice(0, 155),
  };
}

export default async function ArchiveItemPage({ params }: { params: Params }) {
  const { id } = await params;
  const item = getItem(id);
  if (!item) notFound();

  const related = retrieve({
    job: item.tags.job[0],
    topics: item.tags.topic.slice(0, 2),
    frameworks: item.tags.framework.slice(0, 1),
    exclude: [item.id],
    limit: 3,
  });

  const paragraphs = item.body.split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 0);

  return (
    <div className="wrap pb-20 pt-14 sm:pt-20">
      <Link href="/archive" className="text-[13px] transition-colors hover:text-[var(--accent)]" style={{ color: "var(--color-faint)" }}>
        ← The archive
      </Link>

      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        <article className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill">{item.source}</span>
            <span className="pill">{item.kind}</span>
            {item.date ? <span className="pill tabular">{item.date}</span> : null}
            {item.derived ? <DerivedBadge from={item.derivedFrom} /> : null}
          </div>

          <h1 className="mt-6 max-w-3xl text-[30px] font-semibold leading-[1.12] sm:text-[40px]">{item.title}</h1>

          {item.pull ? (
            <p
              className="mt-6 max-w-2xl border-l-2 pl-5 text-[17px] leading-relaxed"
              style={{ borderColor: "var(--accent)", color: "var(--color-chalk)" }}
            >
              {item.pull}
            </p>
          ) : null}

          <div className="prose-plan mt-8 max-w-[70ch] text-[16px]">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {item.derived ? (
            <p
              className="mt-8 rounded-[10px] p-4 text-[13px] leading-relaxed"
              style={{ border: "1px dashed var(--color-line)", color: "var(--color-muted)" }}
            >
              This piece was distilled from {item.derivedFrom ?? "a private working record"} rather than lifted
              from something published. It is marked everywhere it is cited, so you always know whether you
              can go read the original.
            </p>
          ) : null}

          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="btn btn-ghost mt-8">
              Read the source
            </a>
          ) : null}
        </article>

        <aside className="lg:w-72 lg:shrink-0">
          <div className="card p-5">
            <p className="eyebrow mb-4">How this is classified</p>
            <div className="flex flex-col gap-4">
              {(TAG_AXES as readonly TagAxis[]).map((axis) => {
                const values = item.tags[axis];
                if (values.length === 0) return null;
                return (
                  <div key={axis}>
                    <p className="mb-2 text-[11.5px]" style={{ color: "var(--color-faint)" }}>
                      {AXIS_LABEL[axis]}
                      {item.tagSource[axis] ? (
                        <span className="ml-1.5 font-mono" style={{ color: "var(--color-line)" }}>
                          · {item.tagSource[axis]}
                        </span>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {values.map((value) => (
                        <Link key={value} href={`/archive?${axis}=${value}`} className="tag transition-colors hover:border-[var(--accent-line)]">
                          {value}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 pt-4 text-[12px] leading-relaxed" style={{ borderTop: "1px solid var(--color-line-soft)", color: "var(--color-faint)" }}>
              <span className="font-mono">seed</span> means the tag was set by hand at ingest.{" "}
              <span className="font-mono">rules</span> means the deterministic tagger inferred it.
            </p>
          </div>

          <Link href="/plan" className="btn btn-primary mt-4 w-full justify-center">
            Use the archive on your situation
          </Link>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-16">
          <div className="rule mb-5 w-24" />
          <p className="eyebrow">Retrieved alongside this</p>
          <p className="mt-2 text-[13.5px]" style={{ color: "var(--color-muted)" }}>
            Selected by shared tags, not by text similarity.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {related.map((hit) => (
              <ArchiveCard key={hit.item.id} item={hit.item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
