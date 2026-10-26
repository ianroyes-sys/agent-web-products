# Arsenal Index — data caveats

Read this before quoting any figure to a customer. In a data business, being right
about your own limits is the product. A buyer who catches an overstatement once
will not trust the feed again.

Generated dataset: `data/out/`. Source: USAspending.gov API v2 (public domain, no key).
Market: Madison County, Alabama (FIPS 01089). Lookback: 3 federal fiscal years.

---

## 1. Prime awards only

The pipeline pulls **prime contract awards** (types A/B/C/D) where the *recipient is
headquartered* in Madison County. It does not resolve the subcontract layer.

This matters because a large share of Huntsville work flows from a prime to local
subs, and that flow is where most small firms actually live. USAspending's
subaward reporting is materially less complete and less timely than its prime data.

**Say:** "every prime award to a Huntsville-headquartered firm."
**Do not say:** "every dollar of defense work in Huntsville."

## 2. The top of the market dominates every aggregate

Boeing alone is **42% of the $113.5B tracked**. Any mean across all 426 firms is
close to meaningless. Use medians, or segment by tier (48 major / 107 mid / 271
small) before drawing a conclusion about "the average Huntsville contractor."

## 3. NAICS codes carry real source errors

Federal NAICS coding is entered by the contracting office and is frequently wrong.
The clearest example in this dataset: **$18.7B sits under NAICS 541720, "Research
and Development in the Social Sciences and Humanities," across only 2 firms.** That
is a miscoded Boeing missile-defense award — the award's own description text
references 541710. It is not a pipeline bug; it is what the government filed.

Treat NAICS as a strong hint, never as ground truth. Any "capability gap" output
built on NAICS should be presented as a prompt for a conversation, not a verdict.

## 4. Legal entities fragment across records

The same company appears under punctuation and suffix variants, and large primes
file under multiple distinct entity registrations. `refine.py` normalizes case,
punctuation, and common suffixes, which catches most of it — but a firm operating
through several registered subsidiaries will still appear as more than one row.
Firm counts are therefore a slight overcount at the top of the market.

## 5. "Award Amount" is not "money already spent"

The field reflects award value, which for an IDIQ or a ceiling-bearing vehicle can
be far larger than what is ultimately obligated or outlayed. Describe it as
**contract value**, never as revenue, and never as a company's income.

## 6. The pull is capped and value-sorted

A default run takes 60 pages × 100 awards = **6,000 awards, sorted by value
descending**. The long tail below that cut is truncated, which biases the set
toward larger awards. Raise `--pages` for fuller coverage; the tradeoff is runtime.

## 7. Reporting lag

Federal award data is not real-time. Recently signed actions can take weeks to
appear, and modifications restate earlier records. **Freshness is a feature we
sell, so the `generated` date must be displayed on every surface** — dashboard,
API response, and report. Never present a stale pull as current.

## 8. Recompete dates are indicative, not guaranteed

The Recompete Radar keys off each award's stated end date. Contracts get extended,
options get exercised, and work gets bridged — routinely. An expiry date is a
high-quality *signal to act on*, not a promise that a competition will open.
Phrase outputs accordingly: "expires 2027-05-12" is defensible, "will recompete in
May 2027" is not.

Seven of 1,463 recompete rows have no recoverable description text, because the
source record contained none.

---

## Scope boundary

This project uses only public, unclassified federal spending data. It does not
touch, and must not be extended to touch, classified information, CUI, or
ITAR-controlled technical data. The value here is in refining what is already
public and badly organized — which is exactly the opportunity.
