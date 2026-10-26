import type { Metadata } from "next";
import { loadArchive } from "@/lib/archive/ingest";
import { PlanWorkflow } from "@/components/PlanWorkflow";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get the plan",
  description: SITE.job,
};

export default function PlanPage() {
  const count = loadArchive().length;

  return (
    <div className="wrap-tight pb-20 pt-14 sm:pt-20">
      <div className="fade-up">
        <div className="rule mb-5 w-24" />
        <p className="eyebrow">The workflow</p>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.08] sm:text-[46px]">
          A skill and no plan.
        </h1>
        <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
          Tell it what you can do, what you&apos;ve got and where you are. It comes back with the wedge, the
          customer, the first offer with a price, the first channel, and the one test to run this week —
          each one retrieved from {count} tagged pieces and cited.
        </p>
      </div>

      <div className="mt-10">
        <PlanWorkflow />
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          { title: "It will disagree with you", body: "If the situation doesn't support an offer yet, it says so and tells you what to fix first." },
          { title: "No invented numbers", body: "Prices come from bands and arithmetic; base rates come from the archive. Nothing is made up to sound confident." },
          { title: "Every claim is cited", body: "Each section links the archive pieces behind it, and marks which were distilled rather than published." },
        ].map((note) => (
          <div key={note.title} className="card p-5">
            <p className="text-[14.5px] font-medium" style={{ color: "var(--color-chalk)" }}>
              {note.title}
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
              {note.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
