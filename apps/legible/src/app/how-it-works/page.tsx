import type { Metadata } from "next";
import Link from "next/link";
import { DIMENSION_WEIGHTS, GOVCON_WEIGHT } from "@/lib/audit/dimensions";
import { GOVCON_SIGNALS } from "@/lib/audit/govcon";
import { PROMPT_BATTERY } from "@/lib/audit/prompts";
import { MACHINE_FILES, STANDARD_PATHS } from "@/lib/audit/crawl";
import { FOG_PHRASES } from "@/lib/audit/fog";
import { latestReport } from "@/lib/reports";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Four steps: crawl the way an agent does, score eight dimensions with evidence, run the buyer-intent prompt battery, ship the fix kit.",
};

const STEPS = [
  {
    n: "01",
    title: "Crawl the way an agent does",
    body: "Fetch, parse, extract. No headless browser, because most systems that read the web on a buyer's behalf do not run one either. What a non-rendering agent cannot see, you do not have.",
  },
  {
    n: "02",
    title: "Score eight dimensions against evidence",
    body: "Every check states what it looked for, what it found, and the points it moved — with the literal excerpt quoted underneath. Scores are earned points over available points. There is no curve.",
  },
  {
    n: "03",
    title: "Run the buyer-intent prompt battery",
    body: `${PROMPT_BATTERY.length} questions your buyers are already delegating to assistants, asked against a live model and recorded verbatim. Without an API key the run is a labeled dry run — prompts rendered, nothing sent, nothing invented.`,
  },
  {
    n: "04",
    title: "Ship the fix kit",
    body: "The report ends in artifacts, not advice: an llms.txt, JSON-LD schema, a parseable pricing page, an honest comparison page, a structured FAQ, a changelog scaffold, and an MCP server so agents can transact, not just read.",
  },
];

const CATEGORY_LABEL: Record<string, string> = {
  discovery: "Discovery — you are not named",
  comparison: "Comparison — you are named, next to rivals",
  qualification: "Qualification — the hard filters",
  risk: "Risk — what procurement really asks",
  commercial: "Commercial — money and next steps",
};

export default function HowItWorksPage() {
  const report = latestReport();
  const weights = [
    ...report.dimensions.map((d) => ({ label: d.label, weight: d.weight, question: d.question })),
    {
      label: "GovCon signals",
      weight: GOVCON_WEIGHT,
      question: "Can an agent screen this firm against a solicitation's hard requirements?",
    },
  ].sort((a, b) => b.weight - a.weight);

  const byCategory = PROMPT_BATTERY.reduce<Record<string, typeof PROMPT_BATTERY>>((acc, prompt) => {
    (acc[prompt.category] ??= []).push(prompt);
    return acc;
  }, {});

  const heavyFog = FOG_PHRASES.filter((p) => p.weight === 3).slice(0, 18);

  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--color-line)]">
        <div className="grid-bg pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="wrap py-16 md:py-20">
          <p className="rule-label anim-rise">Method</p>
          <h1 className="anim-rise mt-3 max-w-[20ch] text-[clamp(2.2rem,5.5vw,3.6rem)] font-semibold leading-[1.05]">
            An instrument, not an opinion.
          </h1>
          <p className="anim-rise mt-6 max-w-[62ch] text-[17px] leading-relaxed text-[var(--color-muted)] [animation-delay:80ms]">
            Everything in a Legible report is reproducible from a single command against a public
            domain. If you disagree with a score, you can open the check, read the excerpt it scored,
            and argue with the evidence rather than with us.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="wrap py-16">
        <div className="grid gap-4 md:grid-cols-2">
          {STEPS.map((step) => (
            <article key={step.n} className="card p-6 md:p-7">
              <span className="font-mono text-[13px] text-[var(--accent)]">{step.n}</span>
              <h2 className="mt-3 text-[19px] font-semibold">{step.title}</h2>
              <p className="mt-3 max-w-[54ch] text-[14.5px] leading-relaxed text-[var(--color-muted)]">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* What gets fetched */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-ink)] py-16">
        <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="rule-label">The crawl</p>
            <h2 className="mt-2 text-[26px] font-semibold">What we request, and why a 404 is the finding</h2>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
              We probe the paths a buyer-facing agent would try, plus the machine-facing files almost
              nobody publishes. Then we follow up to four links out of your own navigation, so a site
              with unusual routing is not penalized for our guesses.
            </p>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
              We read public pages only. No login, no paths behind authentication, no rate-limit abuse.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <p className="rule-label">Buyer paths</p>
              <ul className="mt-4 space-y-1.5">
                {["/", ...STANDARD_PATHS].map((path) => (
                  <li key={path} className="font-mono text-[12.5px] text-[var(--color-body)]">
                    {path}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-5">
              <p className="rule-label">Machine files</p>
              <ul className="mt-4 space-y-1.5">
                {MACHINE_FILES.map((path) => (
                  <li key={path} className="font-mono text-[12.5px] text-[var(--color-body)]">
                    {path}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12.5px] leading-relaxed text-[var(--color-faint)]">
                Most of these will be missing. That absence is the most actionable finding in the
                report, and the cheapest to fix.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Weights */}
      <section className="wrap py-16" id="weights">
        <p className="rule-label">Scoring</p>
        <h2 className="mt-2 text-[26px] font-semibold">The weights, stated openly</h2>
        <p className="mt-4 max-w-[64ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
          Parseability carries the most weight because it gates everything downstream: if a machine
          cannot extract a fact, no other dimension can score it. GovCon signals carry {(GOVCON_WEIGHT * 100).toFixed(0)}%
          on their own, because in this market they are the filters that run before a human reads
          anything.
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--color-line)]">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="bg-[var(--color-raised)]">
                <th className="rule-label px-5 py-3 font-normal">Dimension</th>
                <th className="rule-label px-5 py-3 font-normal">The question it answers</th>
                <th className="rule-label px-5 py-3 font-normal">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line-soft)] bg-[var(--color-surface)]">
              {weights.map((row) => (
                <tr key={row.label}>
                  <td className="px-5 py-4 text-[14px] text-[var(--color-chalk)]">{row.label}</td>
                  <td className="px-5 py-4 text-[13.5px] text-[var(--color-muted)]">{row.question}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[13px] tabular-nums text-[var(--color-chalk)]">
                        {(row.weight * 100).toFixed(0)}%
                      </span>
                      <div className="meter w-24" style={{ height: 4 }}>
                        <span
                          className="anim-bar"
                          style={{ width: `${(row.weight / 0.2) * 100}%`, background: "var(--accent)" }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 font-mono text-[12px] text-[var(--color-faint)]">
          total ·{" "}
          {(Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0) + GOVCON_WEIGHT).toFixed(2)}
        </p>
      </section>

      {/* GovCon signals */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-ink)] py-16">
        <div className="wrap">
          <p className="rule-label">GovCon overlay</p>
          <h2 className="mt-2 text-[26px] font-semibold">
            {GOVCON_SIGNALS.length} fields an agent screens on before a human reads anything
          </h2>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {GOVCON_SIGNALS.map((signal) => (
              <div key={signal.id} className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[15px] font-medium text-[var(--color-chalk)]">{signal.label}</h3>
                  <span
                    className={
                      signal.weight === "critical"
                        ? "chip chip-fail"
                        : signal.weight === "high"
                          ? "chip chip-partial"
                          : "chip"
                    }
                  >
                    {signal.weight}
                  </span>
                </div>
                <p className="mt-2.5 max-w-[52ch] text-[13px] leading-relaxed text-[var(--color-muted)]">
                  {signal.why}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fog */}
      <section className="wrap py-16" id="fog">
        <p className="rule-label">Fog index</p>
        <h2 className="mt-2 text-[26px] font-semibold">A real detector, with the list published</h2>
        <p className="mt-4 max-w-[64ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
          {FOG_PHRASES.length} patterns, each weighted 1 to 3. Weight 3 is pure vapor — removing it
          loses zero information. Weight 1 is tolerable in small doses and damaging in volume. The
          score is weighted hits per 1,000 words, and we quote the single foggiest sentence back to
          you, because that is the sentence a model will summarize you with.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {heavyFog.map((entry) => (
            <span key={entry.label} className="chip chip-fail">
              {entry.label}
            </span>
          ))}
          <span className="chip">+{FOG_PHRASES.length - heavyFog.length} more</span>
        </div>
      </section>

      {/* Battery */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-ink)] py-16" id="battery">
        <div className="wrap">
          <p className="rule-label">Prompt battery</p>
          <h2 className="mt-2 text-[26px] font-semibold">
            {PROMPT_BATTERY.length} buyer-intent prompts, published in full
          </h2>
          <p className="mt-4 max-w-[66ch] text-[15px] leading-relaxed text-[var(--color-muted)]">
            The discovery prompts never name you. Those are the ones that reveal whether you exist in
            the answer at all, which is the finding that changes behavior. Every prompt is templated
            with your company, market, and NAICS code.
          </p>

          <div className="mt-8 space-y-8">
            {Object.entries(byCategory).map(([category, prompts]) => (
              <div key={category}>
                <p className="rule-label">{CATEGORY_LABEL[category] ?? category}</p>
                <ul className="mt-3 divide-y divide-[var(--color-line-soft)] rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
                  {prompts.map((prompt) => (
                    <li key={prompt.id} className="px-5 py-3.5">
                      <p className="text-[14px] text-[var(--color-body)]">
                        <span className="mr-2.5 font-mono text-[11px] text-[var(--color-faint)]">
                          {prompt.id}
                        </span>
                        {prompt.text}
                      </p>
                      <p className="mt-1.5 text-[12.5px] text-[var(--color-faint)]">
                        Wins if: {prompt.winsIf}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="card mt-10 p-6">
            <p className="rule-label">Running it yourself</p>
            <pre className="mt-4 overflow-x-auto font-mono text-[12.5px] leading-relaxed text-[var(--color-body)]">
{`# audit only
node scripts/audit.mjs ${report.domain} --out samples/report.json

# audit plus the battery (live when ANTHROPIC_API_KEY is set)
node scripts/audit.mjs ${report.domain} --battery --out samples/report.json

# battery on its own
node scripts/battery.mjs "${report.company}" --category discovery`}
            </pre>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/report/latest" className="btn btn-primary">
              Read a finished report
            </Link>
            <Link href="/audit" className="btn btn-ghost">
              Request one for your domain
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
