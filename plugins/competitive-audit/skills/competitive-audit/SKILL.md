---
name: competitive-audit
description: Produce a Word-document competitive audit of a client's product against their market. Accepts a live website URL, an uploaded document (PDF / Word / PowerPoint / text), or both as input. Trigger on "competitive audit", "audit our website against competitors", "competitor analysis with pricing", "how do we compare to X", "where do we stand vs", "pricing benchmark vs competitors", "competitor research for [client/url]", "competitive audit from this deck", "audit based on this PDF", "competitor analysis from the attached doc", or any request that combines a client identifier (URL or uploaded doc) with "competitors / market / pricing / positioning / gaps". The deliverable is a styled .docx with executive summary, four-tier competitive landscape, pricing comparison, feature matrix, wins/parity/gaps, and prioritized recommendations bucketed as Trust / Product / Pricing / GTM.
---

# Competitive Audit

Generate a client-ready competitive audit as a styled Word document. Accepts a live URL, an uploaded product document, or both. Identifies 5–8 competitors across four pricing tiers, researches each one, and produces a docx that follows a consistent visual template.

## Input modes

The skill supports three input modes — auto-detected based on what the user provides:

| Mode | Trigger | Best for |
|---|---|---|
| **URL only** | User gives a website URL | Live products with a public site |
| **Document only** | User attaches a PDF / .docx / .pptx / .txt / .md, no URL | Pre-launch, stealth-mode, or pre-revenue products with no public site |
| **Hybrid (URL + document)** | User provides both | Live products where an internal doc has detail the public site doesn't (pricing roadmap, investor deck, product spec) |

See `references/document-input.md` for how to extract client-snapshot facts from a document, what gets weaker in document-only mode, and how to handle confidential uploads.

## Quick reference

| Step | What happens |
|---|---|
| 1 | Ask 3 clarifying questions: input source (URL/doc/both), format, focus area |
| 2 | Extract client info — Chrome MCP for URL, docx/pdf/pptx skills for documents, or both for hybrid |
| 3 | Classify the client + identify competitors across the 4-tier framework |
| 4 | Spawn `competitor-research` agents in parallel (1 per competitor) |
| 5 | Synthesize wins/parity/gaps and A/B/C/D recommendations |
| 6 | Build the docx via `build_audit.js` with client-specific branding + auto-generated mode-aware methodology note |
| 7 | Spawn `audit-qa` agent to review the draft |
| 8 | Present the file with a 3-bullet headline summary and open questions |

## Workflow rules

**Read the actual source, never search snippets.** If a URL is provided, read the live site via Chrome MCP. If a document is provided, parse it with the pdf/docx/pptx skill. Search-only analysis produced the wrong audit in early test runs and is the single biggest correctness risk.

**For URL input, always use Chrome MCP.** `mcp__Claude_in_Chrome__navigate` + `mcp__Claude_in_Chrome__get_page_text` is the canonical extraction path. Take a screenshot if visual analysis (brand colors, hero composition) is needed. If the URL is blocked by the network allowlist, ask the user to add it in Settings → Capabilities or paste the homepage copy.

**For document input, use the appropriate extraction skill.** PDF → pdf skill (Read tool works for small files). Word doc → docx skill. PowerPoint → pptx skill. Plain text/markdown → Read tool directly. After extraction, transcribe the same client-snapshot facts the URL path produces (see `references/document-input.md`).

**For hybrid mode, run both extractions and merge.** Track which fact came from which source in the working notes so the audit's "Sources" section can cite each one correctly. Prefer the document over the URL when they conflict — the document is usually more current internal truth.

**Spawn agents in parallel.** Use the `competitor-research` subagent — one per competitor, sent in a single tool-call batch. This collapses ~10 minutes of serial work into ~90 seconds and keeps the main context clean. Never research competitors inline in the main thread.

**Use the four-tier framework.** Every competitive set in this category fits one of these tiers (see `references/tier-framework.md`):

1. Direct AI-native rivals (same wedge, same positioning)
2. AI-augmented established platforms (workflow + AI bolt-on)
3. Enterprise incumbents (regulatory / supplier / data moat)
4. DIY low-end / adjacent tools (cheap perceived alternatives)

**Bucket recommendations as A/B/C/D.** Don't dump a flat list. Order is:

- A. Trust & defensibility (security badges, SOC 2, named advisor, logos)
- B. Product features (the 6-month roadmap moves that close gaps)
- C. Pricing & packaging (tier ladder, subscription vs. credits, enterprise add-ons)
- D. GTM & positioning (landing pages, partnerships, content)

**Build with the visual template.** `references/build_audit.js` is a parameterized docx-js builder. Pass it `{client, brand, sections}` and it handles every layout decision — header band, zebra tables, callouts, footer, font choices. See `references/doc-style.md` for the conventions.

**QA before presenting.** Spawn the `audit-qa` agent with the draft. It re-reads with no exposure to the research context, which catches missed gaps, unsupported claims, and accidental omissions.

## Detailed playbook

See `references/workflow.md` for the step-by-step procedure with example tool calls and prompts.

## Frameworks & methodology

- `references/tier-framework.md` — how to assign competitors to the four tiers
- `references/audit-frame.md` — the Wins/Parity/Gaps structure and the A/B/C/D recommendation buckets
- `references/pricing-economics.md` — how to build the per-unit cost economics table (the "X× cheaper at N volume" math)
- `references/doc-style.md` — visual conventions: colors, fonts, table styles, callouts
- `references/document-input.md` — how to extract client-snapshot facts from an uploaded document; what gets weaker in doc-only mode; confidential-handling rules

## Template

- `references/build_audit.js` — parameterized docx-js builder. Run with Node after `npm install docx` in the outputs folder.

## What this skill does NOT do

- Pure marketing audits (copy, ads, SEO) — that's the `ai-marketing-claude` pattern, not this one
- Startup validation / market sizing — use a startup-design skill instead
- Sales battle cards — those are a one-page derivative; this skill produces the full audit
- Win/loss analysis — out of scope; needs CRM data

If the user asks for any of those, finish the audit first and offer the derivative as a follow-up.
