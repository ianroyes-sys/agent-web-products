import { enhance, hasModelKey, prepare, validateInput } from "@/lib/plan/compose";
import { evidenceCount } from "@/lib/plan/retrieval";
import type { PlanEvent } from "@/lib/plan/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The workflow endpoint for the web app. Streams newline-delimited JSON so the
 * loading state can report what is actually happening — retrieval finishing is
 * a real event, not a spinner frame. The final line is the plan.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }

  const parsed = validateInput(payload);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: PlanEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      try {
        send({
          type: "stage",
          key: "read",
          label: "Reading your situation",
          detail: "Classifying the skill, the hours and the budget",
        });

        // Retrieval is synchronous, so this stage reports a finished fact.
        const { evidence, base } = prepare(parsed.input);
        send({
          type: "stage",
          key: "retrieve",
          label: "Retrieved the archive by tag",
          detail: `${evidence.length} tag-scoped queries · ${evidenceCount(evidence)} items selected`,
        });

        send({
          type: "stage",
          key: "compose",
          label: hasModelKey() ? "Composing against the archive" : "Composing from the template engine",
          detail: hasModelKey()
            ? "claude-sonnet-5, grounded in the retrieved items only"
            : "No composer key set — deterministic path, same retrieved items",
        });

        const plan = await enhance(base, parsed.input, evidence);

        send({
          type: "stage",
          key: "done",
          label: "Done",
          detail: `${plan.archiveItemsUsed} archive items cited`,
        });
        send({ type: "plan", plan });
      } catch (error) {
        send({ type: "error", message: error instanceof Error ? error.message : "Something failed on our side." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
