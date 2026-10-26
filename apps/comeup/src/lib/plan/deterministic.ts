/**
 * The template composer — the no-API-key path.
 *
 * This is not a placeholder. With no key set, the plan is assembled from a
 * classified reading of the input, the archive's own numbers, and arithmetic:
 * a price band scaled by hours and skill family, a channel chosen by what the
 * reader can actually afford to do, and a validation test whose pass bar comes
 * from the cold-email base rate that's sitting in the archive.
 *
 * It ships labelled "template" so nobody is misled about which path ran.
 */

import type { Audience } from "@/lib/archive/types";
import type { SectionEvidence } from "./retrieval";
import { toCitation } from "./retrieval";
import type { OfferPrice, Plan, PlanInput, PlanSection, WeekPlan } from "./types";

type FamilyKey =
  | "software"
  | "visual"
  | "writing"
  | "teaching"
  | "fitness"
  | "music"
  | "ops"
  | "hands-on"
  | "social"
  | "general";

interface Family {
  key: FamilyKey;
  /** What the reader says they can do, in their words. */
  label: string;
  match: RegExp;
  /** A narrow, outcome-shaped version of the skill. */
  wedge: string;
  wedgeWhy: string;
  /** Two buyer types, each with the structural reason they're underserved. */
  buyers: Array<{ who: string; because: string; find: string }>;
  offer: { name: string; deliverable: string; window: string };
  /** [floor, target, ceiling] for a first paid engagement. */
  band: [number, number, number];
  recurring: { pct: number; what: string } | null;
  proofArtifact: string;
  validationAsset: string;
}

const FAMILIES: readonly Family[] = [
  {
    key: "software",
    label: "you can build software",
    match: /\b(code|coding|develop|program|software|app|web ?site|react|python|javascript|swift|ios|android|automat|script|ai|agent|no.?code|webflow|shopify|wordpress)\b/i,
    wedge: "one repeated, specific job for one kind of business — not \"I build apps\"",
    wedgeWhy:
      "\"I build apps\" competes with everyone who can now build apps, which as of this year is everyone. \"I build the thing that answers the twelve calls a day your front desk keeps taking\" competes with nobody.",
    buyers: [
      {
        who: "a small operator who is currently answering the same question by phone all day",
        because:
          "software quotes for them start in the tens of thousands, so they've never been offered anything, and they don't know a small version exists",
        find: "their own phone log, their Google reviews, and the FAQ page they wrote in 2019",
      },
      {
        who: "an organization renting a template platform every month",
        because:
          "the platform charges monthly rent for something that makes them look like everyone else in their category, and they know it",
        find: "the footer credit on their current site or app — it names the platform they're renting",
      },
    ],
    offer: {
      name: "a paid build of one working thing",
      deliverable: "one screen or one automation that does the single job end to end, live and in their hands",
      window: "two to three weeks",
    },
    band: [600, 1500, 4000],
    recurring: { pct: 0.08, what: "keeping it running, updated and unbroken" },
    proofArtifact: "a two-minute screen recording of the thing working with their real data in it",
    validationAsset: "a working demo",
  },
  {
    key: "visual",
    label: "you can make things look good",
    match: /\b(design|designer|photo|photograph|video|videograph|edit|editing|film|graphic|brand|logo|motion|illustrat|thumbnail|premiere|after effects|figma|lightroom|3d|render)\b/i,
    wedge: "one deliverable, for one industry, on a repeatable turnaround",
    wedgeWhy:
      "Creative work priced by the hour is a race you lose to whoever is hungrier. Creative work priced as a named deliverable with a turnaround is a product, and products get referred.",
    buyers: [
      {
        who: "a local business whose current photos or footage were taken on a phone in 2021",
        because:
          "agencies quote them enterprise numbers and freelancers ghost them, so they gave up and used what they had",
        find: "their Instagram grid and their Google Business listing — the gap is visible from the outside",
      },
      {
        who: "someone already spending on ads or listings with bad creative",
        because:
          "they're paying for distribution and wasting it, which makes your work the cheapest line item in their budget",
        find: "anyone running boosted posts or paid listings in your area",
      },
    ],
    offer: {
      name: "a named package, not a day rate",
      deliverable: "a fixed set of assets — a specific count, a specific format, a specific use — delivered on a date",
      window: "one to two weeks",
    },
    band: [250, 750, 2500],
    recurring: { pct: 0.25, what: "a monthly refresh so their feed never goes stale again" },
    proofArtifact: "one before/after on a real local business, done free if necessary, published with permission",
    validationAsset: "three finished pieces made for businesses like theirs",
  },
  {
    key: "writing",
    label: "you can write",
    match: /\b(writ|copy|blog|newsletter|ghostwrit|script|content strategy|editor|journalis|essay|seo)\b/i,
    wedge: "one format, for one kind of client, tied to a number they already watch",
    wedgeWhy:
      "\"Writer\" is a job title, not an offer. \"I write the weekly email that gets your existing list to book\" is an offer, because it names the metric the buyer is already anxious about.",
    buyers: [
      {
        who: "an operator with a list they never email",
        because: "they built the list, feel guilty about it, and have no system — the asset is already paid for and idle",
        find: "anyone who asked for your email at checkout and has never used it",
      },
      {
        who: "a founder or consultant who posts inconsistently and knows it costs them",
        because: "their pipeline visibly correlates with their posting and they can't sustain it themselves",
        find: "the person in your feed who posted daily for three weeks and then vanished",
      },
    ],
    offer: {
      name: "a monthly retainer from day one",
      deliverable: "a fixed number of pieces a month, on a schedule, with the first month priced as a paid trial",
      window: "first piece inside a week",
    },
    band: [200, 600, 2000],
    recurring: { pct: 1, what: "the whole offer is recurring — that's the point of this one" },
    proofArtifact: "one piece written for a real target client, sent to them unrequested and free",
    validationAsset: "two finished samples in the exact format you sell",
  },
  {
    key: "teaching",
    label: "you can teach it",
    match: /\b(teach|tutor|coach|lesson|instruct|math|science|test prep|sat|act|language|spanish|english|mentor|train(ing|er)?\b)/i,
    wedge: "one outcome with a deadline attached, not \"lessons\"",
    wedgeWhy:
      "Hourly tutoring is bought reluctantly and cancelled first. \"Ten sessions to a specific score before the March test date\" is bought once, in full, by a parent who has a deadline.",
    buyers: [
      {
        who: "a parent with a dated deadline — a test, an application, a placement",
        because: "the deadline makes the decision for them, and nobody is selling them a package against it",
        find: "school parent groups, the class before the exam cycle, and your own former teachers",
      },
      {
        who: "an adult who needs one skill for one specific reason at work",
        because: "courses sell them 40 hours when they need 4, and nobody sells the 4",
        find: "job postings in your area that list the skill as a requirement",
      },
    ],
    offer: {
      name: "a package against a date",
      deliverable: "a fixed number of sessions, a stated outcome, and a schedule that ends before their deadline",
      window: "start this week",
    },
    band: [150, 450, 1500],
    recurring: { pct: 0, what: "" },
    proofArtifact: "one written result from a past student, with the before and after number in it",
    validationAsset: "a one-page outline of every session",
  },
  {
    key: "fitness",
    label: "you can train people",
    match: /\b(fitness|gym|train(er|ing)|workout|nutrition|yoga|pilates|coach(ing)? (clients|athletes)|physical|weight ?loss|run(ning)? coach)\b/i,
    wedge: "one population, one outcome, one program length",
    wedgeWhy:
      "General personal training competes with a $10/mo app. A program built for one specific body and one specific season — postpartum, post-injury, first marathon, off-season — has no app competitor and no price anchor.",
    buyers: [
      {
        who: "someone at a life transition with a deadline",
        because: "the generic programs don't account for their constraint, and they've already failed one",
        find: "the local club, clinic or group that already gathers that exact population",
      },
      {
        who: "a small employer whose team has a wellness budget nobody spends",
        because: "the budget exists, the vendor list doesn't, and one person deciding is the whole sale",
        find: "any office of 15–60 people near you",
      },
    ],
    offer: {
      name: "an 8-week program, paid up front",
      deliverable: "a stated outcome, a written plan, weekly check-ins, and an end date",
      window: "starts next Monday",
    },
    band: [200, 500, 1200],
    recurring: { pct: 0.5, what: "continuation after the program ends, at a lower monthly rate" },
    proofArtifact: "one documented eight-week result, with dates and numbers",
    validationAsset: "the written week-by-week plan",
  },
  {
    key: "music",
    label: "you can make music",
    match: /\b(music|produce|beat|mix|master|record|studio|audio|podcast|sound|dj|instrument|sing)\b/i,
    wedge: "one service to one type of client who is already spending money",
    wedgeWhy:
      "Selling to other artists means selling to people with no budget. Selling the same skill to businesses, podcasters, or video people means selling to someone with a line item.",
    buyers: [
      {
        who: "podcasters and video creators who publish weekly and sound bad",
        because: "they know it, they can't fix it, and their publishing schedule makes it a recurring need",
        find: "any show under 500 downloads publishing on a schedule",
      },
      {
        who: "local businesses and churches running events with terrible audio",
        because: "the person doing sound is a volunteer, and the fix is a service nobody has offered them",
        find: "any venue with a weekly recurring event",
      },
    ],
    offer: {
      name: "per-episode or per-event, on a schedule",
      deliverable: "a fixed turnaround on a fixed unit — one episode, one event, one track",
      window: "48-hour turnaround",
    },
    band: [100, 400, 1200],
    recurring: { pct: 1, what: "the weekly or monthly cadence is the offer" },
    proofArtifact: "a 30-second before/after of one real client's audio",
    validationAsset: "a rebuilt version of an episode they already published",
  },
  {
    key: "ops",
    label: "you're good at running things",
    match: /\b(spreadsheet|excel|bookkeep|account(ing|s)|admin|assistant|schedul|data entry|operations|logistics|inventory|crm|notion|airtable|project manage)\b/i,
    wedge: "one recurring back-office job that currently eats the owner's evenings",
    wedgeWhy:
      "\"Virtual assistant\" is priced against the global floor. \"I do your invoicing and chase your receivables every Friday\" is priced against the money it recovers, which is a different number entirely.",
    buyers: [
      {
        who: "an owner-operator doing admin after closing",
        because: "they can't justify a hire and have never been offered a fraction of one",
        find: "any trades business, clinic or shop with one person running everything",
      },
      {
        who: "a small practice with money sitting in unsent invoices",
        because: "chasing payment is unpleasant and gets postponed, so the money is measurably idle",
        find: "ask any small business owner when they last sent a payment reminder",
      },
    ],
    offer: {
      name: "a weekly recurring block",
      deliverable: "one named job, done on the same day every week, reported in one message",
      window: "starts this week",
    },
    band: [150, 500, 1500],
    recurring: { pct: 1, what: "this offer is monthly by construction" },
    proofArtifact: "one week done free, ending with a report of what you found or recovered",
    validationAsset: "a one-page description of the weekly job and the report",
  },
  {
    key: "hands-on",
    label: "you can do the physical work",
    match: /\b(clean|detail|landscap|lawn|repair|install|handy|paint|move|moving|deliver|assembl|pressure wash|pet|dog|childcare|barber|hair|nails|makeup)\b/i,
    wedge: "one job, one neighbourhood, on a repeat schedule",
    wedgeWhy:
      "One-off physical work means you re-sell every single time. The same work sold as a standing appointment turns one sale into a year of revenue, and it costs nothing extra to offer.",
    buyers: [
      {
        who: "households or businesses on the same few streets",
        because: "density is the entire economics of physical work — ten customers in one area beats thirty spread out",
        find: "one street, one apartment complex, one small business strip",
      },
      {
        who: "a property manager or office manager who buys for many units at once",
        because: "one conversation buys you ten recurring jobs instead of one",
        find: "the management company on the sign outside any complex",
      },
    ],
    offer: {
      name: "a standing appointment, not a one-off",
      deliverable: "the same job, same day, every week or month, at a small discount to the one-off price",
      window: "first job this week",
    },
    band: [40, 120, 400],
    recurring: { pct: 1, what: "the recurrence is the business" },
    proofArtifact: "before/after photos from three jobs on the same street",
    validationAsset: "a printed price card with three options",
  },
  {
    key: "social",
    label: "you understand how attention works online",
    match: /\b(social media|tiktok|instagram|reels|shorts|youtube|community manage|influencer|posting|viral|meme|twitter|x\.com|linkedin)\b/i,
    wedge: "one platform, one format, one measurable result",
    wedgeWhy:
      "\"Social media management\" is bought once and cancelled in month three, because nobody can tell what it did. Tie the offer to one number the owner already looks at and the cancellation conversation never happens.",
    buyers: [
      {
        who: "a local business with a dead account and a real product",
        because: "they know they should and they hate doing it, and the raw material is already sitting in their shop",
        find: "any business with a great product and a last post from eight months ago",
      },
      {
        who: "a professional whose clients come from referrals only",
        because: "their pipeline has no top of funnel and they feel it every slow month",
        find: "consultants, agents, coaches and clinicians in your area",
      },
    ],
    offer: {
      name: "a fixed monthly output tied to one metric",
      deliverable: "a stated number of pieces a month plus one number you report on",
      window: "first pieces inside a week",
    },
    band: [200, 700, 2500],
    recurring: { pct: 1, what: "monthly by construction — never sell this as a one-off" },
    proofArtifact: "one account you grew, with the dated screenshots to prove the before",
    validationAsset: "three finished pieces made for one target business",
  },
  {
    key: "general",
    label: "you have a skill you haven't narrowed yet",
    match: /.^/,
    wedge: "the single task people already ask you for without being prompted",
    wedgeWhy:
      "The wedge is almost never the thing you're proudest of. It's the thing people already interrupt you to ask for, because that request is unpaid market research you've already collected.",
    buyers: [
      {
        who: "the people who have already asked you for this",
        because: "they asked, which is more validation than most products ever get",
        find: "scroll back through your messages and count who asked for the same thing twice",
      },
      {
        who: "more people exactly like them",
        because: "the second customer is always the first customer's neighbour, colleague or group chat",
        find: "ask the first one where else people like them gather",
      },
    ],
    offer: {
      name: "one thing, one price, one week",
      deliverable: "the smallest complete version of what they asked for, finished and handed over",
      window: "one week",
    },
    band: [100, 350, 1000],
    recurring: { pct: 0.3, what: "a standing monthly version, offered on delivery day" },
    proofArtifact: "one completed piece of work with the person's name and permission on it",
    validationAsset: "one finished example of what you sell",
  },
];

function classify(input: PlanInput): Family {
  const text = `${input.situation} ${input.tried ?? ""}`;
  let best: { family: Family; score: number } | null = null;
  for (const family of FAMILIES) {
    if (family.key === "general") continue;
    const matches = text.match(new RegExp(family.match.source, "gi"));
    const score = matches ? matches.length : 0;
    if (score > 0 && (!best || score > best.score)) best = { family, score };
  }
  return best?.family ?? FAMILIES[FAMILIES.length - 1];
}

function round(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

/**
 * Price from the band, adjusted by how much of the week they actually have.
 * Fewer hours means a smaller promise, not a discount — the scope moves, not
 * the rate. That distinction is the whole reason the rationale is printed.
 */
function priceFor(family: Family, input: PlanInput): OfferPrice {
  const [floor, target, ceiling] = family.band;
  const hours = Math.max(1, input.hoursPerWeek);
  const factor = hours < 5 ? 0.7 : hours < 12 ? 1 : hours < 25 ? 1.25 : 1.5;
  const amount = round(Math.min(ceiling, Math.max(floor, target * factor)), amountStep(target));

  const recurring =
    family.recurring && family.recurring.pct > 0
      ? {
          amount:
            family.recurring.pct >= 1
              ? amount
              : Math.max(50, round(amount * family.recurring.pct, 25)),
          unit: "per month",
          what: family.recurring.what,
        }
      : undefined;

  const rationale =
    hours < 5
      ? `You have about ${hours} hours a week, so the deliverable is scoped down rather than the rate. A small promise you keep is worth more than a big one you renegotiate.`
      : hours >= 25
        ? `At ${hours} hours a week you can credibly promise a turnaround, and a stated turnaround is worth more than the work itself to a buyer who has been burned before.`
        : `${hours} hours a week supports one engagement at a time. Price for one at a time, and raise it on the third client rather than the first.`;

  return { amount, unit: "one-time", floor, ceiling, recurring, rationale };
}

function amountStep(target: number): number {
  if (target >= 1000) return 250;
  if (target >= 400) return 50;
  return 25;
}

interface Channel {
  name: string;
  action: string;
  volume: number;
  math: string;
  why: string;
}

/**
 * Channel selection is a function of money, not preference. With $0 the only
 * channels are the ones that cost time; the archive's cold-email base rate
 * then sets how much time.
 */
function channelFor(family: Family, input: PlanInput): Channel {
  const broke = input.budget < 25;
  const local = family.key === "hands-on" || family.key === "fitness" || family.key === "teaching";
  const tried = (input.tried ?? "").toLowerCase();
  const triedBroadcast = /post|instagram|tiktok|twitter|linkedin|content|reel|video/.test(tried);
  const triedDirect = /email|dm|message|cold|call|reach|outreach/.test(tried);

  if (local) {
    return {
      name: broke ? "Direct, in person, in one small area" : "Direct in one area, plus one paid listing",
      action:
        "Pick one street, complex, building or group. Show up, hand over something physical with three options and a price on it, and ask for a start date rather than interest.",
      volume: 30,
      math:
        "Thirty in-person asks in one dense area outperforms three hundred posts, because you're not competing for attention — you're the only person who showed up.",
      why: triedBroadcast
        ? "You've been broadcasting to people who can't buy from you. This work is bought locally and specifically, so the channel has to be local and specific."
        : "Physical services are bought on proximity and trust, both of which collapse to distance. Density is the strategy.",
    };
  }

  if (broke) {
    return {
      name: "Direct outreach with a finished artifact attached",
      action: `Build a list of 40 named targets that match the customer above. Send each one a short, specific message with ${family.validationAsset} attached — not a description of it. Ask for a fifteen-minute call, not a sale.`,
      volume: 40,
      math:
        "Cold reply rates sit around 3.4%, so 40 sends is one or two conversations. That's not failure, that's the base rate — which means 40 is the minimum size at which the result means anything.",
      why: triedDirect
        ? "You've done this. The thing to change is not the channel, it's the volume and the specificity of the list — most people quit at a sample size too small to read."
        : "It costs nothing but your time, it puts you in front of named people rather than an algorithm, and every send teaches you the objection.",
    };
  }

  return {
    name: "Direct outreach, plus one owned publishing surface",
    action: `Same 40 named targets with ${family.validationAsset} attached. In parallel, publish the work publicly on one surface — one platform, twice a week, showing the actual job being done rather than tips about it.`,
    volume: 40,
    math:
      "Outreach produces this month's clients; publishing produces next quarter's inbound. Doing only the first means starting from zero every month, and only the second means starving.",
    why: triedBroadcast
      ? "Posting without a direct channel is the most common way to be busy and broke. Keep publishing, but the revenue has to come from the 40 named targets while it compounds."
      : "One channel that converts now, one that compounds later. Never more than two.",
  };
}

function readback(input: PlanInput, family: Family): string {
  const hours = input.hoursPerWeek;
  const money = input.budget === 0 ? "no money to put in" : `about $${input.budget} to put in`;
  const place = input.where ? ` in ${input.where.trim()}` : "";
  return `You can ${family.label.replace(/^you (can|understand|'re|have) ?/, "")}${place}, you have ${hours} hour${hours === 1 ? "" : "s"} a week and ${money}.`;
}

export function composeTemplatePlan(
  input: PlanInput,
  evidence: readonly SectionEvidence[],
  audience: Audience[],
): Plan {
  const family = classify(input);
  const price = priceFor(family, input);
  const channel = channelFor(family, input);
  const buyer = family.buyers[0];
  const second = family.buyers[1];

  const byKey = new Map(evidence.map((section) => [section.key, section]));
  const cite = (key: PlanSection["key"]) => (byKey.get(key)?.hits ?? []).map(toCitation);

  const sections: PlanSection[] = [
    {
      key: "wedge",
      label: "The wedge",
      job: "find-wedge",
      verdict: `Sell ${family.wedge}.`,
      body: [
        family.wedgeWhy,
        `Write it as one sentence with a customer and a result in it, and no adjectives: "I do ${family.offer.deliverable} for ${buyer.who}." If that sentence needs a second sentence to make sense, it isn't narrow enough yet.`,
        `The test for the next two weeks: you are not allowed to say yes to work that falls outside that sentence. Not because the other work is bad — because a wedge you keep abandoning never accumulates the proof that makes the third client easy.`,
      ],
      citations: cite("wedge"),
    },
    {
      key: "customer",
      label: "The customer",
      job: "pick-customer",
      verdict: `Start with ${buyer.who}.`,
      body: [
        `Why them: ${buyer.because}.`,
        `Where to find them: ${buyer.find}.`,
        `Your second list, once the first one is exhausted: ${second.who} — ${second.because}. Don't run both at once. Two lists at half attention produce no signal from either.`,
        `Build the list by name, in a spreadsheet, before you send anything. If you cannot name ${channel.volume} specific individuals or businesses, you have picked a demographic rather than a customer, and that's the actual problem to fix this week.`,
      ],
      citations: cite("customer"),
    },
    {
      key: "offer",
      label: "The first offer",
      job: "price-offer",
      verdict: `${family.offer.name} — $${price.amount.toLocaleString()}${price.recurring ? `, then $${price.recurring.amount.toLocaleString()} ${price.recurring.unit}` : ""}.`,
      body: [
        `What they get: ${family.offer.deliverable}, delivered in ${family.offer.window}.`,
        price.rationale,
        price.recurring
          ? `The recurring half is the part that matters: $${price.recurring.amount.toLocaleString()} a month for ${price.recurring.what}. One of those is a rounding error. Ten is real money that arrives whether or not you open the laptop, and ten is a sales problem rather than a skill problem.`
          : `There's no natural recurring version of this offer, so the follow-on is referral and repeat: ask for the next name on the day you deliver, while the result is in front of them.`,
        `Range: hold $${price.floor.toLocaleString()} as an absolute floor and $${price.ceiling.toLocaleString()} as where this goes once you have three delivered results. Raise the price on the fourth client, not the first — the first one is buying an unproven person and you both know it.`,
        `Invoice it properly, from something with a name and an invoice number and payment terms. The same number, sent informally, gets negotiated. Sent as an invoice, it gets processed.`,
      ],
      citations: cite("offer"),
    },
    {
      key: "distribution",
      label: "The first channel",
      job: "get-distribution",
      verdict: channel.name,
      body: [channel.action, channel.math, channel.why],
      citations: cite("distribution"),
    },
    {
      key: "validate",
      label: "Validate this week",
      job: "validate",
      verdict: `Get ${family.validationAsset} in front of ${channel.volume} named people and book one conversation.`,
      body: [
        `The test, precisely: by the end of this week, ${channel.volume} specific named targets have received a message with a real artifact attached — ${family.validationAsset}. Not a description. Not a portfolio link. The thing.`,
        `Pass bar: one booked conversation. At the ~3.4% base rate for cold outreach, ${channel.volume} sends should produce one or two replies. One conversation means the channel works and you scale the volume. Zero from ${channel.volume} means the list is wrong before it means the offer is wrong — check that every name on it is a person who could say yes without asking anybody.`,
        `What this test is not: asking people if they would pay. They will say yes and they will be lying, politely. The only validation that counts is a calendar invite or an invoice.`,
        `Do the ${family.proofArtifact} first if you have nothing to attach. It's a day of unpaid work that makes every subsequent message ten times stronger.`,
      ],
      citations: cite("validate"),
    },
  ];

  const thirtyDays: WeekPlan[] = [
    {
      week: 1,
      focus: "Make the artifact and the list",
      moves: [
        `Produce ${family.proofArtifact}. One day, unpaid, finished.`,
        `Build a named list of ${channel.volume} targets that match the customer above. Name, business, and the one specific detail you'll reference.`,
        `Write the offer as one sentence and one price. Put it in a document you can send.`,
      ],
    },
    {
      week: 2,
      focus: "Run the test",
      moves: [
        `Send all ${channel.volume}, spread across the week — never in one batch from a cold address.`,
        "Log every reply, including the nos, and the reason given. The objection you hear three times is your next month's offer.",
        "Take any conversation offered, even the ones that clearly won't buy. Early calls are where you learn what the offer sounds like out loud.",
      ],
    },
    {
      week: 3,
      focus: "Close one and deliver it",
      moves: [
        `Convert one conversation into a paid ${family.offer.name.toLowerCase()} at $${price.amount.toLocaleString()}. Discount the scope if you must; do not discount the price.`,
        "Send a real invoice with terms. Get paid before or on delivery, not after.",
        `Deliver in ${family.offer.window}, and deliver something slightly smaller than you promised yourself but exactly what you promised them.`,
      ],
    },
    {
      week: 4,
      focus: "Turn one into two",
      moves: [
        "On delivery day, ask for one specific referral by name — not \"anyone who might need this.\"",
        price.recurring
          ? `Offer the standing version at $${price.recurring.amount.toLocaleString()}/mo on the same day, while the result is visibly in front of them.`
          : "Ask what the next thing they'd pay for is, and write down the answer verbatim.",
        "Publish the result. One post, one screen recording, one before-and-after. Proof you can point at is what makes the second client cheaper to get than the first.",
      ],
    },
  ];

  const killCriteria = [
    `${channel.volume} sends, zero replies, and a list you're confident about: the offer is wrong, not the effort. Change what you're selling, not how loudly.`,
    "Three conversations where the price is never the objection: you're too cheap, and the discount is costing you credibility.",
    "Four weeks with no invoice sent: you're in building mode, not selling mode. Stop building today and send the messages.",
  ];

  return {
    id: `plan_${Date.now().toString(36)}`,
    generatedAt: new Date().toISOString(),
    mode: "template",
    readback: readback(input, family),
    headline: `Sell ${family.wedge} — starting at $${price.amount.toLocaleString()}.`,
    sections,
    price,
    thirtyDays,
    killCriteria,
    audience,
    archiveItemsUsed: new Set(evidence.flatMap((section) => section.hits.map((hit) => hit.item.id))).size,
  };
}
