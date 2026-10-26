import { getMeta } from "@/lib/data";
import { checkPayment } from "@/lib/paywall";
import { TOOLS, runTool } from "@/lib/tools";

/**
 * Streamable-HTTP MCP endpoint, JSON-RPC 2.0 over POST.
 *
 * Implemented by hand rather than with the SDK: the wire format is three
 * methods and pulling in a transport stack to speak them would be more
 * surface area than the whole rest of this route.
 */

const PROTOCOL_VERSION = "2025-06-18";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function result(id: string | number | null | undefined, payload: unknown) {
  return Response.json(
    { jsonrpc: "2.0", id: id ?? null, result: payload },
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
  );
}

function rpcError(id: string | number | null | undefined, code: number, message: string) {
  return Response.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** A GET on the endpoint returns the descriptor, so it is browsable. */
export function GET() {
  const meta = getMeta();
  return Response.json({
    protocol: "mcp",
    protocolVersion: PROTOCOL_VERSION,
    transport: "streamable-http",
    name: "arsenal-index",
    instructions:
      "POST JSON-RPC 2.0 to this URL. Methods: initialize, tools/list, tools/call. Paid tools accept X-Payment or X-API-Key headers.",
    generated: meta.generated,
    tools: TOOLS.map((t) => t.name),
  });
}

export async function POST(req: Request) {
  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error: body must be JSON-RPC 2.0.");
  }

  const { id, method, params } = body;
  const { paid } = checkPayment(req);

  switch (method) {
    case "initialize":
      return result(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: "arsenal-index",
          version: "0.1.0",
          title: "Arsenal Index",
        },
        instructions: `Huntsville, Alabama defense contracting index, generated ${getMeta().generated}. Aggregates and the 15 most urgent recompetes are free; full firm detail and the full radar are paid — those tools return a payment_required payload with the price when unpaid.`,
      });

    // Notifications carry no id and expect no result body.
    case "notifications/initialized":
    case "initialized":
      return new Response(null, { status: 202 });

    case "ping":
      return result(id, {});

    case "tools/list":
      return result(id, { tools: TOOLS });

    case "tools/call": {
      const name = typeof params?.name === "string" ? params.name : "";
      const args = (params?.arguments ?? {}) as Record<string, unknown>;
      if (!name) return rpcError(id, -32602, "tools/call requires params.name");

      const out = runTool(name, args, { paid });
      return result(id, {
        content: [{ type: "text", text: JSON.stringify(out.payload, null, 2) }],
        isError: !out.ok,
      });
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method ?? "(none)"}`);
  }
}
