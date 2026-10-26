#!/usr/bin/env python3
"""
Arsenal Index — the refinery.

Greg Isenberg's framing: the raw material already exists, our job is refining it.
For Huntsville GovCon the raw material is USAspending.gov (public, no API key),
which is valuable / repeated / changing / fragmented / annoying — all five filters.

Pulls prime contract awards for recipients headquartered in Madison County, AL
(FIPS 01089 = Huntsville / Madison / Redstone Arsenal), then refines them into
the structured outputs an agent can actually use.

    python3 refine.py            # full run, writes ../out/*.json
    python3 refine.py --pages 5  # quick run
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta

API = "https://api.usaspending.gov/api/v2"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out")

# Madison County, Alabama. Huntsville, Madison, Redstone Arsenal, Cummings Research Park.
COUNTY = {"country": "USA", "state": "AL", "county": "089"}

# Prime contract award types (A/B/C/D). Grants and loans are a different business.
AWARD_TYPES = ["A", "B", "C", "D"]

# How far back to look. Three federal fiscal years is enough to see a recompete
# cycle without drowning in dead history.
LOOKBACK_YEARS = 3

FIELDS = [
    "Award ID", "Recipient Name", "Award Amount", "Awarding Agency",
    "Awarding Sub Agency", "Start Date", "End Date", "Description",
    "Contract Award Type", "naics_code", "naics_description", "psc_code",
    "recipient_id", "generated_internal_id",
]

# Firms above this are primes/majors. They are not our customer — they are the
# competitive set our customer needs to understand and team with.
MAJOR_THRESHOLD = 250_000_000


def post(path, body, retries=4):
    url = f"{API}{path}"
    payload = json.dumps(body).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url, data=payload,
                headers={"Content-Type": "application/json",
                         "User-Agent": "ArsenalIndex/1.0 (Royz Media Group)"},
            )
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            if attempt == retries - 1:
                raise
            wait = 2 ** attempt
            print(f"   retry {attempt + 1}/{retries} after {wait}s ({e})", file=sys.stderr)
            time.sleep(wait)


def window():
    end = date.today()
    start = date(end.year - LOOKBACK_YEARS, 10, 1)
    return start.isoformat(), end.isoformat()


def norm(name):
    """USAspending emits the same legal entity under punctuation variants."""
    if not name:
        return ""
    n = " ".join(name.upper().split())
    for junk in (",", "."):
        n = n.replace(junk, "")
    for suffix in (" INCORPORATED", " INC", " LLC", " L L C", " CORPORATION",
                   " CORP", " COMPANY", " CO", " LP", " LTD", " PLLC"):
        if n.endswith(suffix):
            n = n[: -len(suffix)]
    return n.strip()


def fetch_awards(max_pages):
    """Prime awards where the RECIPIENT is headquartered in Madison County."""
    start, end = window()
    awards, page = [], 1
    while page <= max_pages:
        body = {
            "filters": {
                "time_period": [{"start_date": start, "end_date": end}],
                "award_type_codes": AWARD_TYPES,
                "recipient_locations": [COUNTY],
            },
            "fields": FIELDS,
            "limit": 100, "page": page,
            "sort": "Award Amount", "order": "desc", "subawards": False,
        }
        r = post("/search/spending_by_award/", body)
        rows = r.get("results", [])
        awards.extend(rows)
        print(f"   page {page:>3}  +{len(rows):>3} awards  (total {len(awards)})")
        if not r.get("page_metadata", {}).get("hasNext") or not rows:
            break
        page += 1
        time.sleep(0.25)
    return awards


def money(x):
    try:
        return float(x or 0)
    except (TypeError, ValueError):
        return 0.0


def parse_date(s):
    if not s:
        return None
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def clean_description(d):
    """
    USAspending descriptions are frequently raw fixed-width DoD extract strings
    stuffed with ! delimiters. Extracting the human-readable fragment IS the
    refining step — this is the messy-internet-to-clean-fuel conversion.
    """
    if not d:
        return ""
    d = d.strip()
    if "!" not in d:
        return " ".join(d.split())[:300]
    parts = [p.strip() for p in d.split("!")]
    # Pick the longest mostly-alphabetic fragment; that's the real description.
    best = ""
    for p in parts:
        if len(p) < 8:
            continue
        alpha = sum(c.isalpha() or c.isspace() for c in p) / len(p)
        if alpha > 0.75 and len(p) > len(best):
            best = p
    return " ".join(best.split())[:300]


def build(awards):
    firms = defaultdict(lambda: {
        "name": None, "aliases": set(), "recipient_ids": set(),
        "total": 0.0, "award_count": 0,
        "agencies": defaultdict(float), "sub_agencies": defaultdict(float),
        "naics": defaultdict(float), "psc": defaultdict(float),
        "first_seen": None, "last_seen": None,
        "active_value": 0.0, "expiring": [],
    })

    today = date.today()
    horizon = today + timedelta(days=730)   # 24-month recompete radar
    monthly = defaultdict(float)
    naics_market = defaultdict(lambda: {"value": 0.0, "count": 0, "firms": set(),
                                        "label": ""})
    agency_market = defaultdict(lambda: {"value": 0.0, "count": 0, "firms": set()})
    recompetes = []

    for a in awards:
        raw_name = a.get("Recipient Name")
        if not raw_name:
            continue
        key = norm(raw_name)
        if not key:
            continue
        amt = money(a.get("Award Amount"))
        f = firms[key]
        f["name"] = f["name"] or raw_name.title()
        f["aliases"].add(raw_name)
        if a.get("recipient_id"):
            f["recipient_ids"].add(a["recipient_id"])
        f["total"] += amt
        f["award_count"] += 1

        agency = a.get("Awarding Agency") or "Unknown"
        sub = a.get("Awarding Sub Agency") or "Unknown"
        f["agencies"][agency] += amt
        f["sub_agencies"][sub] += amt
        agency_market[agency]["value"] += amt
        agency_market[agency]["count"] += 1
        agency_market[agency]["firms"].add(key)

        code = a.get("naics_code")
        if code:
            label = (a.get("naics_description") or "").title()
            f["naics"][code] += amt
            naics_market[code]["value"] += amt
            naics_market[code]["count"] += 1
            naics_market[code]["firms"].add(key)
            if label:
                naics_market[code]["label"] = label
        if a.get("psc_code"):
            f["psc"][a["psc_code"]] += amt

        sd, ed = parse_date(a.get("Start Date")), parse_date(a.get("End Date"))
        if sd:
            if not f["first_seen"] or sd < f["first_seen"]:
                f["first_seen"] = sd
            if not f["last_seen"] or sd > f["last_seen"]:
                f["last_seen"] = sd
            if sd >= today - timedelta(days=365 * LOOKBACK_YEARS):
                monthly[sd.strftime("%Y-%m")] += amt

        # Recompete radar: an active contract with a known expiry inside the
        # 24-month horizon is a dated, defensible sales trigger.
        if ed and today < ed <= horizon and amt > 0:
            entry = {
                "award_id": a.get("Award ID"),
                "incumbent": raw_name.title(),
                "incumbent_key": key,
                "value": round(amt, 2),
                "end_date": ed.isoformat(),
                "days_out": (ed - today).days,
                "agency": agency,
                "sub_agency": sub,
                "naics": code,
                "naics_label": (a.get("naics_description") or "").title(),
                "type": a.get("Contract Award Type"),
                "description": clean_description(a.get("Description")),
                "url": f"https://www.usaspending.gov/award/{a.get('generated_internal_id')}"
                       if a.get("generated_internal_id") else None,
            }
            recompetes.append(entry)
            f["expiring"].append(entry)
        if ed and ed > today:
            f["active_value"] += amt

    # ---- shape firms ------------------------------------------------------
    out_firms = []
    for key, f in firms.items():
        top_naics = sorted(f["naics"].items(), key=lambda kv: -kv[1])[:6]
        out_firms.append({
            "id": key.lower().replace(" ", "-").replace("/", "-")[:60],
            "key": key,
            "name": f["name"],
            "total_value": round(f["total"], 2),
            "active_value": round(f["active_value"], 2),
            "award_count": f["award_count"],
            "tier": "major" if f["total"] >= MAJOR_THRESHOLD else (
                "mid" if f["total"] >= 25_000_000 else "small"),
            "top_agency": max(f["agencies"], key=f["agencies"].get) if f["agencies"] else None,
            "agencies": [{"name": k, "value": round(v, 2)}
                         for k, v in sorted(f["agencies"].items(), key=lambda kv: -kv[1])[:8]],
            "sub_agencies": [{"name": k, "value": round(v, 2)}
                             for k, v in sorted(f["sub_agencies"].items(), key=lambda kv: -kv[1])[:8]],
            "naics": [{"code": c, "value": round(v, 2),
                       "label": naics_market[c]["label"]} for c, v in top_naics],
            "psc": [{"code": c, "value": round(v, 2)}
                    for c, v in sorted(f["psc"].items(), key=lambda kv: -kv[1])[:6]],
            "first_seen": f["first_seen"].isoformat() if f["first_seen"] else None,
            "last_seen": f["last_seen"].isoformat() if f["last_seen"] else None,
            "expiring_count": len(f["expiring"]),
            "expiring_value": round(sum(e["value"] for e in f["expiring"]), 2),
        })
    out_firms.sort(key=lambda x: -x["total_value"])
    for i, f in enumerate(out_firms, 1):
        f["rank"] = i

    recompetes.sort(key=lambda r: r["days_out"])

    naics_out = sorted(
        [{"code": c, "label": v["label"] or c, "value": round(v["value"], 2),
          "award_count": v["count"], "firm_count": len(v["firms"]),
          "concentration": round(1 / len(v["firms"]), 3) if v["firms"] else 1.0}
         for c, v in naics_market.items()],
        key=lambda x: -x["value"])

    agency_out = sorted(
        [{"name": k, "value": round(v["value"], 2), "award_count": v["count"],
          "firm_count": len(v["firms"])} for k, v in agency_market.items()],
        key=lambda x: -x["value"])

    movement = [{"month": m, "value": round(v, 2)} for m, v in sorted(monthly.items())]

    return {
        "firms": out_firms,
        "recompetes": recompetes,
        "naics": naics_out,
        "agencies": agency_out,
        "movement": movement,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=60,
                    help="max pages of 100 awards (default 60 = 6,000 awards)")
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    print("Arsenal Index — refining Huntsville GovCon (Madison County, AL)")
    print(f"   source: USAspending.gov  ·  lookback: {LOOKBACK_YEARS} FY  ·  max {args.pages} pages")

    awards = fetch_awards(args.pages)
    print(f"\n   {len(awards):,} raw prime awards pulled. Refining...")

    built = build(awards)
    today = date.today().isoformat()

    total_value = sum(f["total_value"] for f in built["firms"])
    meta = {
        "generated": today,
        "source": "USAspending.gov API v2 (public domain, no key required)",
        "market": "Huntsville / Madison County, Alabama (FIPS 01089)",
        "scope": "Prime contract awards, recipient headquartered in-market",
        "lookback_fy": LOOKBACK_YEARS,
        "raw_awards": len(awards),
        "firm_count": len(built["firms"]),
        "market_value": round(total_value, 2),
        "recompete_count": len(built["recompetes"]),
        "recompete_value": round(sum(r["value"] for r in built["recompetes"]), 2),
        "license": "Derived work. Underlying federal spending data is public domain.",
        "publisher": "Arsenal Index — a Royz Media Group company",
    }

    def write(name, payload):
        p = os.path.join(OUT, name)
        with open(p, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=1, default=str)
        print(f"   wrote {name:<22} {os.path.getsize(p) / 1024:>8,.0f} KB")

    write("meta.json", meta)
    write("firms.json", built["firms"])
    write("recompetes.json", built["recompetes"])
    write("naics.json", built["naics"])
    write("agencies.json", built["agencies"])
    write("movement.json", built["movement"])

    # The single denormalized file the Next.js app and MCP server both read.
    write("index.json", {"meta": meta, **built})

    print(f"\n   {meta['firm_count']:,} firms · ${meta['market_value'] / 1e9:,.1f}B tracked "
          f"· {meta['recompete_count']:,} contracts expiring in 24mo "
          f"(${meta['recompete_value'] / 1e9:,.1f}B in play)")


if __name__ == "__main__":
    main()
