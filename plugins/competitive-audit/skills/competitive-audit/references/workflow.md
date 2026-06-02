# Workflow Playbook

Step-by-step procedure for running a competitive audit. Follow in order.

## Step 1 — Clarify scope (3 questions, AskUserQuestion)

Ask these exactly:

1. **Input source** — Website URL, uploaded document (PDF / Word / PowerPoint), or both? (Skip if the user already attached a doc or pasted a URL — the answer is implicit.)
2. **Format** — Word doc (default), slide deck, spreadsheet matrix, or markdown summary?
3. **Focus** — Positioning, pricing/packaging, feature gaps, or all three?

If the user already specified any of these in the original message, skip the corresponding question. Competitors-picking can default to "Claude picks" unless the user offered a list.

Set `client.inputMode` to `"url"`, `"document"`, or `"hybrid"` based on the answer — this drives the auto-generated methodology note in §0 of the doc.

## Step 2 — Extract client info (branch by input mode)

### Step 2A — URL input

**Default: Playwright (headless).** Same behavior on every machine, no visible browser windows. Order:

**Tier 1: Playwright MCP** (default — headless, identical behavior Powerbook ↔ Forge ↔ any machine)

```
mcp__playwright__browser_navigate                  # to the client URL
mcp__playwright__browser_snapshot                  # accessibility tree + text
mcp__playwright__browser_take_screenshot           # only if visual analysis needed
# or for raw text extraction:
mcp__playwright__browser_evaluate                  # { document.body.innerText }
```

Use this for every audit unless the user explicitly says "use my Chrome session" or the target site requires an authenticated user state.

**Tier 2: Chrome MCP** (only when needed — paywalled content, internal tools, signed-in-only state)

```
mcp__Claude_in_Chrome__list_connected_browsers
mcp__Claude_in_Chrome__select_browser
mcp__Claude_in_Chrome__tabs_context_mcp            # createIfEmpty: true
mcp__Claude_in_Chrome__navigate
mcp__Claude_in_Chrome__get_page_text
```

Switching to Chrome opens a visible browser window. Only do this when Playwright's headless context genuinely cannot satisfy the audit.

**Tier 3: `web_fetch`** (last resort — text-only, may miss JS-rendered content)

Only when Tier 1 and Tier 2 both fail. Flag in the methodology callout that the extraction may be incomplete.

**Never use** raw web search snippets for the client site — they produce wrong audits.

For pages with pricing or feature info on sub-pages, navigate to each and extract via the same tier. Always include the pricing page if it exists.

### Step 2B — Document input

Pick the right extraction tool by file type:

| File type | Tool to use |
|---|---|
| `.pdf` | `Read` tool (small files) or `pdf` skill (large / scanned) |
| `.docx` | `docx` skill — `pandoc --track-changes=all <file> -o /tmp/text.md` |
| `.pptx` | `pptx` skill — unpack, read slide XML |
| `.txt` / `.md` | `Read` tool directly |
| Image (rare) | Vision — Read the image and transcribe |

After extraction, transcribe the same client-snapshot fields you'd extract from a website (see Step 3). Note which fields are missing — they become candidates for the §8 Open Questions list.

See `document-input.md` for the full extraction schema and what to do when key fields are missing.

### Step 2C — Hybrid input (URL + document)

Run both Step 2A and Step 2B. Merge into a single `client_snapshot.md` with each fact labeled by source. Prefer the document over the URL when they conflict — internal docs are usually more current. If a fact is in the document only (e.g., unannounced pricing), flag it as "Source: internal document, page N" so the audit doesn't accidentally surface it externally.

## Step 3 — Classify the client

From the extracted text, identify:

- **Category** (what kind of product is it)
- **Tagline / promise** (the one-line value prop)
- **Industries served** (CPG, finance, healthcare, etc.)
- **Personas named** (the ICPs they call out)
- **Pricing model** (subscription, credits, per-seat, enterprise-only)
- **Pricing tiers** with exact prices and what's included
- **Frameworks / standards / certifications** (FDA, SOC 2, ISO, etc.)
- **Trust surface** (logos, testimonials, security page, advisors)
- **Visible gaps** (no enterprise tier, no SSO, no integrations, brand mismatches in footer)

Write this as `client_snapshot.md` in the working directory.

## Step 4 — Identify competitors across the four tiers

See `tier-framework.md` for the categorization rules. Target 5–8 competitors:

- 2–3 in Tier 1 (direct AI-native)
- 1–2 in Tier 2 (AI-augmented established)
- 1–2 in Tier 3 (enterprise incumbents)
- 1–2 in Tier 4 (DIY low-end)

If the user provided a list, slot their picks into tiers and add any obvious omissions. Confirm before research.

## Step 5 — Spawn competitor-research agents in parallel

For each competitor, spawn the `competitor-research` subagent with:

```
Agent({
  subagent_type: "competitor-research",
  description: "Research <competitor name>",
  prompt: "Research <competitor> for a competitive audit of <client> (<client URL>, <client one-line>). Return the canonical JSON schema (see your system prompt). The client's industries are <X, Y, Z> — focus on competitor coverage of those."
})
```

Send all agent calls in a single assistant message so they run concurrently.

Each agent returns a JSON-shaped competitor profile (positioning, frameworks covered, pricing, features, customer proof, threat level, source URLs). Store as `competitor_<name>.json` in the working directory.

## Step 6 — Synthesize wins/parity/gaps + recommendations

See `audit-frame.md` for the structure. Three sections per competitor or rolled up:

1. **Wins** — where the client clearly leads (defensible advantages)
2. **Parity** — category table stakes (don't over-claim these)
3. **Gaps** — where the client lags (the real recommendations come from here)

Then bucket recommendations as **A. Trust → B. Product → C. Pricing → D. GTM**, ordered by leverage (impact per effort). A-bucket items are always "this week" fixes; D-bucket items are GTM strategy moves.

## Step 7 — Build the per-unit cost economics table

See `pricing-economics.md`. Pick 4 volume tiers that span the realistic customer range. For each tier, show client cost, closest competitor cost, and the multiplier ("X× cheaper" or "X× more expensive"). If the client's pricing is materially better or worse, this table is the headline data point.

## Step 8 — Build the docx

Run `references/build_audit.js` with the sections object. Steps:

1. Ensure `docx` is installed in the build dir: `cd <build dir> && npm install docx`
2. Construct the `data` object — `client`, `brand`, `sections` (see template comments)
3. Run `node build_audit.js`
4. Validate with the docx skill's validator if available
5. Output to `<client>_Competitive_Audit.docx` in the outputs folder

## Step 9 — QA before presenting

Spawn the `audit-qa` agent with the path to the draft. It reads with no prior context and checks for:

- Unsupported claims (anything not backed by an extracted fact or a cited URL)
- Missing competitors (obvious players left out of the set)
- Recommendation order issues (a B-bucket item that should be in A)
- Brand mismatches the audit missed (e.g., footer mismatches, copyright dates)
- Internal inconsistencies (price quoted differently in two places)

Apply its fixes before presenting.

## Step 10 — Present

Present the file with:

- A 3-bullet headline summary (the most important finding, the loudest advantage, the biggest gap)
- One callout for any "fix this week" item (footer brand mismatch, missing SOC 2, etc.)
- The list of open questions (always include — these are how the next iteration sharpens)
- Sources list at the end

Use `present_files` to drop the docx with an install button. Use a `computer://` link in the chat to view it.

## When to skip steps

- **Skip Step 1** if user gave a fully-specified original request
- **Skip Step 9 (QA agent)** if it's a quick-turn deliverable and the user is iterating live — the QA pass is most valuable for first drafts going to external audiences
- **Skip Step 2A (Chrome MCP)** ONLY in document-only mode, or if the user has explicitly pasted the entire homepage copy
- **Never skip Step 2 entirely** — the live read / document parse is the single biggest correctness control. A search-only audit is wrong.
