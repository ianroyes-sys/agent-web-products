/**
 * Shapes of the refinery output (data/out/index.json).
 * These mirror the generator exactly — if the generator changes, change here.
 */

export type Tier = "major" | "mid" | "small";

export interface IndexMeta {
  generated: string;
  source: string;
  market: string;
  scope: string;
  lookback_fy: number;
  raw_awards: number;
  firm_count: number;
  market_value: number;
  recompete_count: number;
  recompete_value: number;
  license: string;
  publisher: string;
}

export interface ValueSlice {
  name: string;
  value: number;
}

export interface NaicsSlice {
  code: string;
  value: number;
  label: string;
}

export interface PscSlice {
  code: string;
  value: number;
}

export interface Firm {
  id: string;
  key: string;
  name: string;
  total_value: number;
  active_value: number;
  award_count: number;
  tier: Tier;
  rank: number;
  top_agency: string;
  agencies: ValueSlice[];
  sub_agencies: ValueSlice[];
  naics: NaicsSlice[];
  psc: PscSlice[];
  first_seen: string;
  last_seen: string;
  expiring_count: number;
  expiring_value: number;
}

export interface Recompete {
  award_id: string;
  incumbent: string;
  incumbent_key: string;
  value: number;
  end_date: string;
  days_out: number;
  agency: string;
  sub_agency: string;
  naics: string;
  naics_label: string;
  type: string;
  description: string;
  url: string;
}

export interface NaicsRow {
  code: string;
  label: string;
  value: number;
  award_count: number;
  firm_count: number;
  concentration: number;
}

export interface AgencyRow {
  name: string;
  value: number;
  award_count: number;
  firm_count: number;
}

export interface MovementPoint {
  month: string;
  value: number;
}

export interface ArsenalIndexFile {
  meta: IndexMeta;
  firms: Firm[];
  recompetes: Recompete[];
  naics: NaicsRow[];
  agencies: AgencyRow[];
  movement: MovementPoint[];
}

/** Urgency bands on the Recompete Radar. */
export type Band = "hot" | "warm" | "horizon";

export interface CapabilityGap {
  code: string;
  label: string;
  market_value: number;
  firm_count: number;
  top_firm: string | null;
}
