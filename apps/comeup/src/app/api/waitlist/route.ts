export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Waitlist capture.
 *
 * There is deliberately no datastore wired up yet — entries are written to the
 * server log, which the operator can actually read. That's stated in the README
 * rather than hidden behind a success message that implies a CRM exists.
 */
export async function POST(request: Request) {
  let body: { email?: string; plan?: string };
  try {
    body = (await request.json()) as { email?: string; plan?: string };
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return Response.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }

  console.log(
    JSON.stringify({ event: "comeup.waitlist", email, plan: body.plan ?? "unknown", at: new Date().toISOString() }),
  );

  return Response.json({ ok: true, message: "You're on the list. You'll get one email when billing opens." });
}
