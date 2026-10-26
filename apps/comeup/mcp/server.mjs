#!/usr/bin/env node
/**
 * Come Up — stdio MCP server.
 *
 * Zero dependencies. Speaks the MCP framing over stdin/stdout and forwards tool
 * calls to a running Come Up deployment. Point it at production or at a local
 * dev server with COMEUP_ORIGIN.
 *
 *   COMEUP_ORIGIN=https://comeup.example node mcp/server.mjs
 *
 * Claude Desktop config lives in the README.
 */

const ORIGIN = (process.env.COMEUP_ORIGIN ?? "http://localhost:4803").replace(/\/$/, "");
const PROTOCOL_VERSION = "2024-11-05";

const TOOLS = [
  {
    name: "search_archive",
    description:
      "Search Ian Royes' builder archive with tag-first retrieval. Select by job, topic and audience before text. Returns cited items with their tag matches.",
    inputSchema: {
      type: "object",
      properties: {
        job: {
          type: "string",
          enum: [
            "find-wedge",
            "pick-customer",
            "price-offer",
            "get-distribution",
            "validate",
            "first-client",
            "ship-fast",
            "stay-broke-proof",
            "build-audience",
            "keep-going",
          ],
        },
        topics: { type: "array", items: { type: "string" } },
        audience: { type: "array", items: { type: "string" } },
        text: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 25 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "build_plan",
    description:
      "Turn a skill into a paid offer and a first 30 days. Returns the wedge, the customer, the first offer with a price, the first channel, the one thing to validate this week, a four-week board and kill criteria — each section cited to the archive.",
    inputSchema: {
      type: "object",
      properties: {
        situation: { type: "string" },
        tried: { type: "string" },
        where: { type: "string" },
        hoursPerWeek: { type: "integer", minimum: 1, maximum: 80 },
        budget: { type: "integer", minimum: 0 },
      },
      required: ["situation"],
      additionalProperties: false,
    },
  },
];

async function post(path, body) {
  const response = await fetch(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} → HTTP ${response.status}: ${text.slice(0, 300)}`);
  return text;
}

async function callTool(name, args) {
  if (name === "search_archive") {
    const text = await post("/api/v1/archive/search", args ?? {});
    return { content: [{ type: "text", text }] };
  }
  if (name === "build_plan") {
    const text = await post("/api/v1/plan", args ?? {});
    return { content: [{ type: "text", text }] };
  }
  return { content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }], isError: true };
}

/* ------------------------------------------------------ stdio framing */

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  for (;;) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      // Some clients speak newline-delimited JSON instead of LSP framing.
      const newline = buffer.indexOf("\n");
      if (newline === -1) return;
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) handle(line);
      continue;
    }
    const header = buffer.slice(0, headerEnd);
    const match = /content-length:\s*(\d+)/i.exec(header);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }
    const length = Number(match[1]);
    const start = headerEnd + 4;
    if (buffer.length < start + length) return;
    const payload = buffer.slice(start, start + length);
    buffer = buffer.slice(start + length);
    handle(payload);
  }
});

function send(message) {
  const json = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`);
}

async function handle(raw) {
  let request;
  try {
    request = JSON.parse(raw);
  } catch {
    return;
  }
  const { id, method, params } = request;

  try {
    if (method === "initialize") {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: "comeup", version: "0.1.0" },
        },
      });
      return;
    }
    if (method === "notifications/initialized") return;
    if (method === "ping") {
      send({ jsonrpc: "2.0", id, result: {} });
      return;
    }
    if (method === "tools/list") {
      send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
      return;
    }
    if (method === "tools/call") {
      const result = await callTool(params?.name, params?.arguments);
      send({ jsonrpc: "2.0", id, result });
      return;
    }
    if (id !== undefined) {
      send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (error) {
    if (id !== undefined) {
      send({ jsonrpc: "2.0", id, error: { code: -32603, message: error?.message ?? "Tool failed" } });
    }
  }
}

process.stdin.on("end", () => process.exit(0));
process.stderr.write(`comeup mcp server ready — origin ${ORIGIN}\n`);
