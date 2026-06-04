# Capsule competitive-audit — TODO

Backlog of meaningful improvements not yet built. Ordered roughly by impact-per-effort. Pick from the top.

## Shipped in v0.3.0 (for reference)

- ✅ #1 GitHub backup — pushed to `Xactoblade/CapsulePlugins`
- ✅ #2 Executive Summary auto-output — `build_exec_summary.js` produces a 2-page brief alongside the full audit
- ✅ #3 Per-claim source citations — superscript `[N]` markers + auto-numbered sources

---

## #4 Branded docx template

Make every audit look like a Capsule agency deliverable, not a Claude generation.

**What to build:**
- Capsule logo embedded on the cover page (PNG asset shipped in `plugins/competitive-audit/assets/`)
- Brand-specific color palette (override the default navy/cream)
- Capsule signature block at the end with prepared-by + contact
- Optional cover image: automatic Playwright screenshot of the client's homepage

**Effort:** ~2 hours (logo, color tokens, cover render in `build_audit.js`)
**Value:** High when sending audits to clients — looks professional, not generated

---

## #5 Battle card output per Tier 1 competitor

For each direct competitor identified, produce a separate single-page `<Competitor>_BattleCard.docx` for sales enablement.

**What it contains:**
- Their pitch (one line)
- Our wins (where the client beats them)
- Their wins (where they beat the client — honestly)
- Top 3 objections + how to handle each
- Trigger events ("if you hear X, lead with Y")

**What to build:**
- `build_battle_card.js` consuming `competitorProfiles.tiers[0].competitors[]`
- Workflow updates to also produce N battle cards on each audit run

**Effort:** ~3 hours
**Value:** High for client work that includes sales enablement deliverables

---

## #6 PowerPoint output for client meetings

Same audit data, presented as slides.

**What to build:**
- `build_pptx.js` using `pptxgenjs` or unzip-template approach
- Map sections: 1 slide for exec summary, 1 for landscape table, 1 per competitor, 1 per recommendation bucket, 1 for open questions
- Use the same brand tokens as the docx

**Effort:** ~4-6 hours (pptx is fiddly)
**Value:** High when audits are presented in client meetings; medium when they're emailed as documents

---

## #7 24-hour Playwright scrape cache

Avoid re-scraping the same page when iterating on the same client within a day.

**What to build:**
- Wrapper around Playwright calls that hashes URL + date, stores response in `~/.cache/competitive-audit/<hash>.json`
- Cache TTL: 24 hours (configurable)
- Bust on `--no-cache` flag in the audit prompt

**Effort:** ~2 hours
**Value:** Medium — most useful when actively iterating an audit; saves ~2-3 minutes per re-run

---

## #8 Client history directory structure

Replace `~/Downloads/` default with `~/CapsuleAudits/<Client>/<YYYY-MM-DD>/` structure for organized historical archives.

**What to build:**
- Update workflow.md default output path
- Add a "client name lookup" step that asks the user once and remembers (in `~/.config/capsule-audit/clients.json`)
- Add `audit-diff` command: compare any two historical audits for the same client and produce a "what changed" report

**Effort:** ~3 hours (mostly the diff logic)
**Value:** Medium — high for recurring client work, low for one-offs

---

## #9 Notion auto-archive

After every completed audit, automatically create a Notion page under your "Audits" parent with:
- The docx attached
- A 200-word summary of findings
- Link to the client URL
- Timestamp
- Tag with client name

**What to build:**
- Notion MCP integration in workflow Step 10 (Present)
- Configurable parent page ID in `~/.config/capsule-audit/notion-archive.json`

**Effort:** ~2 hours
**Value:** Medium — high if you do >5 audits/month and want a searchable archive

---

## #10 Slack notification on completion

When the audit finishes, post to a Slack channel:
- Client name + URL
- Top finding (1 line)
- Link to the docx file (using `computer://` URL on Mac)
- Total runtime

**What to build:**
- Slack MCP integration in workflow Step 10
- Configurable channel ID + webhook in `~/.config/capsule-audit/slack.json`

**Effort:** ~1 hour
**Value:** Low-medium — useful when you start an audit and walk away to a meeting

---

## Stretch ideas (no priority yet)

- **Multi-language support** — handle non-English client sites (Playwright already gets the DOM; just need Claude to translate during synthesis)
- **Resumable audits** — save `competitor_<name>.json` files mid-run so failures don't lose 7 minutes of work
- **Pricing-sanity-check** — validate that the per-unit economics table math is correct (catch typos before publish)
- **CRM integration** — pull client info from a CRM, save audit URL back to client record
- **Subagent timing telemetry** — record how long each phase takes, identify bottlenecks
- **Confidence scoring** — each finding tagged with HIGH/MEDIUM/LOW confidence based on source quality

---

## How to pick the next one

Rule of thumb: ship the next item only when you've felt the friction it solves three times. Avoid the trap of building features speculatively.

If you've delivered 5+ audits to clients and they keep saying "this is too long, can I get a 1-pager?" — you would've been right to build #4 (branded template) or #6 (pptx). Until then, the v0.3.0 set is enough.
