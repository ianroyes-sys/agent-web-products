import type { Metadata } from "next";
import Link from "next/link";
import { PricingActions } from "@/components/PricingActions";
import { SectionHead } from "@/components/ui";

export const metadata: Metadata = {
  title: "Pricing",
  description: "First plan free. $19/mo to keep running it, $49/mo for the agent layer. Licensing available.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PricingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const checkout = typeof params.checkout === "string" ? params.checkout : undefined;
  const billingLive = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <div className="wrap pb-20 pt-14 sm:pt-20">
      {checkout === "success" ? (
        <div
          className="mb-8 rounded-[12px] p-5"
          style={{ border: "1px solid color-mix(in oklab, var(--color-live) 40%, transparent)" }}
        >
          <p className="text-[15px]" style={{ color: "var(--color-live)" }}>
            Payment went through. Run the plan as often as you need it.
          </p>
        </div>
      ) : null}
      {checkout === "cancelled" ? (
        <div className="mb-8 rounded-[12px] p-5" style={{ border: "1px solid var(--color-line)" }}>
          <p className="text-[15px]" style={{ color: "var(--color-muted)" }}>
            Nothing was charged. The free plan is still there whenever you want it.
          </p>
        </div>
      ) : null}

      <SectionHead
        eyebrow="Pricing"
        title="The first plan is free. It always will be."
        lead="You should be able to find out whether this is worth anything to you before you pay for it. After that, you're paying to keep running it as the situation changes — because the plan for someone with one client is not the plan for someone with none."
      />

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        <Tier
          name="First plan"
          price="Free"
          note="no account, no card"
          points={[
            "One full plan: wedge, customer, offer with a price, channel, and the week's test",
            "The four-week board and the kill criteria",
            "Every section cited back to the archive",
          ]}
          action={
            <Link href="/plan" className="btn btn-ghost mt-6 w-full justify-center">
              Start now
            </Link>
          }
        />

        <Tier
          featured
          name="Monthly"
          price="$19"
          unit="/mo"
          note="for the person actually doing it"
          points={[
            "Unlimited plans — rerun it as the situation moves",
            "Plan history, and a diff against your last one",
            "Full archive search with all six tag axes",
            "The 30-day board regenerated from where you actually got to",
          ]}
          action={<PricingActions plan="monthly" label="Start — $19/mo" />}
        />

        <Tier
          name="Pro"
          price="$49"
          unit="/mo"
          note="for people building on top of it"
          points={[
            "Everything in Monthly",
            "API access to /api/v1/plan and the archive search",
            "MCP connection, so your own assistant can call the workflow",
            "Higher rate limits and priority composition",
          ]}
          action={<PricingActions plan="pro" label="Start — $49/mo" />}
        />
      </div>

      {!billingLive ? (
        <p
          className="mt-6 rounded-[10px] p-4 text-[13px] leading-relaxed"
          style={{ border: "1px dashed var(--color-line)", color: "var(--color-muted)" }}
        >
          Billing is not switched on in this environment. The paid buttons collect an email instead of opening
          a broken checkout, and no card is ever charged. Stripe here is test mode only.
        </p>
      ) : null}

      {/* ------------------------------------------------- other options */}
      <section className="mt-20">
        <SectionHead
          eyebrow="Other ways this gets used"
          title="Licensing and lead magnets"
          lead="The archive is the asset. There are two obvious ways it earns outside a subscription, and both are open."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="card p-7">
            <p className="eyebrow" style={{ color: "var(--accent)" }}>
              License it
            </p>
            <h3 className="mt-4 text-[19px] font-medium leading-snug">
              Run this workflow inside your own program
            </h3>
            <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
              Accelerators, bootcamps, career centres and community programs can license the workflow for
              their cohort under their own name. Priced per cohort, per year. The archive stays cited — that
              is the one non-negotiable term.
            </p>
          </div>

          <div className="card p-7">
            <p className="eyebrow" style={{ color: "var(--accent)" }}>
              Use it as a lead magnet
            </p>
            <h3 className="mt-4 text-[19px] font-medium leading-snug">
              A free plan, embedded, with your branding on it
            </h3>
            <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
              If you sell to people who have a skill and no plan, this is a better opt-in than a PDF nobody
              opens. Embedded version, your colours, email capture goes to you.
            </p>
          </div>
        </div>

        <div className="card mt-4 flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[16px] font-medium" style={{ color: "var(--color-chalk)" }}>
              Either of those is a conversation, not a checkout.
            </p>
            <p className="mt-1.5 text-[14px]" style={{ color: "var(--color-muted)" }}>
              Royz Media Group handles both.
            </p>
          </div>
          <a href="https://royzmediagroup.com" target="_blank" rel="noreferrer" className="btn btn-ghost shrink-0">
            Talk to RMG
          </a>
        </div>
      </section>

      {/* --------------------------------------------------------- faq */}
      <section className="mt-20">
        <SectionHead eyebrow="Straight answers" title="The questions worth asking" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            {
              q: "Is this just a chatbot with a system prompt?",
              a: "No. The archive is classified across six axes and retrieval selects on tags before it ever looks at text. With no composer key configured, the plan is still produced deterministically from that retrieval — the structure does the work, not the model.",
            },
            {
              q: "Where does the advice come from?",
              a: "One person's archive: a newsletter, a channel doctrine, a revenue ledger and a distilled build record. Every section lists what it used, and anything distilled from a private record rather than published is marked as such.",
            },
            {
              q: "Will it tell me my idea is bad?",
              a: "It will tell you when the situation doesn't support an offer yet, and every plan ships with the conditions under which you should stop. A plan that only encourages you is worth what you paid for it.",
            },
            {
              q: "Can I cancel?",
              a: "Any time, from the billing portal, and the free plan stays available afterwards.",
            },
          ].map((entry) => (
            <div key={entry.q} className="card p-6">
              <p className="text-[15.5px] font-medium" style={{ color: "var(--color-chalk)" }}>
                {entry.q}
              </p>
              <p className="mt-2.5 text-[14px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {entry.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Tier({
  name,
  price,
  unit,
  note,
  points,
  action,
  featured,
}: {
  name: string;
  price: string;
  unit?: string;
  note: string;
  points: string[];
  action: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className="card flex flex-col p-7"
      style={
        featured
          ? {
              borderColor: "var(--accent-line)",
              background: "linear-gradient(170deg, color-mix(in oklab, var(--accent) 10%, var(--color-surface)), var(--color-surface))",
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow">{name}</p>
        {featured ? <span className="pill pill-accent">most people</span> : null}
      </div>

      <p className="mt-5 flex items-baseline gap-1">
        <span className="tabular text-[38px] font-medium leading-none" style={{ color: "var(--color-chalk)" }}>
          {price}
        </span>
        {unit ? (
          <span className="text-[15px]" style={{ color: "var(--color-faint)" }}>
            {unit}
          </span>
        ) : null}
      </p>
      <p className="mt-2 text-[13px]" style={{ color: "var(--color-faint)" }}>
        {note}
      </p>

      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {points.map((point) => (
          <li key={point} className="flex gap-2.5 text-[14px] leading-relaxed" style={{ color: "var(--color-body)" }}>
            <span aria-hidden style={{ color: "var(--accent)" }}>
              /
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>

      {action}
    </div>
  );
}
