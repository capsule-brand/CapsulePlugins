---
name: capsule-estimator
description: >-
  Estimate a Capsule proposal — hours AND price — grounded in Capsule's own historical
  data, not guesswork. Use whenever scoping or pricing a new proposal, a phase, or a single
  discipline (packaging, logo/identity, website, naming, strategy, branding, brand guidelines,
  label design, marketing materials, etc.). Triggers on: "estimate this proposal", "scope this",
  "how much should we quote for X", "what does a logo/packaging/website usually cost or take",
  "build an estimate", "estimate hours for", "price out this scope", "put together a cost estimate",
  "make it proposal-ready", "put this in our proposal/deck format",
  "how many hours is a [discipline]", or preparing a response-and-cost-estimate / SOW for a prospect.
  Reads the live Proposals Index, Pricing Reference, and Discipline Hours Benchmark in Notion.
metadata:
  version: 1.2.0
  updated: 2026-07-31
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
6. **Capsule data sets the quote — outside data never does.** The web can only ever be a *sanity check* on thin / first-of-kind disciplines (Step 4b), shown as a clearly-labeled market reference. It is never averaged into a benchmark, never carries provenance weight, and never becomes the quoted number.
7. **Discovery is a phase, not an afterthought.** Almost every Capsule proposal opens with a Download & Discovery phase — pick its tier from project type + budget (see "Discovery tiers"). The exceptions are pure production/hourly jobs and pure dev builds.

## Data sources (all live in Notion — query, don't hardcode)

- **Proposals Index** (proposal-grain: quoted $/hours, Won/Lost, comparables) — data source `collection://c4c426f1-19e3-4f3d-a9d1-661ff7170826`
- **Capsule Projects** (phase-grain: actual `Hours Logged`, `Discipline`, `Status`) — data source `collection://908fc4e3-07a7-44af-bfeb-bc27aecc2a14`
- **Pricing Reference** (computed cost/price medians by discipline, the $50K cliff analysis) — page `https://app.notion.com/p/3aa790e0e71a81c78f19e362dd7d03a6`
- **Discipline Hours Benchmark** (computed hours medians by discipline) — page `https://app.notion.com/p/3ad790e0e71a81b0a0a3e2464907a05f`

Use `notion-query-data-sources` (SQL) for the two databases and `notion-fetch` for the two reference pages. If the Notion connector isn't available, say so and fall back to the last-known benchmark values, clearly flagged as stale.

## Method

**1. Parse the scope into disciplines + tier.** Map every deliverable to the controlled taxonomy: Label Design, Packaging, Branding, Website, Naming, Strategy, Photography, Production Update, Identity System, Print Collateral, Brand Guidelines, Color Correction, Video, Marketing Materials, Hourly/Misc, Other. Estimate scope tier (T1 small / T2 mid / T3 full) from the ask.

**1b. Choose the discovery tier** sized to project type + budget (see "Discovery tiers" below). Lead the phase list with it unless the job is pure production/hourly or a pure dev build.

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

**Widen the net before giving up — stay inside Capsule's own data.** If a discipline returns fewer than 2 close comparables, or its hours are thin/none, broaden *within the index* before reaching anywhere else: drop the tier filter, match adjacent scope (a render vs a full design), and pull the sibling disciplines that bundle with it (e.g. Packaging ↔ Label Design ↔ Production Update; Marketing Materials ↔ Print Collateral). Your own loosely-matched rows beat any outside number. Only after this still leaves you thin do you consider Step 4b.

**4b. External sanity band — thin / novel only, quarantined.** Trigger ONLY when, after widening, a priced discipline is still **thin (n<3 signed comps)** or **first-of-kind** (scope Capsule has never done). Then run one `WebSearch` for a market range ("[discipline] design agency pricing", and similar) purely to sanity-check the internal number. Hard rules: (a) show it as a separate **"External market reference (not Capsule data)"** line, never inside the estimate table; (b) never average it into any median or into the quote; (c) use it only to flag *"the internal figure sits well outside the market — re-examine"*, not to move the quote; (d) if the internal number sits inside the band, say so and move on. If the discipline is **not** thin, skip this entirely — outside data on a well-sampled discipline is pure noise and violates golden rule 6.

**5. Build the line items.** Per discipline: hours range → cost at the current rate ($250/hr), cross-checked against the won-price median. Reconcile if hours×rate and the price median disagree by >25% (flag which you're trusting and why).

**6. Total, then apply guardrails.**

## Discovery tiers (almost every proposal opens here)

Recommend the tier that fits the project type and budget, **name it, say why you picked it, and let it be swapped.** Anchors below are real signed/quoted figures — use them as the calibration, not as fixed prices.

- **Review-their-research (lightest).** Capsule reviews the client's existing research rather than commissioning new — on the deck the approach line reads *"Review existing research."* Anchor: **~$10,500 / 3 wks** on a large campaign (Middleby); scales down for smaller scopes. Use when the client already has solid research/brand work in hand.
- **Abbreviated discovery (the common default).** One ~2-hr Download & Discovery session + brand/category immersion + a Discovery Brief; little or no new stakeholder research. Scales with project size and stakeholder count: **~$2,500 / 1 wk** for a single-SKU packaging job (Maxxon), **~$5,250 / 1 wk** for a small brand study (Wahl), up to **~$14,800–$15,200 / 2–3 wks** for a brand programme with a real stakeholder session (Mortenson, Piper).
- **Full / large discovery.** Stakeholder interviews + structured pre-work + a facilitated workshop + orientation/education + synthesis + a multi-year roadmap, as a standalone Research + Strategy phase: anchor **~$59,875 / 12 wks** (Hazelden). OR an optional deep **Qual + Quant research** block (8–12 leadership/stakeholder interviews + a benchmarked perception survey fielded via a third-party partner): **$40,000–$80,000 / 6–8 wks** (Piper), usually sold as an optional add-on between discovery and strategy. Use for high-stakes brand architecture / rebrands with budget.
- **Packaging variant — "Discovery, Alignment & Audit."** For packaging programmes, discovery is a SKU audit: cost baseline + SKU optimization + complexity map + creative brief + next-step roadmap. Priced ~flat by SKU count: **$17,200 / 2 wks (≤20 SKUs, Buck)**, **$18,400 / 1–2 wks (≤80 SKUs, ACG)**. An optional "Packaging Exploratory Research" (in-store shopalongs) sits above it at **$34,560 (n=12) / $45,120 (n=24)**, usually marked *"Outside of scope. Optional but recommended."* For a single-SKU job, the abbreviated ~$2,500 tier fits instead.

**Selection rule:** bigger / higher-budget / higher-stakes → fuller discovery; client brings research → review-only; single-SKU or pure production → abbreviated or none. Tie it to the $50K line — a lean discovery keeps Phase 1 small and the deal in the 77–97% win band. A Phase 1 discovery/audit also de-risks pricing the later phases, which is why those are quoted as ranges until it completes.

## Guardrails (from the Pricing Reference — state these when they trigger)

- **The $50K line.** Win rate roughly halves above $50K (77–97% below, ~33% above). If the total crosses $50K, say so and propose a Phase 1 that lands under $50K with a defined path to the rest.
- **The 3-discipline rule.** 1–2 disciplines win 66–80%; 3+ win ~33% regardless of price. If the scope bundles 3+, recommend phasing or a single-discipline entry point.
- **Packaging is the strength** (65% win rate) — scope can be pushed harder here. **Website is the weak spot** (39%) — price tighter.
- **Cap revision rounds** in every estimate (default: 2 included, additional billed) so a fixed price doesn't become unlimited revisions.

## Output format

Return, in this order:

1. **Scope read** — the disciplines + tier you parsed (confirm assumptions), and the recommended discovery tier + why.
2. **Estimate table** — one row per discipline: Discipline · Hours (range) · Cost (range) · Confidence · nearest comparable.
3. **Total** — hours and $ range, with the phased structure if a guardrail tripped.
4. **Recommendation** — the number to quote, why, revision cap, and any phasing.
5. **Provenance footer** — data sources, snapshot date, methodology version, and rate used.

*When Step 4b fired, add a separate **External market reference** note beneath the table — clearly labeled as outside data, kept out of the totals, and used only to say whether the Capsule-grounded number sits inside or outside the market band. If 4b did not fire, do not mention it.*

## Proposal-ready output (Capsule deck format)

When asked to make it **"proposal-ready," "deck-ready,"** or **"in our proposal format,"** re-emit the same grounded estimate as paste-ready blocks that mirror Capsule's proposal deck. This changes the **format and voice only — never the figures.** Two parts:

**A. Roadmap at a Glance** — numbered phases in delivery order (Discovery first, then a phase per discipline/workstream, often a Brand Guidelines phase last), each as `0X · Phase Name — $X · N weeks`. Mark concurrent phases with `**` (*"runs parallel with…"*). Close with **Total Investment $X** and **Total Timeline N weeks**. Use ranges (*"Estimate: $X–$Y"*) for downstream, partner/dev, or production phases whose scope isn't yet fixed.

**B. Per-phase blocks** — for each phase, three fixed sub-blocks, in Capsule's voice:
- **APPROACH AT A GLANCE** — 3–5 bullets on how the phase runs.
- **DELIVERABLES** — the concrete outputs.
- **INVESTMENT** — `Phase Name ……… $X` + `Timeline: N weeks`; add `OOP for this phase: $X` or an **OPTIONAL ADD-ONS** line where relevant.

Conventions (match these exactly — they're how every Capsule deck reads):
- Say **"Investment"** / **"Total Investment,"** never "cost" or "fee." Lead with the value/objective, then the number.
- Bake revision rounds into deliverables (*"2 concepts // 1 refinement," "1 round of refinement," "two rounds of refinement"*). Extra rounds or out-of-scope = change orders at **$250/hr**.
- One **core review point** per phase: *"Each core phase closes with a client review before the next begins."*
- Compress the timeline with **concurrency** (*"runs parallel with…"* / `**`), not by shrinking weeks.
- Production, photography, print, and travel are **pass-through / OOP** — *"passed through at net," "to be estimated,"* never folded into the fee (photo shoots can run $45k–$85k+ on their own).
- **Fence out-of-scope explicitly**; show downstream phases as *"Estimate: $X–$Y"* until a gating Phase 1 confirms scope.
- Standard terms to note when relevant: proposal valid 30–90 days; phased payment (e.g. 1/3 down + equal monthly); MN law; 20% markup on expenses; a **non-profit rate** where the client qualifies.

Keep every number exactly as the estimate produced it. If the estimate tripped a guardrail (>$50K or 3+ disciplines), the proposal-ready roadmap is where the phasing shows up naturally.

### Planned (not yet built) — write the copy into the document

A future addition will let this skill fill the copy **directly into a proposal document** instead of only emitting paste-ready text. Intended approach: a one-time **Google Slides token template** (the branded proposal deck with `{{tokens}}` like `{{discovery_investment}}`, `{{packaging_approach}}`, `{{total_investment}}`); the skill produces a **token→value fill-map** and a fill step stamps a filled copy into the prospect's Drive folder — via a Zapier "Google Slides → Create from Template" action or a small Apps Script bound to the template. **Figma** (fill named text layers via the Figma connector) is the alternative if proposals ever move off Slides. Design constraints to respect: **fixed phase slots** (a variable phase count needs a max-N-slot template that hides unused phases), **text/numbers only** (no dynamic roadmap-bar resizing or restyling), and **images/renders stay manual**. Until this is built, output the paste-ready blocks above. If asked to "fill the doc" or "build the deck," **offer this token-template approach as the next step — do not attempt fragile UI automation.**

## Configuration & versioning

- **Rate:** $250/hr (current, effective 2025-01-01). Rows before 2025 were $200/hr — normalize historical hours to the current rate for forward estimates. Rate is a parameter; update it in this skill's `metadata.rate_card` when it changes and bump the version.
- **Methodology version:** stamp each estimate with `v1.2.0 (2026-07-31)` so old estimates stay interpretable after the method evolves.
- **Taxonomy** must match the index `Category` and projects `Discipline` exactly — never introduce a new discipline name here without adding it in both databases.

## Honest limitations (say these when relevant)

- Hours benchmarks are **completed-phase actuals** and are thin for most disciplines today (only Strategy is solid; Website/Marketing emerging; the rest lean on cost). They sharpen as phases complete.
- The cost column is **proposal-grain**; bundled proposals don't split price by discipline, so per-discipline *variance* is cleanest on single-discipline jobs.
- Dead (Neverland/Canceled) phases and unresolved status-conflict rows are excluded from benchmarks.
- The optional **external market reference** (Step 4b) is uncalibrated to Capsule's rate, region, and client mix — it is a smoke detector for thin / first-of-kind disciplines, never a source for the quote.
- **Discovery-tier anchors** come from a hand-read sample of recent proposal decks, not the live index — treat them as calibration and adjust to the specific project; they'll firm up as discovery phases are tagged in the data.

## Worked example — "Senda: premium sock packaging + in-store POP display"

1. **Scope read:** two disciplines — Packaging (T2, single premium retail SKU, production-ready files + one physical prototype) and Marketing Materials / POP (a display concept + render + copy). Priced separately per the brief. Discovery tier: **abbreviated (~$2,500 / 1 wk)** — single-SKU packaging, no research to commission.
2. **Packaging:** comparables = CUR-120 Dark Heart Bag & Box ($17.25–19.25k, 69–77h), CUR-123 JAMS Dram ($13.75–15.75k, 55–63h), AMP-049 Deli Loaf ($14.75–24k, 59–96h). Benchmark: Packaging won median $18,250; hours thin (n=1 completed) → use quoted range 55–77h for a full design. Estimate: **~$14–18k, ~55–75h.**
3. **POP display:** Marketing Materials won median ~$5.4k, but a concept + full render is larger; nearest render comps run higher. Estimate: **~$6–12k**, quoted as its own line.
4. **Guardrails:** total ~$20–30k, under $50K and 2 disciplines → healthy win zone; no phasing forced. Packaging is Capsule's strong discipline — push scope confidently. Cap at 2 revision rounds.
5. **Recommendation:** quote packaging at ~$15k (priority line), POP separately at ~$5–6k lean concept or ~$10k full render, revision cap noted. Client's stated $5k is a packaging anchor, not the ceiling — the data says a full single-SKU packaging design is a ~$15k / ~65h job.
6. **Proposal-ready (on request):** Roadmap → `01 · Download & Discovery — $2,500 · 1 wk`, `02 · Packaging Design — $15,000 · 4 wks`, `03 · In-Store POP Display — $6,000 · 3 wks **`, **Total Investment ~$23,500 · ~5 wks** (POP runs parallel). Each phase gets APPROACH / DELIVERABLES / INVESTMENT; physical prototype + printing noted as OOP at net; 2 refinement rounds baked in.
