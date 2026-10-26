#!/usr/bin/env python3
"""
Arsenal Index — claim verifier.

Every number in the sales material is checked here against the current dataset.
Run this before any outreach send, and after every refinery run.

The reason this exists: we sell data credibility. A prospect who catches one
overstated figure will not trust the feed again, and in a market of 426 firms
where everyone knows everyone, that is not a recoverable error.

    python3 verify.py           # exits non-zero if any claim fails

Claims are declared, not inferred. When a number in docs/ changes, change it here
too — a claim this file does not know about is a claim nobody is checking.
"""

import json
import os
import sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")


def load(n):
    with open(os.path.join(OUT, n), encoding="utf-8") as f:
        return json.load(f)


meta = load("meta.json")
firms = load("firms.json")
recompetes = load("recompetes.json")
naics = load("naics.json")
agencies = load("agencies.json")


def concentration(min_value, threshold, key):
    n = 0
    for f in firms:
        if f["total_value"] < min_value:
            continue
        vals = [i["value"] for i in f[key]]
        total = sum(vals)
        if total <= 0:
            continue
        if max(vals) / total > threshold:
            n += 1
    return n


def window(lo, hi):
    rows = [r for r in recompetes if lo <= r["days_out"] <= hi]
    return len(rows), sum(r["value"] for r in rows)


def firm(substr):
    m = [f for f in firms if substr.upper() in f["key"]]
    return m[0] if m else None


def naics_recompete(code):
    rows = [r for r in recompetes if r["naics"] == code]
    return len(rows), sum(r["value"] for r in rows)


def agency(sub):
    m = [a for a in agencies if sub.lower() in a["name"].lower()]
    return m[0] if m else None


# Each claim: (label, actual, expected, tolerance)
# Tolerance is absolute for counts, fractional for dollar figures.
d90_n, d90_v = window(0, 90)
d180_n, d180_v = window(91, 180)
d365_n, d365_v = window(181, 365)
n541715_n, n541715_v = naics_recompete("541715")
dod = agency("Defense")
nasa = agency("Aeronautics")

davidson = firm("DAVIDSON TECHNOLOGIES")
ntsi = firm("NTSI")
ironmtn = firm("IRONMOUNTAIN")

CLAIMS = [
    ("firms tracked", len(firms), 426, 0),
    ("total market value", meta["market_value"], 113.5e9, 0.01),
    ("recompetes within 24mo", len(recompetes), 1463, 0),
    ("recompete value", meta["recompete_value"], 22.7e9, 0.01),
    ("contracts expiring within 90d", d90_n, 492, 0),
    ("value expiring within 90d", d90_v, 5.85e9, 0.01),
    ("contracts expiring 181-365d", d365_n, 430, 0),
    ("value expiring 181-365d", d365_v, 5.37e9, 0.01),
    ("firms >$5M with >95% single agency", concentration(5e6, 0.95, "agencies"), 174, 0),
    ("firms >$10M with >90% single sub-agency", concentration(10e6, 0.90, "sub_agencies"), 104, 0),
    ("firms with >=1 expiring contract", sum(1 for f in firms if f["expiring_count"] > 0), 253, 0),
    ("firms with none expiring", sum(1 for f in firms if f["expiring_count"] == 0), 173, 0),
    ("major tier firms", sum(1 for f in firms if f["tier"] == "major"), 48, 0),
    ("mid tier firms", sum(1 for f in firms if f["tier"] == "mid"), 107, 0),
    ("small tier firms", sum(1 for f in firms if f["tier"] == "small"), 271, 0),
    ("NAICS 541715 recompete contracts", n541715_n, 250, 0),
    ("NAICS 541715 recompete value", n541715_v, 5.37e9, 0.01),
    ("DoD value", dod["value"] if dod else 0, 90.40e9, 0.01),
    ("DoD awards", dod["award_count"] if dod else 0, 4895, 0),
    ("DoD firms", dod["firm_count"] if dod else 0, 342, 0),
    ("NASA value", nasa["value"] if nasa else 0, 19.90e9, 0.01),
    ("Davidson Technologies total", davidson["total_value"] if davidson else 0, 186.6e6, 0.01),
    ("Davidson Technologies expiring", davidson["expiring_value"] if davidson else 0, 113.5e6, 0.01),
    ("NTSI expiring share is 100%",
     round((ntsi["expiring_value"] / ntsi["total_value"]) * 100) if ntsi else 0, 100, 0),
    ("IronMountain has a 2026-09-07 expiry",
     1 if any(r["end_date"] == "2026-09-07" and "IRONMOUNTAIN" in r["incumbent_key"]
              for r in recompetes) else 0, 1, 0),
]


def fmt(v):
    if isinstance(v, float) and abs(v) >= 1e6:
        return f"${v / 1e9:,.2f}B" if abs(v) >= 1e9 else f"${v / 1e6:,.1f}M"
    return f"{v:,}" if isinstance(v, (int, float)) else str(v)


def main():
    print(f"Arsenal Index — verifying published claims against {meta['generated']} dataset\n")
    failures = []
    for label, actual, expected, tol in CLAIMS:
        if tol == 0:
            ok = actual == expected
        else:
            ok = expected == 0 or abs(actual - expected) / expected <= tol
        mark = "ok  " if ok else "FAIL"
        print(f"  [{mark}] {label:<44} {fmt(actual):>14}"
              + ("" if ok else f"   expected {fmt(expected)}"))
        if not ok:
            failures.append(label)

    print()
    if failures:
        print(f"{len(failures)} claim(s) no longer hold. Update docs/ before sending "
              f"anything, or the outreach is quoting numbers the data does not support:")
        for f in failures:
            print(f"   - {f}")
        sys.exit(1)
    print(f"All {len(CLAIMS)} published claims verified against the current dataset.")
    print("Safe to send.")


if __name__ == "__main__":
    main()
