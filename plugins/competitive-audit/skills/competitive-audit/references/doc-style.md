# Document Style Conventions

Visual specification for the audit docx. The `build_audit.js` template enforces most of this automatically, but use this reference if customizing per client.

## Color tokens (default)

- **Primary (`#1F3A5F`)** — heading color, table header fill, footer accents. Deep navy. Readable in print and on screen.
- **Subhead accent (`#2E5984`)** — Heading 3. Slightly lighter navy.
- **Highlight fill (`#FFF7E6`)** — callout backgrounds and the client's column in the feature matrix. Warm cream.
- **Zebra fill (`#F2F4F7`)** — alternating table row fill. Neutral gray.
- **Muted text (`#808080`)** — meta lines, footer text, "last updated" stamps.

When the client has its own brand palette, swap `primary` and `subhead accent` to the client's brand color and a 30% darker shade. Keep `highlight fill` and `zebra fill` neutral — the goal is readability, not brand maximalism.

## Typography

- **Font:** Calibri (universal, prints cleanly, works in Word and Google Docs)
- **Body:** 11pt
- **Heading 1:** 16pt bold, primary color, outline level 0
- **Heading 2:** 13pt bold, primary color, outline level 1
- **Heading 3:** 11pt bold, subhead accent color, outline level 2
- **Table cells:** 10pt, padding 100/100/140/140 DXA
- **Footer:** 9pt muted

Use Arial if Calibri isn't available. Never use a serif.

## Page setup

- US Letter (12,240 × 15,840 DXA)
- Margins: 1300 top, 1300 bottom, 1440 left, 1440 right
- Header on every page: client name + "Competitive Audit", right-aligned, italic, muted
- Footer on every page: "Page X • Prepared {date}", centered, muted

## Structure (in order)

1. **Title block** — title, subtitle, prepared-for, date (centered)
2. **Executive Summary** — 1 paragraph + 3 bullets + 1 callout (the headline insight)
3. **Section 1: Client Snapshot** — product, coverage, personas, pricing, dashboard caps, things-to-flag
4. **Section 2: Competitive Landscape — Four Tiers** — landscape table + brief commentary
5. **Section 3: Competitor Profiles** — per-competitor (pitch, frameworks, pricing, threat level)
6. **Section 4: Pricing & Cost Analysis** — vendor pricing table + per-unit economics table + commentary
7. **Section 5: Feature & Coverage Comparison** — feature matrix table with client column highlighted
8. **Section 6: Wins / Parity / Gaps** — three subsections, bullets only
9. **Section 7: Recommendations** — A / B / C / D buckets, ordered by leverage
10. **Section 8: Open Questions** — what would sharpen the next pass
11. **Sources** — hyperlinks list

## Tables

- Always use `WidthType.DXA` — never percentage (breaks in Google Docs)
- Always set both `columnWidths` on the table AND `width` on each cell
- Sum of `columnWidths` must equal table width exactly
- Header row: white text on primary fill, bold
- Zebra: even rows get the zebra fill
- First column: bold (label column)
- Numeric / center columns: `AlignmentType.CENTER`
- Cell margins: 100/100/140/140 DXA

## Callouts

Highlight-filled paragraph with italic bold primary-color text. Use sparingly — 1 callout in Exec Summary, optionally 1 in §1 for the most important client-snapshot finding, optionally 1 at the top of §7 to flag the headline recommendation. Never more than 4 in the whole doc.

## Section ordering rules

- Executive Summary must include the headline finding from §4 (pricing) AND the headline finding from §6 (top gap)
- Section 7 (Recommendations) always orders A → B → C → D, never reverse
- Section 8 (Open Questions) is always last before Sources

## Naming

Output filename: `{Client}_Competitive_Audit.docx` with client name in PascalCase or with underscores. Examples: `Clearance_Lab_Competitive_Audit.docx`, `AcmeTools_Competitive_Audit.docx`.

## Versioning

If you're producing a v2 (e.g., after a live-site re-read corrected v1), update the subtitle to "(v2 — based on live site review)" and meta line to "v2". Overwrite v1 in the outputs folder unless the user explicitly asks to keep both.

## What NOT to do

- No emojis. This is a professional deliverable.
- No headers with all caps. Use Title Case.
- No "10 Reasons Why" listicle structure. Use the framework headings.
- No screenshots embedded in the doc unless they prove a specific point (footer brand mismatch is a valid screenshot; a homepage hero is not).
- No marketing-speak in the body ("revolutionize", "synergy", "unlock"). The voice is consulting-analytical.
