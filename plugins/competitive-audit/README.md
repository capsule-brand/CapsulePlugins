# Competitive Audit (Cowork Plugin) — v0.2

Produce a client-ready Word competitive audit in ~5 minutes — including a styled docx, a per-unit cost economics table, a feature matrix, and prioritized recommendations bucketed as Trust / Product / Pricing / GTM.

**New in v0.2:** Accepts an uploaded PDF / Word / PowerPoint / text document as input — not just a website URL. Three modes: URL-only, document-only (for pre-launch / stealth products with no public site), or hybrid (live site + internal doc for richer detail). The doc auto-generates a mode-aware methodology note at the top.

## What you get

A single command — natural-language or `/competitive-audit <client URL>` — produces a finished docx with:

- Executive summary with the 3 most important findings
- §1 Client snapshot (reads the live site via Chrome MCP, not just web search)
- §2 Four-tier competitive landscape
- §3 Per-competitor profiles (researched in parallel by subagents)
- §4 Pricing comparison + per-unit economics table ("X× cheaper at N volume")
- §5 Feature matrix with the client's column highlighted
- §6 Wins / Parity / Gaps
- §7 Recommendations bucketed A. Trust → B. Product → C. Pricing → D. GTM
- §8 Open questions
- Sources

## How to install

1. Drop the bundled `.plugin` file into Cowork
2. Click "Install"
3. Open any session and say "Run a competitive audit on acme.io" — the skill triggers automatically

## How it works

```
You type "competitive audit acme.io"
        ↓
[Skill]   Asks 3 clarifying questions (format, focus, who picks competitors)
        ↓
[Skill]   Opens acme.io via Chrome MCP, extracts the live page text
        ↓
[Skill]   Classifies the client + identifies 5–8 competitors across the 4 tiers
        ↓
[Agents]  competitor-research × 5–8 spawned in parallel — each returns a JSON profile
        ↓
[Skill]   Synthesizes wins/parity/gaps + A/B/C/D recommendations
        ↓
[Skill]   Builds the docx with the parameterized template (consistent visual style)
        ↓
[Agent]   audit-qa reviews the draft with fresh eyes; skill applies the punch list
        ↓
[Skill]   Presents the file with 3-bullet headline + open questions
```

## What's in the bundle

```
competitive-audit/
├── .claude-plugin/plugin.json
├── skills/competitive-audit/
│   ├── SKILL.md                      Trigger phrases + workflow rules
│   └── references/
│       ├── workflow.md               Step-by-step playbook
│       ├── tier-framework.md         How to assign competitors to the 4 tiers
│       ├── audit-frame.md            Wins/Parity/Gaps + A/B/C/D buckets
│       ├── pricing-economics.md      Per-unit cost table methodology
│       ├── doc-style.md              Visual conventions (colors, fonts, tables)
│       ├── document-input.md         Doc-upload mode: extraction schema + confidentiality
│       └── build_audit.js            Parameterized docx-js builder
└── agents/
    ├── competitor-research.md        Per-competitor JSON profiler (parallel)
    └── audit-qa.md                   Independent review of the draft
```

## What's novel here

Most existing competitive-audit skills rely on web search alone. This one opens the live client site via the Claude in Chrome extension and extracts the actual page content — which materially improves accuracy on pricing, tier names, and trust-surface gaps. The per-unit cost economics table ("X× cheaper at N volume") and the A/B/C/D recommendation buckets are also unique to this skill.

## Requirements

- Cowork desktop app
- Claude in Chrome extension installed and connected (for reading the client's live site)
- Node.js with `docx` installed in the build directory (`npm install docx` — done automatically by the workflow)

## When NOT to use this skill

- Pure marketing audit (copy, ads, SEO) — use a marketing-audit skill instead
- Startup validation / market sizing — use a startup-design skill
- Sales battle cards — derivative of this audit; produce the audit first, then ask for battle cards
- Win/loss analysis — needs CRM data this skill doesn't touch

## Customization

To use your own brand colors in the output docx, pass a `brand` block in the audit data:

```json
{
  "brand": {
    "primary": "1F3A5F",      // heading + table header fill
    "subheadAccent": "2E5984",
    "highlight": "FFF7E6",    // callouts + client column
    "zebra": "F2F4F7"
  }
}
```

Defaults are tuned for a neutral, consulting-grade look. Override only when running for a specific brand.

## License

MIT — fork freely.
