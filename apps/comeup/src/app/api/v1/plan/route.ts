import { buildPlan, hasModelKey, validateInput } from "@/lib/plan/compose";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public JSON version of the workflow. Same engine as the web app. */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }

  const parsed = validateInput(payload);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const { plan } = await buildPlan(parsed.input);
  return Response.json(plan, { headers: { "cache-control": "no-store" } });
}

export async function GET() {
  return Response.json({
    endpoint: "/api/v1/plan",
    method: "POST",
    job: SITE.job,
    body: {
      situation: "string — required, what you can do, what you've got, where you are",
      tried: "string — optional",
      where: "string — optional",
      hoursPerWeek: "integer 1-80 — optional, defaults to 10",
      budget: "integer dollars — optional, defaults to 0",
    },
    composer: hasModelKey() ? "claude-sonnet-5, grounded in retrieved archive items" : "deterministic template engine",
    note: "Every section carries citations back to the archive items it used.",
  });
}
