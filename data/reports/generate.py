#!/usr/bin/env python3
"""
Arsenal Index — report generator.

The crawl stage of crawl/walk/run. Before the dashboard, before the API, before
the MCP tool, the product is a report you can attach to an email. This produces
those reports as markdown from the refined dataset.

    python3 generate.py                    # all reports
    python3 generate.py --firm torch-technologies
"""

import argparse
import json
import os
from collections import defaultdict
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "out")
OUT = os.path.join(HERE, "out")

BRAND = "Arsenal Index — a Royz Media Group company"


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


def usd(n):
    n = float(n or 0)
    for cut, suf in ((1e9, "B"), (1e6, "M"), (1e3, "K")):
        if abs(n) >= cut:
            return f"${n / cut:,.1f}{suf}"
    return f"${n:,.0f}"


def header(title, meta, subtitle=""):
    return (
        f"# {title}\n\n"
        f"{subtitle}\n\n" if subtitle else f"# {title}\n\n"
    ) + (
        f"**Market:** {meta['market']}  \n"
        f"**Generated:** {meta['generated']}  \n"
        f"**Source:** {meta['source']}  \n"
        f"**Coverage:** {meta['scope']}, {meta['lookback_fy']} fiscal years, "
        f"{meta['raw_awards']:,} awards\n\n"
        f"---\n\n"
    )


def footer():
    return (
        "\n---\n\n"
        "Derived from public-domain federal spending data. Contract values reflect "
        "award value, not revenue or money already spent. Expiry dates are the "
        "dates on record — options, extensions, and bridges are common, so treat a "
        "date as a signal to act on rather than a guaranteed competition. Prime "
        "awards only; subcontract activity is not covered.\n\n"
        f"*{BRAND}*\n"
    )


# --------------------------------------------------------------------------
# 1. Recompete Radar — the flagship
# --------------------------------------------------------------------------
def recompete_radar(meta, recompetes, days=180, limit=60):
    rows = [r for r in recompetes if 0 <= r["days_out"] <= days][:limit]
    total = sum(r["value"] for r in rows)

    md = header(
        "Recompete Radar",
        meta,
        f"Every tracked prime contract expiring in the next {days} days, with the "
        f"incumbent holding it.",
    )
    md += (
        f"**{len(rows)} contracts** expiring within {days} days · "
        f"**{usd(total)}** in combined value.\n\n"
        "In government contracting a dated expiry is the moment an incumbent can be "
        "displaced — and unlike most sales triggers, it is knowable months ahead.\n\n"
    )
    md += "| Days | Expires | Value | Incumbent | Awarding office |\n"
    md += "|---:|---|---:|---|---|\n"
    for r in rows:
        md += (
            f"| {r['days_out']} | {r['end_date']} | {usd(r['value'])} | "
            f"{r['incumbent']} | {r['sub_agency'] or '—'} |\n"
        )
    md += "\n### The nearest ten, in detail\n\n"
    for r in rows[:10]:
        desc = r["description"] or "No description on record."
        md += (
            f"**{r['incumbent']}** — {usd(r['value'])}, expires {r['end_date']} "
            f"({r['days_out']} days)  \n"
            f"{r['sub_agency'] or 'Unknown office'} · NAICS {r['naics']} "
            f"{r['naics_label']}  \n"
            f"{desc}  \n"
            + (f"[Award record]({r['url']})  \n\n" if r["url"] else "\n")
        )
    return md + footer()


# --------------------------------------------------------------------------
# 2. Small-business prospect list — who we actually sell to
# --------------------------------------------------------------------------
def prospect_list(meta, firms):
    small = [f for f in firms if f["tier"] == "small" and f["expiring_count"] > 0]
    small.sort(key=lambda f: -f["expiring_value"])

    md = header(
        "Small-Business Prospect List",
        meta,
        "Locally headquartered small contractors with contracts coming up for "
        "renewal — the firms with the most immediate reason to care about "
        "competitive intelligence.",
    )
    md += (
        f"**{len(small)} firms** below $25M in tracked value, each holding at least "
        f"one contract expiring within 24 months.\n\n"
        "| # | Firm | Tracked value | Awards | Expiring | At risk |\n"
        "|---:|---|---:|---:|---:|---:|\n"
    )
    for i, f in enumerate(small[:75], 1):
        md += (
            f"| {i} | {f['name']} | {usd(f['total_value'])} | {f['award_count']} | "
            f"{f['expiring_count']} | {usd(f['expiring_value'])} |\n"
        )
    return md + footer()


# --------------------------------------------------------------------------
# 3. Agency concentration
# --------------------------------------------------------------------------
def agency_map(meta, agencies, naics):
    md = header(
        "Agency and Capability Concentration",
        meta,
        "Where the money in this market actually comes from, and how contested "
        "each capability area is.",
    )
    md += "## Awarding agencies\n\n| Agency | Value | Awards | Local firms |\n|---|---:|---:|---:|\n"
    for a in agencies[:15]:
        md += f"| {a['name']} | {usd(a['value'])} | {a['award_count']:,} | {a['firm_count']} |\n"

    md += (
        "\n## Capability areas by NAICS\n\n"
        "A low firm count against a high value is a concentrated area — harder to "
        "enter, but the incumbent set is small enough to name. A high firm count is "
        "a commodity area where price pressure is real.\n\n"
        "| NAICS | Capability | Value | Firms | Read |\n|---|---|---:|---:|---|\n"
    )
    for n in naics[:20]:
        if n["firm_count"] <= 3:
            read = "Concentrated"
        elif n["firm_count"] <= 15:
            read = "Contested"
        else:
            read = "Commodity"
        md += (
            f"| {n['code']} | {n['label'][:44]} | {usd(n['value'])} | "
            f"{n['firm_count']} | {read} |\n"
        )
    md += (
        "\n> Federal NAICS coding is entered by the contracting office and carries "
        "real errors. Treat these as strong hints, not ground truth — see CAVEATS.\n"
    )
    return md + footer()


# --------------------------------------------------------------------------
# 4. Capability gap — per firm
# --------------------------------------------------------------------------
def capability_gap(meta, firms, naics, firm_id):
    firm = next((f for f in firms if f["id"] == firm_id or f["key"] == firm_id.upper()), None)
    if not firm:
        return None, None
    held = {n["code"] for n in firm["naics"]}
    peers = [f for f in firms if f["tier"] == firm["tier"] and f["id"] != firm["id"]]
    peer_codes = defaultdict(float)
    for p in peers:
        for n in p["naics"]:
            peer_codes[n["code"]] += n["value"]
    gaps = sorted(
        [(c, v) for c, v in peer_codes.items() if c not in held],
        key=lambda kv: -kv[1],
    )[:12]
    labels = {n["code"]: n["label"] for n in naics}
    counts = {n["code"]: n["firm_count"] for n in naics}

    md = header(
        f"Capability Gap — {firm['name']}",
        meta,
        "Capability areas where comparable local firms are winning work and this "
        "firm has no awards on record.",
    )
    md += (
        f"**Rank {firm['rank']} of {len(firms)}** in-market · "
        f"{usd(firm['total_value'])} tracked across {firm['award_count']} awards · "
        f"tier: {firm['tier']} · primary customer: {firm['top_agency'] or '—'}\n\n"
        f"{firm['expiring_count']} contracts expiring within 24 months "
        f"({usd(firm['expiring_value'])}).\n\n"
        "## Where they currently win\n\n| NAICS | Capability | Value |\n|---|---|---:|\n"
    )
    for n in firm["naics"]:
        md += f"| {n['code']} | {n['label'][:44] or '—'} | {usd(n['value'])} |\n"

    md += (
        "\n## Where comparable firms win and they do not\n\n"
        "| NAICS | Capability | Peer value | Firms competing |\n|---|---|---:|---:|\n"
    )
    for c, v in gaps:
        md += f"| {c} | {(labels.get(c) or '—')[:44]} | {usd(v)} | {counts.get(c, '—')} |\n"
    md += (
        "\nA gap is a conversation starter, not a verdict — a firm may have "
        "deliberately chosen not to compete in an area, and NAICS coding is "
        "imperfect. Use this to ask a better question, not to assert a weakness.\n"
    )
    return md + footer(), firm["name"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--firm", help="firm id for a capability gap report")
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    meta = load("meta.json")
    firms = load("firms.json")
    recompetes = load("recompetes.json")
    naics = load("naics.json")
    agencies = load("agencies.json")

    written = []

    def w(name, content):
        p = os.path.join(OUT, name)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        written.append((name, os.path.getsize(p)))

    w("01-recompete-radar-180d.md", recompete_radar(meta, recompetes, days=180))
    w("02-recompete-radar-90d.md", recompete_radar(meta, recompetes, days=90, limit=40))
    w("03-small-business-prospects.md", prospect_list(meta, firms))
    w("04-agency-capability-map.md", agency_map(meta, agencies, naics))

    target = args.firm or next(
        (f["id"] for f in firms if f["tier"] == "mid" and f["expiring_count"] > 0), None
    )
    if target:
        md, name = capability_gap(meta, firms, naics, target)
        if md:
            w("05-capability-gap-sample.md", md)
            print(f"   capability gap sample built for: {name}")

    print(f"\nReports written to {os.path.relpath(OUT)}:")
    for n, s in written:
        print(f"   {n:<38} {s / 1024:>7,.0f} KB")
    print(f"\nGenerated {date.today().isoformat()} · {BRAND}")


if __name__ == "__main__":
    main()
