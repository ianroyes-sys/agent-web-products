#!/usr/bin/env node
/**
 * Arsenal Index — stdio MCP server.
 *
 * Zero dependencies on purpose: it reads the refined JSON off disk and speaks
 * JSON-RPC 2.0 over stdin/stdout with newline-delimited framing, which is what
 * Claude Desktop and the Claude Code CLI expect. Nothing to install, nothing
 * to break on a version bump.
 *
 *   node mcp/server.mjs
 *
 * Set ARSENAL_PAID=1 to unlock the paid tools locally.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROTOCOL_VERSION = "2025-06-18";
const FREE_ROWS = 15;
const PAID = process.env.ARSENAL_PAID === "1" || Boolean(process.env.ARSENAL_API_KEY);

const PRICES = {
  "recompetes.full": { amount: 0.02, currency: "USD", unit: "call" },
  "firms.detail": { amount: 0.01, currency: "USD", unit: "call" },
  "export.bulk": { amount: 2.5, currency: "USD", unit: "export" },
};

/* ---------------------------------------------------------------- data */

const CANDIDATES = [
  join(HERE, "../src/data/index.json"),
  resolve(HERE, "../../../data/out/index.json"),
  process.env.ARSENAL_INDEX_PATH ?? "",
].filter(Boolean);

const path = CANDIDATES.find((p) => existsSync(p));
if (!path) {
  process.stderr.write(
    `[arsenal-index] no index.json found. Looked in:\n${CANDIDATES.map((c) => `  ${c}`).join("\n")}\n` +
      `Run "npm run sync-data" in apps/arsenal-index, or set ARSENAL_INDEX_PATH.\n`,
  );
  process.exit(1);
}

const DB = JSON.parse(readFileSync(path, "utf8"));
DB.firms.sort((a, b) => b.total_value - a.total_value);
DB.recompetes.sort((a, b) => a.days_out - b.days_out);

const provenance = () => ({
  generated: DB.meta.generated,
  source: DB.meta.source,
  market: DB.meta.market,
  license: DB.meta.license,
});

/* --------------------------------------------------------------- tools */

const TOOLS = [
  {
    name: "search_firms",
    description:
      "Search prime contractors headquartered in the Huntsville, Alabama defense market. Filter by name text, NAICS code, lead agency, or size tier. Free.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name text or NAICS code prefix." },
        agency: { type: "string", description: "Lead agency substring, e.g. 'Defense'." },
        naics: { type: "string", description: "Exact 6-digit NAICS code." },
        tier: { type: "string", enum: ["major", "mid", "small"] },
        expiring_only: { type: "boolean", description: "Only firms with work expiring in 24 months." },
        limit: { type: "number", description: "Default 20, max 200." },
      },
    },
  },
  {
    name: "get_firm",
    description:
      "Full profile for one firm: totals, agency and NAICS mix, PSC codes, activity window, and every contract of theirs expiring within 24 months. Paid resource.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Firm slug, e.g. 'the-boeing'." } },
      required: ["id"],
    },
  },
  {
    name: "list_recompetes",
    description:
      "Contracts expiring in the next 24 months — the recompete radar. Free for the 15 most urgent rows; the full radar is paid.",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number" },
        agency: { type: "string" },
        naics: { type: "string" },
        band: { type: "string", enum: ["hot", "warm", "horizon"] },
        min_value: { type: "number" },
        query: { type: "string" },
        limit: { type: "number", description: `Free maximum ${FREE_ROWS}.` },
      },
    },
  },
  {
    name: "market_summary",
    description:
      "Aggregate structure of the market: obligated value, concentration, top agencies and firms, NAICS leaders, monthly movement. Free.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "capability_gap",
    description:
      "NAICS categories where the market has active multi-firm demand but the named firm holds no prime awards. Free.",
    inputSchema: {
      type: "object",
      properties: {
        firm_id: { type: "string", description: "Firm slug, e.g. 'the-boeing'." },
        limit: { type: "number", description: "Default 8, max 25." },
      },
      required: ["firm_id"],
    },
  },
];

const s = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * Mirrors band()/isBand() in src/lib/format.ts. Upper bounds are INCLUSIVE, so
 * band="hot" and days=90 return the same rows here and over HTTP. This server
 * is standalone by design, so the definition is duplicated — if you change one,
 * change both.
 */
const bandOf = (daysOut) => (daysOut <= 90 ? "hot" : daysOut <= 365 ? "warm" : "horizon");
const isBand = (v) => v === "hot" || v === "warm" || v === "horizon";
const clamp = (v, fallback, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.trunc(n), max) : fallback;
};

const paymentPayload = (resource, message) => ({
  error: "payment_required",
  resource,
  message,
  price: PRICES[resource],
  accepts: ["x402", "api_key"],
  schemes: {
    api_key: {
      status: "available",
      header: "X-API-Key",
      settlement: "Stripe subscription",
      subscribe: "https://arsenal-index.com/api-docs#pricing",
    },
    x402: {
      status: "pending",
      header: "X-Payment",
      settlement: "peer-to-peer stablecoin, via Cloudflare Monetization Gateway",
      note: "Waitlist-only, not generally available.",
    },
  },
  docs: "https://arsenal-index.com/api-docs",
  retry:
    "Set ARSENAL_PAID=1 locally, or call the HTTP API with an X-API-Key header. The x402 rail is not settling yet.",
});

function capabilityGap(firm, limit) {
  const held = new Set(firm.naics.map((n) => n.code));
  const topFirmFor = (code) => {
    let best = null;
    for (const f of DB.firms) {
      const hit = f.naics.find((n) => n.code === code);
      if (hit && (!best || hit.value > best.value)) best = { name: f.name, value: hit.value };
    }
    return best ? best.name : null;
  };
  return DB.naics
    .filter((n) => !held.has(n.code) && n.firm_count >= 3)
    .slice(0, limit)
    .map((n) => ({
      code: n.code,
      label: n.label,
      market_value: n.value,
      firm_count: n.firm_count,
      top_firm: topFirmFor(n.code),
    }));
}

function runTool(name, args = {}) {
  switch (name) {
    case "search_firms": {
      const q = s(args.query).toLowerCase();
      const agency = s(args.agency).toLowerCase();
      const naics = s(args.naics);
      const tier = s(args.tier).toLowerCase();
      const limit = clamp(args.limit, 20, 200);

      const matched = DB.firms.filter((f) => {
        if (tier && f.tier !== tier) return false;
        if (agency && !f.top_agency.toLowerCase().includes(agency)) return false;
        if (naics && !f.naics.some((n) => n.code === naics)) return false;
        if (args.expiring_only === true && f.expiring_count === 0) return false;
        if (!q) return true;
        return f.name.toLowerCase().includes(q) || f.naics.some((n) => n.code.startsWith(q));
      });

      return {
        ok: true,
        payload: {
          meta: { ...provenance(), count: Math.min(limit, matched.length), total: matched.length },
          firms: matched.slice(0, limit).map((f) => ({
            id: f.id,
            name: f.name,
            rank: f.rank,
            tier: f.tier,
            total_value: f.total_value,
            award_count: f.award_count,
            top_agency: f.top_agency,
            expiring_count: f.expiring_count,
            expiring_value: f.expiring_value,
            naics: f.naics.slice(0, 3).map((n) => ({ code: n.code, label: n.label })),
          })),
        },
      };
    }

    case "get_firm": {
      const firm = DB.firms.find((f) => f.id === s(args.id));
      if (!firm) {
        return {
          ok: false,
          payload: { error: "not_found", message: `No firm with id "${s(args.id)}". Try search_firms.` },
        };
      }
      if (!PAID) {
        return {
          ok: false,
          payload: paymentPayload(
            "firms.detail",
            `Full detail for "${firm.name}" is a paid resource. search_firms returns the free summary.`,
          ),
        };
      }
      return {
        ok: true,
        payload: {
          meta: provenance(),
          firm,
          recompetes: DB.recompetes.filter((r) => r.incumbent_key === firm.key),
          capability_gap: capabilityGap(firm, 12),
        },
      };
    }

    case "list_recompetes": {
      const asked = Number(args.limit);
      if (!PAID && Number.isFinite(asked) && asked > FREE_ROWS) {
        return {
          ok: false,
          payload: paymentPayload(
            "recompetes.full",
            `The free tier returns the ${FREE_ROWS} most urgent rows. The full ${DB.recompetes.length}-row radar is paid.`,
          ),
        };
      }

      const limit = PAID ? clamp(args.limit, 50, 2000) : FREE_ROWS;
      const days = Number(args.days);
      const minValue = Number(args.min_value);
      const agency = s(args.agency).toLowerCase();
      const naics = s(args.naics);
      const bandFilter = s(args.band).toLowerCase();
      const q = s(args.query).toLowerCase();

      const matched = DB.recompetes.filter((r) => {
        if (Number.isFinite(days) && days > 0 && r.days_out > days) return false;
        if (Number.isFinite(minValue) && minValue > 0 && r.value < minValue) return false;
        if (
          agency &&
          !(r.agency.toLowerCase().includes(agency) || r.sub_agency.toLowerCase().includes(agency))
        )
          return false;
        if (naics && r.naics !== naics) return false;
        if (isBand(bandFilter) && bandOf(r.days_out) !== bandFilter) return false;
        if (!q) return true;
        return (
          r.incumbent.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.naics_label.toLowerCase().includes(q) ||
          r.award_id.toLowerCase().includes(q)
        );
      });

      const rows = matched.slice(0, limit);
      return {
        ok: true,
        payload: {
          meta: {
            ...provenance(),
            tier: PAID ? "paid" : "free",
            count: rows.length,
            total: matched.length,
            truncated: rows.length < matched.length,
          },
          recompetes: rows,
        },
      };
    }

    case "market_summary": {
      const top5 = DB.firms.slice(0, 5).reduce((sum, f) => sum + f.total_value, 0);
      const trailing12 = DB.movement.slice(-12).reduce((sum, p) => sum + p.value, 0);
      const prior12 = DB.movement.slice(-24, -12).reduce((sum, p) => sum + p.value, 0);
      return {
        ok: true,
        payload: {
          meta: provenance(),
          market_value: DB.meta.market_value,
          firm_count: DB.meta.firm_count,
          recompete_count: DB.meta.recompete_count,
          recompete_value: DB.meta.recompete_value,
          top5_concentration: DB.meta.market_value > 0 ? top5 / DB.meta.market_value : 0,
          trailing_12mo_value: trailing12,
          yoy_change: prior12 > 0 ? trailing12 / prior12 - 1 : null,
          top_agencies: DB.agencies.slice(0, 8),
          top_naics: DB.naics.slice(0, 8),
          top_firms: DB.firms.slice(0, 8).map((f) => ({
            id: f.id,
            name: f.name,
            total_value: f.total_value,
          })),
          movement: DB.movement,
        },
      };
    }

    case "capability_gap": {
      const firm = DB.firms.find((f) => f.id === s(args.firm_id));
      if (!firm) {
        return {
          ok: false,
          payload: { error: "not_found", message: `No firm with id "${s(args.firm_id)}".` },
        };
      }
      return {
        ok: true,
        payload: {
          meta: provenance(),
          firm: { id: firm.id, name: firm.name },
          holds: firm.naics.map((n) => ({ code: n.code, label: n.label, value: n.value })),
          gaps: capabilityGap(firm, clamp(args.limit, 8, 25)),
          note: "A gap is a NAICS code with at least three active in-market firms and no prime award recorded for this firm. It indicates adjacency, not qualification.",
        },
      };
    }

    default:
      return { ok: false, payload: { error: "unknown_tool", message: `No tool named "${name}".` } };
  }
}

/* ------------------------------------------------------------ JSON-RPC */

function send(msg) {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}

function handle(req) {
  const { id, method, params } = req;

  if (method === "initialize") {
    return send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "arsenal-index", version: "0.1.0", title: "Arsenal Index" },
        instructions: `Huntsville, Alabama defense contracting index, generated ${DB.meta.generated}. ${DB.meta.firm_count} firms, ${DB.meta.recompete_count} contracts expiring within 24 months. Aggregates and the 15 most urgent recompetes are free; full firm detail and the full radar are paid.`,
      },
    });
  }

  // Notifications have no id and take no reply.
  if (method === "notifications/initialized" || method === "initialized") return;

  if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });

  if (method === "tools/list") return send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });

  if (method === "tools/call") {
    const name = params && typeof params.name === "string" ? params.name : "";
    const out = runTool(name, (params && params.arguments) || {});
    return send({
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify(out.payload, null, 2) }],
        isError: !out.ok,
      },
    });
  }

  if (id !== undefined && id !== null) {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    try {
      handle(JSON.parse(line));
    } catch (err) {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: `Parse error: ${err.message}` } });
    }
  }
});

process.stdin.on("end", () => process.exit(0));
process.stderr.write(
  `[arsenal-index] mcp stdio ready — ${DB.meta.firm_count} firms, ${DB.meta.recompete_count} recompetes, generated ${DB.meta.generated}${PAID ? " (paid tier unlocked)" : ""}\n`,
);
