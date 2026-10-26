import { callTool, TOOLS } from "@/lib/agent/tools";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MCP over plain JSON-RPC on POST. No SDK: the three methods a client needs to
 * discover and call two tools are small enough to implement honestly, and a
 * dependency here would be weight for nothing.
 */
const PROTOCOL_VERSION = "2024-11-05";

interface RpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function ok(id: RpcRequest["id"], result: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function fail(id: RpcRequest["id"], code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

export async function GET() {
  return Response.json({
    transport: "json-rpc over POST",
    protocolVersion: PROTOCOL_VERSION,
    methods: ["initialize", "tools/list", "tools/call"],
    tools: TOOLS.map((tool) => tool.name),
  });
}

export async function POST(request: Request) {
  let body: RpcRequest;
  try {
    body = (await request.json()) as RpcRequest;
  } catch {
    return fail(null, -32700, "Parse error");
  }

  const { id, method, params } = body;

  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "comeup", version: "0.1.0", description: SITE.job },
      });

    case "notifications/initialized":
      return new Response(null, { status: 204 });

    case "tools/list":
      return ok(id, { tools: TOOLS });

    case "tools/call": {
      const name = typeof params?.name === "string" ? params.name : "";
      const args = (params?.arguments ?? {}) as Record<string, unknown>;
      if (!name) return fail(id, -32602, "Missing tool name");
      try {
        const result = await callTool(name, args);
        return ok(id, result);
      } catch (error) {
        return fail(id, -32603, error instanceof Error ? error.message : "Tool failed");
      }
    }

    case "ping":
      return ok(id, {});

    default:
      return fail(id, -32601, `Method not found: ${method ?? "(none)"}`);
  }
}
