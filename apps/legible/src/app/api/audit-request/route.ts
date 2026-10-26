import { NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { normalizeDomain } from "@/lib/audit/http";

/* Audit intake.
 *
 * Requests are appended to a local JSONL queue when the filesystem is
 * writable, and always written to the server log. On a read-only host the
 * log line is the record — the request is never silently dropped, and the
 * caller is never told it succeeded when it did not. */

export const runtime = "nodejs";

const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

interface Payload {
  domain?: unknown;
  email?: unknown;
  company?: unknown;
  name?: unknown;
  role?: unknown;
  naics?: unknown;
  notes?: unknown;
}

const str = (value: unknown, max = 500): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request): Promise<NextResponse> {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const domain = normalizeDomain(str(body.domain, 253));
  const email = str(body.email, 254);

  if (!DOMAIN_PATTERN.test(domain)) {
    return NextResponse.json({ ok: false, error: "That does not look like a domain." }, { status: 422 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ ok: false, error: "We need a valid email to send the report to." }, { status: 422 });
  }

  const record = {
    reference: `LGB-${Date.now().toString(36).toUpperCase()}`,
    received: new Date().toISOString(),
    domain,
    email,
    company: str(body.company, 160),
    name: str(body.name, 120),
    role: str(body.role, 120),
    naics: str(body.naics, 40),
    notes: str(body.notes, 2000),
  };

  let persisted = false;
  try {
    const dir = join(process.cwd(), ".data");
    await mkdir(dir, { recursive: true });
    await appendFile(join(dir, "audit-requests.jsonl"), `${JSON.stringify(record)}\n`, "utf8");
    persisted = true;
  } catch {
    // Read-only filesystem (most serverless hosts). The log line below is
    // then the durable record, and we say so in the response.
  }

  console.info("[legible] audit request", JSON.stringify(record));

  return NextResponse.json({
    ok: true,
    reference: record.reference,
    persisted,
    next: "An operator reviews every queued audit before the report is sent.",
  });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { ok: false, error: "POST a JSON body with at least { domain, email }." },
    { status: 405 },
  );
}
