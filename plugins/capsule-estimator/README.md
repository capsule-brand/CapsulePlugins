# Capsule Estimator

Data-backed proposal estimates from Capsule's own signed history.

Given a proposal scope, it parses the work into disciplines, pulls a **cost** benchmark (won-price medians) and an **hours** benchmark (actual logged hours) per discipline, cites the 2–3 nearest comparable past jobs, and applies Capsule's win-rate guardrails (the $50K line, the 3-discipline rule) — returning a range-based estimate with a confidence label on every number. Nothing is invented; every figure traces to a row or a benchmark.

**Invoke:** `/capsule-estimator:capsule-estimator`, or just describe the job — e.g. "scope a packaging proposal for a new client", "what does a logo usually cost and take?", "build an estimate for a full brand build".

**Requires:** the **Notion connector**, with access to the three sources it reads (it queries live data to build the estimate; without them there are no numbers to pull):

- **Proposals Index** — quoted $/hours, Won/Lost, comparables
- **Pricing Reference** — won-price medians by discipline
- **Discipline Hours Benchmark** — actual hours by discipline

Read-only. It never writes to Notion.
