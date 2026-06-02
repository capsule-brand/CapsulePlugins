# Document Input — How to Run a Competitive Audit Without a Live Site

Pre-launch startups, stealth-mode products, and consulting engagements often have only a deck or a one-pager. Document-input mode lets the audit run on any of these. This file covers the extraction schema, what gets weaker without a URL, and confidentiality rules.

## Supported file types

| Type | Tool | Notes |
|---|---|---|
| `.pdf` | `Read` (small) or `pdf` skill (large/scanned) | Investor decks, product briefs, one-pagers |
| `.docx` | `docx` skill (`pandoc --track-changes=all`) | Internal product specs, PRDs, board memos |
| `.pptx` | `pptx` skill | Investor decks, sales decks, product roadmaps |
| `.txt` / `.md` | `Read` directly | README files, internal wikis exported to markdown |
| Image (.png, .jpg) | Vision | One-pager screenshots, marketing flyers |

If you receive a file type not on this list, ask the user to convert it to one of the above.

## Client-snapshot extraction schema

Extract the same fields you would from a website. Fill in what's in the document; flag missing fields as Open Questions for §8.

| Field | Where to look in a document |
|---|---|
| **Product name + tagline** | Cover slide, title page, first paragraph |
| **One-line value prop** | Hero copy, executive summary, "what we do" |
| **Industries served** | "Market" / "Customers" slide, "ICP" section |
| **Personas named** | "Who we serve" / "Buyers" / persona slides |
| **Pricing model + tiers** | Pricing slide, financial projections (extract list price even if it's roadmap) |
| **Frameworks / standards / certifications** | Compliance section, security page, certifications list |
| **Trust surface** | Customer logos, testimonials, advisor names, "team" slide |
| **Differentiators claimed** | "Why us" / "Competitive advantage" / "Moat" slide |
| **Roadmap / what's next** | Roadmap slide, "Phase 2" / "12-month plan" |
| **Funding / stage** | "About" slide, financials, "milestones" |

If the document is a competitor analysis the user already drafted, treat it as input data but **redo the analysis fresh** — don't anchor on the user's prior framing.

## Mode-aware degradation — what gets weaker without a URL

Be explicit in the audit's auto-generated methodology note about what's harder in doc-only mode:

| Audit section | URL mode | Doc-only mode |
|---|---|---|
| §1 Trust-surface gaps (SOC 2 absence, empty G2 profile, footer mismatches) | Strong — visible on site | **Weak — invisible from a doc.** Note this in §1 and ask the user. |
| §1 Brand mismatches (footer copyright wrong, OG tags stale, page titles inconsistent) | Strong | **Not applicable** — there's no site to check |
| §4 Pricing comparison (client column) | Strong — pricing page is public | Only as strong as what's in the doc. If pricing isn't in the doc, ask the user explicitly. |
| §5 Feature matrix (client column) | Strong | Reasonable — most product features are in product docs |
| §6 Wins / Parity / Gaps | Strong | Reasonable, but skip "site-visible" gaps |
| §7 A-bucket recommendations ("fix this week") | Strong — site-edit fixes | **Limited** — most A-bucket items require a site to fix. Substitute with "pre-launch trust artifacts to ship before site launches" (advisor announcements, SOC 2 status, customer pilot logos to feature). |

## Auto-generated methodology note (renders at the top of the docx)

The build template emits a methodology callout based on `client.inputMode`:

**URL mode** (default — no special note required, methodology section omitted).

**Document-only mode** auto-generates:

> *This audit is based on internal documents provided by the client; no public website was available at the time of preparation. Trust-surface observations (§1) and site-edit recommendations (§7-A) are limited or substituted accordingly. A web-based follow-up after product launch is recommended to surface site-visible gaps.*

**Hybrid mode** auto-generates:

> *This audit combines a live website read with internal documents provided by the client. Where the document and website conflict, the document is treated as more current internal truth. Pricing and product detail labeled "Source: internal document" are not publicly available and should not be cited externally.*

## Confidentiality rules

Internal documents are usually confidential. Apply these rules:

- **Cite by name in §Sources**, never link. Use: "ClientName Product Brief, June 2026 (internal, confidential)."
- **Do not paste verbatim quotes from the doc into the audit body** unless they're already public-safe (tagline, framework names, market size citations). If you must quote, paraphrase.
- **Do not write document contents back to disk** outside the working directory used to build the audit. After build, the source doc stays where the user attached it.
- **Flag any apparently-sensitive findings** to the user before they go into §7 (e.g., "the deck mentions a planned $50M Series B — should I include this in the doc?").
- **If the document contains PII** (customer names, employee names beyond the founder), redact in the audit unless the user has explicitly cleared each name.

## When the document is too thin

If the document is <500 words or missing more than 4 of the client-snapshot fields above, do one of three things — in order of preference:

1. **Ask the user to attach a richer doc** (product spec, pitch deck, one-pager)
2. **Ask 5–8 targeted questions** to fill the gaps inline — treat the user's answers as additional source material
3. **Proceed with a clearly-flagged "Skeleton Audit"** that explicitly notes the data thinness in §0 methodology

Never invent client-snapshot facts to fill gaps. An audit that says "[missing — needs founder input]" is more useful than one that fabricates.

## When to use hybrid mode even if the user only mentioned one

Default to hybrid if the user's first message includes any of these phrases alongside a URL:

- "...and here's our deck"
- "...the website doesn't show our roadmap, but..."
- "...we just updated pricing, the site is stale"

Conversely, if the user only attached a doc but mentioned a website in passing ("we have a basic landing page at acme.io but the deck has more"), offer to read both:

> *I see you've attached the deck. Want me to also read the acme.io landing page so the audit can flag any inconsistencies between what's on the public site and what's in the deck? That often surfaces useful tightening for the launch.*
