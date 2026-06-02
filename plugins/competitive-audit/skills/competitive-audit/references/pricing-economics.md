# Pricing Economics — The "X× Cheaper at N Volume" Table

The per-unit cost economics table is the strongest single piece of visual evidence in §4 when the client's pricing is materially different from the market. When it works, it does more selling than the rest of the audit combined. Use it for any client whose pricing is in the bottom or top quartile of their category.

## When to include this table

Always include it when:
- The client's pricing model differs structurally from the dominant competitor (e.g., credit-based vs. subscription)
- The client's effective per-unit cost is more than 3× different from the closest direct competitor
- The buyer is volume-sensitive (per-scan, per-document, per-user)

Skip it when:
- The category is purely seat-based and the client's per-seat price is within ~30% of competitors
- The client doesn't disclose volume-based pricing at all (enterprise-only)

## Picking the volume tiers

Choose 4 volume points that span the realistic customer range. The tiers should answer "what does it cost at the volume of {small, mid, mid-large, large} customer?"

For a CPG label tool, that's typically:
- 10 scans / month (small brand, single SKU)
- 40 scans / month (small CPG, ~10 SKUs)
- 100 scans / month (mid CPG, ~25 SKUs)
- 300 scans / month (contract manufacturer or agency)
- 1,000 scans / month (enterprise — show the inflection where competitors get competitive)

For a SaaS with seats, that's typically:
- 1 seat
- 5 seats
- 25 seats
- 100 seats

Adjust per category. Always include at least one volume where the comparison flips (or nearly does) — buyers want to know where the savings shrink.

## Calculating the comparison

For each volume tier:

1. **Client cost** — what the client's pricing page says at that volume. If the client uses credit packs, use the smallest pack that satisfies the volume (don't round up wastefully).
2. **Competitor cost** — take the closest direct competitor's price at the same volume. If subscription, use the monthly equivalent. If enterprise, use a published or estimated mid-band number.
3. **Multiplier** — `competitor_cost / client_cost` (rounded to integers when >2×, to 1 decimal when ≤2×).

Example calculation, pay-as-you-go vs subscription:

```
At 100 scans/month:
  Client: $99 Business pack (100 credits) = $0.99/scan
  Competitor: ~$1,500/mo subscription (estimated mid-band) = $15.00/scan
  Multiplier: 1500 / 99 = 15.15× → "15× cheaper"
```

## Table format

| Monthly volume | {Client} | {Closest competitor} | {Client} is … |
|---|---|---|---|
| 10 | $19 Starter ($1.90/scan) | $500 entry ($50/scan) | 26× cheaper |
| 40 | $49 Pro ($1.23/scan) | ~$500–$1,000 ($12–$25/scan) | 10–20× cheaper |
| 100 | $99 Business ($0.99/scan) | ~$1,500 ($15/scan) | 15× cheaper |
| 300 | $249 Agency ($0.83/scan) | ~$3,000–$5,000 ($10–$17/scan) | 12–20× cheaper |
| 1,000 | ~$750–$1,000 (3–4 Agency packs) | ~$5,000 enterprise ($5/scan) | 5–6× cheaper |

The last column does most of the work. Make sure the multiplier is calculated honestly — buyers will check.

## Caveats to include in body text

Pricing comparisons are easy to dismiss. Pre-empt the dismissal:

- **Note the packaging difference** ("Client sells credit packs; competitor sells monthly subscription — the comparison assumes equivalent monthly volume")
- **Show your work** — at least one row should have the calculation visible
- **Acknowledge where the competitor wins** — if at very high volume the competitor's per-unit is competitive, say so
- **Don't compare apples to oranges** — if the competitor's price includes workflow/approval and the client's doesn't, note it

## Headline that goes with this table

When the table is strong, the audit's executive summary should headline it:

> "Pricing is genuinely disruptive. At 100 scans/month, {Client} is 15× cheaper than the closest AI competitor. The site does not lead with this. The homepage should headline a direct cost comparison."

This is the single highest-leverage GTM observation in most audits with a Tier 4 / pay-as-you-go client.

## When the client is more expensive

Same table, same math, but the strategic frame flips. Now the multiplier is in the competitor's favor and the audit must explain why the client's price is justified — workflow depth, integrations, trust, vertical specialization. If the audit can't find that justification, the recommendation is "reposition for the value-justifying segment" rather than "match competitor pricing" (matching almost always destroys margin without winning the deal).
