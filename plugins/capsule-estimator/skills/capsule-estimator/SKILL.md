---
name: capsule-estimator
description: >-
  Estimate a Capsule proposal — hours AND price — grounded in Capsule's own historical
  data, not guesswork. Use whenever scoping or pricing a new proposal, a phase, or a single
  discipline (packaging, logo/identity, website, naming, strategy, branding, brand guidelines,
  label design, marketing materials, etc.). Triggers on: "estimate this proposal", "scope this",
  "how much should we quote for X", "what does a logo/packaging/website usually cost or take",
  "build an estimate", "estimate hours for", "price out this scope", "put together a cost estimate",
  "how many hours is a [discipline]", or preparing a response-and-cost-estimate / SOW for a prospect.
  Reads the live Proposals Index, Pricing Reference, and Discipline Hours Benchmark in Notion.
metadata:
  version: 1.0.0
  updated: 2026-07-30
  rate_card:
    current: 250        # USD/hr, effective 2025-01-01+
    prior: 200          # USD/hr, pre-2025 rows
---

# Capsule Estimator

Produce a **grounded, range-based, provenance-carrying** estimate for a Capsule proposal, using Capsule's own signed history. Never invent a number — every figure traces to a row or a benchmark, and every estimate shows its confidence.

## The golden rules (do not skip)

1. **Never present a number without provenance.** Always show: sample size (n), whether it's from *completed* actuals or *quoted* history, and a confidence label. A lone "70 hours" is a failure.
2. **Ranges, not point estimates.** Give a low–high and cite the 2–3 nearest past jobs (name, quoted, actual where known).
3. **Estimate per discipline, then sum.** Break the scope into disciplines (and scope tier), price each from its benchmark, then total. This also produces the phased structure that wins.
4. **Apply the win-rate guardrails** (below) as active advice, not silent data.
5. **Quote from the median, not the range midpoint.** The range includes outliers both ways.

## Data sources (all live in Notion — query, don't hardcode)

- **Proposals Index** (proposal-grain: quoted $/hours, Won/Lost, comparables) — data source `collection://c4c426f1-19e3-4f3d-a9d1-661ff7170826`
- **Capsule Projects** (phase-grain: actual `Hours Logged`, `Discipline`, `Status`) — data source `collection://908fc4e3-07a7-44af-bfeb-bc27aecc2a14`
- **Pricing Reference** (computed cost/price medians by discipline, the $50K cliff analysis) — page `https://app.notion.com/p/3aa790e0e71a81c78f19e362dd7d03a6`
- **Discipline Hours Benchmark** (computed hours medians by discipline) — page `https://app.notion.com/p/3ad790e0e71a81b0a0a3e2464907a05f`

Use `notion-query-data-sources` (SQL) for the two databases and `notion-fetch` for the two reference pages. If the Notion connector isn't available, say so and fall back to the last-known benchmark values, clearly flagged as stale.

## Method

**1. Parse the scope into disciplines + tier.** Map every deliverable to the controlled taxonomy: Label Design, Packaging, Branding, Website, Naming, Strategy, Photography, Production Update, Identity System, Print Collateral, Brand Guidelines, Color Correction, Video, Marketing Materials, Hourly/Misc, Other. Estimate scope tier (T1 small / T2 mid / T3 full) from the ask.

**2. Pull the cost benchmark per discipline** from the Pricing Reference (won median + range). This is robust for all disciplines today.

**3. Pull the hours benchmark per discipline.** Read the Discipline Hours Benchmark page, OR recompute live for freshness:
```sql
SELECT "Discipline","Job Number","Hours Logged","Status"
FROM "collection://908fc4e3-07a7-44af-bfeb-bc27aecc2a14"
WHERE "Discipline" = '<discipline>' AND "Status" = 'Phase Completed';
```
Take median/min/max of `Hours Logged`. Confidence: **solid** n≥8, **emerging** n 3–7, **thin** n 1–2, **none** n=0. If thin/none, price from the cost median + the quoted-hours range instead, and say so.

**4. Pull 2–3 nearest comparables** from the index (same discipline, closest scope):
```sql
SELECT "Project Name","Job Number","Total Min","Total Max","Hours Min","Hours Max","Proposal Outcome","Data Verified"
FROM "collection://c4c426f1-19e3-4f3d-a9d1-661ff7170826"
WHERE "Category" LIKE '%<discipline>%' AND "Proposal Outcome" = 'Won'
ORDER BY "Date Signed" DESC;
```
Prefer rows with `Data Verified = true`.

**5. Build the line items.** Per discipline: hours range → cost at the current rate ($250/hr), cross-checked against the won-price median. Reconcile if hours×rate and the price median disagree by >25% (flag which you're trusting and why).

**6. Total, then apply guardrails.**

## Guardrails (from the Pricing Reference — state these when they trigger)

- **The $50K line.** Win rate roughly halves above $50K (77–97% below, ~33% above). If the total crosses $50K, say so and propose a Phase 1 that lands under $50K with a defined path to the rest.
- **The 3-discipline rule.** 1–2 disciplines win 66–80%; 3+ win ~33% regardless of price. If the scope bundles 3+, recommend phasing or a single-discipline entry point.
- **Packaging is the strength** (65% win rate) — scope can be pushed harder here. **Website is the weak spot** (39%) — price tighter.
- **Cap revision rounds** in every estimate (default: 2 included, additional billed) so a fixed price doesn't become unlimited revisions.

## Output format

Return, in this order:

1. **Scope read** — the disciplines + tier you parsed (confirm assumptions).
2. **Estimate table** — one row per discipline: Discipline · Hours (range) · Cost (range) · Confidence · nearest comparable.
3. **Total** — hours and $ range, with the phased structure if a guardrail tripped.
4. **Recommendation** — the number to quote, why, revision cap, and any phasing.
5. **Provenance footer** — data sources, snapshot date, methodology version, and rate used.

## Configuration & versioning

- **Rate:** $250/hr (current, effective 2025-01-01). Rows before 2025 were $200/hr — normalize historical hours to the current rate for forward estimates. Rate is a parameter; update it in this skill's `metadata.rate_card` when it changes and bump the version.
- **Methodology version:** stamp each estimate with `v1.0.0 (2026-07-30)` so old estimates stay interpretable after the method evolves.
- **Taxonomy** must match the index `Category` and projects `Discipline` exactly — never introduce a new discipline name here without adding it in both databases.

## Honest limitations (say these when relevant)

- Hours benchmarks are **completed-phase actuals** and are thin for most disciplines today (only Strategy is solid; Website/Marketing emerging; the rest lean on cost). They sharpen as phases complete.
- The cost column is **proposal-grain**; bundled proposals don't split price by discipline, so per-discipline *variance* is cleanest on single-discipline jobs.
- Dead (Neverland/Canceled) phases and unresolved status-conflict rows are excluded from benchmarks.

## Worked example — "Senda: premium sock packaging + in-store POP display"

1. **Scope read:** two disciplines — Packaging (T2, single premium retail SKU, production-ready files + one physical prototype) and Marketing Materials / POP (a display concept + render + copy). Priced separately per the brief.
2. **Packaging:** comparables = CUR-120 Dark Heart Bag & Box ($17.25–19.25k, 69–77h), CUR-123 JAMS Dram ($13.75–15.75k, 55–63h), AMP-049 Deli Loaf ($14.75–24k, 59–96h). Benchmark: Packaging won median $18,250; hours thin (n=1 completed) → use quoted range 55–77h for a full design. Estimate: **~$14–18k, ~55–75h.**
3. **POP display:** Marketing Materials won median ~$5.4k, but a concept + full render is larger; nearest render comps run higher. Estimate: **~$6–12k**, quoted as its own line.
4. **Guardrails:** total ~$20–30k, under $50K and 2 disciplines → healthy win zone; no phasing forced. Packaging is Capsule's strong discipline — push scope confidently. Cap at 2 revision rounds.
5. **Recommendation:** quote packaging at ~$15k (priority line), POP separately at ~$5–6k lean concept or ~$10k full render, revision cap noted. Client's stated $5k is a packaging anchor, not the ceiling — the data says a full single-SKU packaging design is a ~$15k / ~65h job.
