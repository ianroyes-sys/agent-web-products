import Link from "next/link";
import { archiveSources, loadArchive } from "@/lib/archive/ingest";
import { countTags } from "@/lib/archive/tag";
import { facet } from "@/lib/archive/retrieve";
import { JOB_LABEL, type Job } from "@/lib/archive/types";
import { SITE } from "@/lib/site";
import { ArchiveCard, SectionHead, Stat } from "@/components/ui";

const OUTPUTS = [
  {
    n: "01",
    title: "The wedge",
    body: "The narrow version of what you do. Not your skill — the one repeated job somebody already pays to have done.",
  },
  {
    n: "02",
    title: "The customer",
    body: "One named list, and the structural reason nobody is serving them yet. Not a demographic.",
  },
  {
    n: "03",
    title: "The first offer, with a price",
    body: "What they get, by when, for how much, and where the recurring half sits. An actual number, not a range to think about.",
  },
  {
    n: "04",
    title: "The first channel",
    body: "One way to reach them, chosen against your real budget, with the volume the base rate says it takes.",
  },
  {
    n: "05",
    title: "The one thing to validate this week",
    body: "A single test with a pass bar you can fail. Plus the conditions under which you should stop and pick something else.",
  },
] as const;

export default function HomePage() {
  const items = loadArchive();
  const sources = archiveSources();
  const tagCount = countTags(items);
  const jobs = facet("job").slice(0, 6);

  const featured = ["ebc-return-equation", "log-segment-scorecard", "ebc-04-fifty-cold-emails"]
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 opacity-[0.28]"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, var(--accent) 0%, transparent 70%)", filter: "blur(20px)" }}
        />
        <div className="wrap relative pb-20 pt-20 sm:pt-28">
          <div className="fade-up flex flex-wrap items-center gap-2">
            <span className="pill pill-accent">
              <span className="dot" />
              One archive. One job.
            </span>
            <span className="pill">
              <span className="tabular">{items.length}</span> tagged pieces
            </span>
          </div>

          <h1 className="fade-up stagger-1 mt-7 max-w-4xl text-[40px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[62px] lg:text-[74px]">
            You already know enough.
            <br />
            <span style={{ color: "var(--color-muted)" }}>This tells you what to do with it.</span>
          </h1>

          <p className="fade-up stagger-2 mt-7 max-w-2xl text-[17px] leading-relaxed sm:text-[19px]">
            You have a skill and no plan. Paste your situation and get the wedge, the customer, the first
            offer with a price, the first channel, and the one thing to validate this week — every part of
            it grounded in a real archive and cited back to the piece it came from.
          </p>

          <div className="fade-up stagger-3 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/plan" className="btn btn-primary btn-lg justify-center">
              Get your plan — free
            </Link>
            <Link href="/archive" className="btn btn-ghost btn-lg justify-center">
              See the archive first
            </Link>
          </div>

          <p className="fade-up stagger-4 mt-5 text-[13px]" style={{ color: "var(--color-faint)" }}>
            No account. First plan free. Built on the archive of {SITE.expert} — roughly 30 shipped apps,
            an agency, and a newsletter, all from a dorm desk.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ the anti-pitch */}
      <section className="wrap py-16">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-7" style={{ background: "var(--color-ink)" }}>
            <p className="eyebrow" style={{ color: "var(--color-hot)" }}>
              What this is not
            </p>
            <h3 className="mt-4 text-[21px] font-medium leading-snug">Chat with an expert.</h3>
            <ul className="mt-5 flex flex-col gap-3 text-[14.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
              <li>A box that answers whatever you type, about anything, forever.</li>
              <li>An archive poured into a vector database and called a product — a search box with confidence.</li>
              <li>Answers that sound like the expert and commit to nothing.</li>
            </ul>
          </div>

          <div className="card p-7" style={{ borderColor: "var(--accent-line)" }}>
            <p className="eyebrow" style={{ color: "var(--accent)" }}>
              What this is
            </p>
            <h3 className="mt-4 text-[21px] font-medium leading-snug">One painful job, worked end to end.</h3>
            <ul className="mt-5 flex flex-col gap-3 text-[14.5px] leading-relaxed" style={{ color: "var(--color-body)" }}>
              <li>
                The job: <span style={{ color: "var(--color-chalk)" }}>{SITE.job}</span>
              </li>
              <li>
                The archive is tagged across six axes — job, topic, audience, example, framework, outcome —
                and retrieval selects on tags before it ever looks at text.
              </li>
              <li>Every section of the output cites the specific pieces it drew on, with links.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- five outputs */}
      <section className="wrap py-16">
        <SectionHead
          eyebrow="The output"
          title="Five answers, in the order you actually need them"
          lead="Not a summary of the archive. A decision in each slot, with the price and the volume filled in."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OUTPUTS.map((output) => (
            <div key={output.n} className="card flex flex-col p-6 transition-colors hover:border-[var(--accent-line)]">
              <span className="tabular text-[12px]" style={{ color: "var(--accent)" }}>
                {output.n}
              </span>
              <h3 className="mt-3 text-[17px] font-medium">{output.title}</h3>
              <p className="mt-2.5 text-[14px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {output.body}
              </p>
            </div>
          ))}

          <div
            className="flex flex-col justify-between rounded-[14px] p-6"
            style={{ background: "linear-gradient(160deg, color-mix(in oklab, var(--accent) 16%, var(--color-surface)), var(--color-surface))", border: "1px solid var(--accent-line)" }}
          >
            <p className="text-[15px] leading-relaxed" style={{ color: "var(--color-chalk)" }}>
              Plus a four-week board and the conditions under which you should quit this idea.
            </p>
            <Link href="/plan" className="btn btn-primary mt-6 justify-center">
              Start free
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- the archive */}
      <section className="wrap py-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHead
            eyebrow="The refinery"
            title="The structure is the product"
            lead="The lazy version of this dumps everything into embeddings. Here every piece is classified across six axes against closed vocabularies, so a plan can ask for the pricing material for a freelancer rather than for text that sounds like pricing."
          />
          <Link href="/archive" className="btn btn-ghost shrink-0">
            Browse all {items.length}
          </Link>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={String(items.length)} label="Pieces in the archive" sub="essays, notes, doctrine, distilled lessons" />
          <Stat value={String(tagCount)} label="Tag assignments" sub="across six axes, deterministic" />
          <Stat value={String(sources.length)} label="Sources" sub={sources.map((source) => source.label).join(" · ")} />
          <Stat value="0" label="Vector databases" sub="tag-first retrieval, no embeddings" />
        </div>

        <div className="mt-10">
          <p className="eyebrow mb-4">Retrieve by the job you&apos;re stuck on</p>
          <div className="flex flex-wrap gap-2">
            {jobs.map((entry) => (
              <Link
                key={entry.value}
                href={`/archive?job=${entry.value}`}
                className="tag transition-colors hover:border-[var(--accent-line)] hover:text-[var(--accent)]"
                style={{ height: 30, paddingInline: 12, fontSize: 12 }}
              >
                {JOB_LABEL[entry.value as Job] ?? entry.value}
                <span className="tabular" style={{ color: "var(--color-faint)" }}>
                  {entry.count}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {featured.length > 0 ? (
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {featured.map((item) => (
              <ArchiveCard key={item.id} item={item} />
            ))}
          </div>
        ) : null}
      </section>

      {/* ---------------------------------------------------- agent layer */}
      <section className="wrap py-16">
        <div className="card grain relative overflow-hidden p-8 sm:p-12">
          <div className="relative max-w-2xl">
            <p className="eyebrow" style={{ color: "var(--accent)" }}>
              For agents
            </p>
            <h2 className="mt-4 text-[26px] font-semibold leading-tight sm:text-[32px]">
              The archive is a tool other software can call.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
              An archive that only a human can read gets used once. The same archive exposed as a tool gets
              used every time somebody&apos;s assistant needs this specific job done — which is the point:
              the person who did the work gets paid when the knowledge is used.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                { href: "/llms.txt", label: "/llms.txt", note: "what this is, in plain text" },
                { href: "/.well-known/mcp.json", label: "/.well-known/mcp.json", note: "MCP descriptor" },
                { href: "/api/v1/plan", label: "POST /api/v1/plan", note: "the workflow, as JSON" },
                { href: "/api/v1/archive/search?job=price-offer&limit=3", label: "GET /api/v1/archive/search", note: "tag-first search" },
              ].map((endpoint) => (
                <a
                  key={endpoint.href}
                  href={endpoint.href}
                  className="card flex items-center justify-between gap-3 p-4 transition-colors hover:border-[var(--accent-line)]"
                  style={{ background: "var(--color-ink)" }}
                >
                  <span className="font-mono text-[12.5px]" style={{ color: "var(--color-chalk)" }}>
                    {endpoint.label}
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--color-faint)" }}>
                    {endpoint.note}
                  </span>
                </a>
              ))}
            </div>

            <p className="mt-6 text-[13px]" style={{ color: "var(--color-faint)" }}>
              Two tools are exposed over MCP: <span className="font-mono">search_archive</span> and{" "}
              <span className="font-mono">build_plan</span>. A stdio server ships in the repo for Claude
              Desktop.
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- close */}
      <section className="wrap py-16">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-[28px] font-semibold leading-tight sm:text-[36px]">
              The skill isn&apos;t the problem. The plan is.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
              First plan free. Then $19 a month if you want to keep running it as the situation changes.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/plan" className="btn btn-primary btn-lg">
              Get your plan
            </Link>
            <Link href="/pricing" className="btn btn-ghost btn-lg">
              Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
