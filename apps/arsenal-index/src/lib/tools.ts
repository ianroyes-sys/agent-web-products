/**
 * The MCP tool surface, shared by the HTTP endpoint at /api/mcp.
 * Kept free of Next imports so the logic stays portable.
 */
import {
  capabilityGap,
  firmPeers,
  firmRecompetes,
  getAgencies,
  getFirm,
  getFirms,
  getMeta,
  getMovement,
  getNaics,
  getRecompetes,
} from "./data";
import { inBand, isBand } from "./format";
import { FREE_RECOMPETE_ROWS, PRICES } from "./paywall";

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const TOOLS: ToolDef[] = [
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
        expiring_only: {
          type: "boolean",
          description: "Only firms holding contracts that expire within 24 months.",
        },
        limit: { type: "number", description: "Default 20, max 200." },
      },
    },
  },
  {
    name: "get_firm",
    description:
      "Full profile for one firm: obligated totals, agency and NAICS mix, PSC codes, activity window, and every contract of theirs expiring within 24 months. Paid resource.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Firm slug, e.g. 'the-boeing'. Use search_firms to find it." },
      },
      required: ["id"],
    },
  },
  {
    name: "list_recompetes",
    description:
      "Contracts expiring in the next 24 months — the recompete radar. Free for the 15 most urgent rows; the full radar is a paid resource.",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Only contracts expiring within this many days." },
        agency: { type: "string", description: "Agency or buying office substring." },
        naics: { type: "string", description: "Exact 6-digit NAICS code." },
        band: { type: "string", enum: ["hot", "warm", "horizon"] },
        min_value: { type: "number", description: "Minimum obligated value in dollars." },
        query: { type: "string", description: "Free text across incumbent, description, and award ID." },
        limit: { type: "number", description: `Default and free maximum ${FREE_RECOMPETE_ROWS}.` },
      },
    },
  },
  {
    name: "market_summary",
    description:
      "Aggregate structure of the market: total obligated value, concentration, top agencies and firms, NAICS leaders, and monthly movement. Free.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "capability_gap",
    description:
      "NAICS categories where this market has active, multi-firm demand but the named firm holds no prime awards. Useful for expansion and teaming analysis. Free.",
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

export interface ToolResult {
  ok: boolean;
  payload: unknown;
}

function clamp(n: unknown, fallback: number, max: number): number {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.min(Math.trunc(v), max) : fallback;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function provenance() {
  const m = getMeta();
  return { generated: m.generated, source: m.source, market: m.market, license: m.license };
}

function paymentPayload(resource: keyof typeof PRICES, message: string) {
  return {
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
        subscribe: "/api-docs#pricing",
      },
      x402: {
        status: "pending",
        header: "X-Payment",
        settlement: "peer-to-peer stablecoin, via Cloudflare Monetization Gateway",
        note: "Waitlist-only, not generally available.",
      },
    },
    docs: "/api-docs",
    retry:
      "Send an X-API-Key header on the MCP transport, then call again. The x402 rail is not settling yet.",
  };
}

export function runTool(
  name: string,
  args: Record<string, unknown>,
  opts: { paid: boolean } = { paid: false },
): ToolResult {
  switch (name) {
    case "search_firms": {
      const q = str(args.query).toLowerCase();
      const agency = str(args.agency).toLowerCase();
      const naics = str(args.naics);
      const tier = str(args.tier).toLowerCase();
      const expiringOnly = args.expiring_only === true;
      const limit = clamp(args.limit, 20, 200);

      const matched = getFirms().filter((f) => {
        if (tier && f.tier !== tier) return false;
        if (agency && !f.top_agency.toLowerCase().includes(agency)) return false;
        if (naics && !f.naics.some((n) => n.code === naics)) return false;
        if (expiringOnly && f.expiring_count === 0) return false;
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
      const id = str(args.id);
      const firm = getFirm(id);
      if (!firm) {
        return {
          ok: false,
          payload: {
            error: "not_found",
            message: `No firm with id "${id}". Use search_firms to resolve a name to an id.`,
          },
        };
      }
      if (!opts.paid) {
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
          recompetes: firmRecompetes(firm),
          capability_gap: capabilityGap(firm, 12),
          peers: firmPeers(firm, 6).map((p) => ({ id: p.id, name: p.name, total_value: p.total_value })),
        },
      };
    }

    case "list_recompetes": {
      const days = Number(args.days);
      const minValue = Number(args.min_value);
      const agency = str(args.agency).toLowerCase();
      const naics = str(args.naics);
      const bandFilter = str(args.band).toLowerCase();
      const q = str(args.query).toLowerCase();
      const askedLimit = Number(args.limit);

      if (!opts.paid && Number.isFinite(askedLimit) && askedLimit > FREE_RECOMPETE_ROWS) {
        return {
          ok: false,
          payload: paymentPayload(
            "recompetes.full",
            `The free tier returns the ${FREE_RECOMPETE_ROWS} most urgent rows. The full ${getRecompetes().length}-row radar is paid.`,
          ),
        };
      }

      const limit = opts.paid
        ? clamp(args.limit, 50, 2000)
        : clamp(args.limit, FREE_RECOMPETE_ROWS, FREE_RECOMPETE_ROWS);

      const matched = getRecompetes().filter((r) => {
        if (Number.isFinite(days) && days > 0 && r.days_out > days) return false;
        if (Number.isFinite(minValue) && minValue > 0 && r.value < minValue) return false;
        if (
          agency &&
          !(r.agency.toLowerCase().includes(agency) || r.sub_agency.toLowerCase().includes(agency))
        )
          return false;
        if (naics && r.naics !== naics) return false;
        // One shared definition, so band=hot and days=90 return the same rows.
        if (isBand(bandFilter) && !inBand(r.days_out, bandFilter)) return false;
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
            tier: opts.paid ? "paid" : "free",
            count: rows.length,
            total: matched.length,
            truncated: rows.length < matched.length,
            ...(opts.paid
              ? {}
              : { upgrade: `Paid access returns all ${matched.length} matching rows. See /api-docs.` }),
          },
          recompetes: rows,
        },
      };
    }

    case "market_summary": {
      const meta = getMeta();
      const firms = getFirms();
      const movement = getMovement();
      const top5 = firms.slice(0, 5).reduce((s, f) => s + f.total_value, 0);
      const trailing12 = movement.slice(-12).reduce((s, p) => s + p.value, 0);
      const prior12 = movement.slice(-24, -12).reduce((s, p) => s + p.value, 0);

      return {
        ok: true,
        payload: {
          meta: provenance(),
          market_value: meta.market_value,
          firm_count: meta.firm_count,
          recompete_count: meta.recompete_count,
          recompete_value: meta.recompete_value,
          lookback_fy: meta.lookback_fy,
          top5_concentration: meta.market_value > 0 ? top5 / meta.market_value : 0,
          trailing_12mo_value: trailing12,
          yoy_change: prior12 > 0 ? trailing12 / prior12 - 1 : null,
          top_agencies: getAgencies()
            .slice(0, 8)
            .map((a) => ({ name: a.name, value: a.value, firm_count: a.firm_count })),
          top_naics: getNaics()
            .slice(0, 8)
            .map((n) => ({ code: n.code, label: n.label, value: n.value, firm_count: n.firm_count })),
          top_firms: firms
            .slice(0, 8)
            .map((f) => ({ id: f.id, name: f.name, total_value: f.total_value })),
          movement,
        },
      };
    }

    case "capability_gap": {
      const firm = getFirm(str(args.firm_id));
      if (!firm) {
        return {
          ok: false,
          payload: {
            error: "not_found",
            message: `No firm with id "${str(args.firm_id)}". Use search_firms first.`,
          },
        };
      }
      const limit = clamp(args.limit, 8, 25);
      return {
        ok: true,
        payload: {
          meta: provenance(),
          firm: { id: firm.id, name: firm.name },
          holds: firm.naics.map((n) => ({ code: n.code, label: n.label, value: n.value })),
          gaps: capabilityGap(firm, limit),
          note: "A gap is a NAICS code with at least three active in-market firms and no prime award recorded for this firm. It indicates adjacency, not qualification.",
        },
      };
    }

    default:
      return { ok: false, payload: { error: "unknown_tool", message: `No tool named "${name}".` } };
  }
}
