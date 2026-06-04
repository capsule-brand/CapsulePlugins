// build_audit.js — Parameterized Competitive Audit DOCX builder
//
// Usage:
//   1. cd to a build dir, run `npm install docx`
//   2. Write your data as JSON (see schema at bottom of this file)
//   3. node build_audit.js <data.json> <output.docx>
//
// The data JSON drives every word in the document.
// Visual styling (colors, fonts, tables, callouts) is handled here per doc-style.md conventions.

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, ExternalHyperlink,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber
} = require("docx");

// ---------- args ----------
const dataPath = process.argv[2];
const outPath  = process.argv[3] || "Competitive_Audit.docx";
if (!dataPath) {
  console.error("Usage: node build_audit.js <data.json> [output.docx]");
  process.exit(1);
}
const D = JSON.parse(fs.readFileSync(dataPath, "utf8"));

// ---------- tokens (overridable via D.brand) ----------
const TOKENS = {
  primary:       D.brand?.primary       || "1F3A5F",
  subheadAccent: D.brand?.subheadAccent || "2E5984",
  highlight:     D.brand?.highlight     || "FFF7E6",
  zebra:         D.brand?.zebra         || "F2F4F7",
  muted:         D.brand?.muted         || "808080",
  font:          D.brand?.font          || "Calibri",
};

// ---------- helpers ----------
const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    ...opts,
    children: [new TextRun({ text, ...(opts.run || {}) })]
  });
}
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun(text)]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun(text)]
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun(text)]
  });
}
// Citation superscript renderer.
// `cite` accepts: a number (1), an array ([1, 3, 7]), or undefined/null (no citation).
function citationRuns(cite) {
  if (cite === undefined || cite === null) return [];
  const nums = Array.isArray(cite) ? cite : [cite];
  if (nums.length === 0) return [];
  return [new TextRun({
    text: `[${nums.join(",")}]`,
    superScript: true,
    color: TOKENS.subheadAccent,
    size: 16
  })];
}

// bullet() accepts either:
//   - a plain string: bullet("text")
//   - an object: bullet({text: "...", cite: 3}) or bullet({text: "...", cite: [1, 5]})
function bullet(item, level = 0) {
  const text = typeof item === "string" ? item : item.text;
  const cite = typeof item === "string" ? null : item.cite;
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun(text),
      ...citationRuns(cite)
    ]
  });
}
function bulletBoldHead(headText, restText, level = 0, cite = null) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: headText, bold: true }),
      new TextRun({ text: restText }),
      ...citationRuns(cite)
    ]
  });
}
function callout(text) {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    shading: { fill: TOKENS.highlight, type: ShadingType.CLEAR },
    indent: { left: 240, right: 240 },
    children: [new TextRun({ text, italics: true, bold: true, color: TOKENS.primary })]
  });
}
function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: TOKENS.primary, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })]
    })]
  });
}
function bodyCell(text, width, opts = {}) {
  const { fill, bold = false, alignment } = opts;
  const runs = String(text).split("\n").map((line) => new Paragraph({
    spacing: { before: 20, after: 20 },
    alignment: alignment || undefined,
    children: [new TextRun({ text: line, bold, size: 20 })]
  }));
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    children: runs
  });
}
function buildTable(rows, widths, options = {}) {
  const { highlightCol } = options;
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((row, idx) => new TableRow({
      children: row.map((text, col) => {
        if (idx === 0) return headerCell(text, widths[col]);
        const isHighlight = highlightCol !== undefined && col === highlightCol;
        return bodyCell(text, widths[col], {
          fill: isHighlight ? TOKENS.highlight : (idx % 2 === 0 ? TOKENS.zebra : undefined),
          bold: col === 0,
          alignment: col > 0 && options.centerNonFirst ? AlignmentType.CENTER : undefined
        });
      })
    }))
  });
}
function link(label, href) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [new ExternalHyperlink({
      link: href,
      children: [new TextRun({ text: label, style: "Hyperlink" })]
    })]
  });
}

// ---------- title block ----------
const TITLE = new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 },
  children: [new TextRun({ text: `${D.client.name} — Competitive Audit`, bold: true, size: 40 })]
});
const SUBTITLE = new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 },
  children: [new TextRun({ text: D.client.subtitle || "Positioning, Pricing & Feature Gaps", italics: true, size: 24, color: "5B5B5B" })]
});
const META = new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { before: 0, after: 360 },
  children: [new TextRun({ text: `Prepared for ${D.client.preparedFor || ""}  •  ${D.client.date || new Date().toISOString().slice(0, 10)}`, size: 20, color: TOKENS.muted })]
});

// ---------- sections (data → paragraphs) ----------
const S = D.sections;

function methodologyNote() {
  // Auto-generated based on client.inputMode. Renders before §Executive Summary.
  const mode = (D.client && D.client.inputMode) || "url";
  if (mode === "url") return []; // URL mode: no methodology section (default, well-understood)

  const sources = (D.client && D.client.sources) || [];
  const sourceList = sources.length
    ? sources.map(s => s.type === "url"
        ? `the live site at ${s.value}`
        : `internal document "${s.name}"${s.pages ? ` (${s.pages} pp)` : ""}`)
      .join(" and ")
    : null;

  let body, title;
  if (mode === "document") {
    title = "Methodology & Caveats";
    body = (sourceList
      ? `This audit is based on ${sourceList} provided by the client; `
      : "This audit is based on internal documents provided by the client; ")
      + "no public website was available at the time of preparation. Trust-surface observations (§1) and site-edit recommendations (§7-A) are limited or substituted accordingly. A web-based follow-up after product launch is recommended to surface site-visible gaps.";
  } else { // hybrid
    title = "Methodology & Caveats";
    body = (sourceList
      ? `This audit combines ${sourceList}. `
      : "This audit combines a live website read with internal documents provided by the client. ")
      + "Where the document and website conflict, the document is treated as more current internal truth. Pricing and product detail labeled \"Source: internal document\" are not publicly available and should not be cited externally.";
  }

  return [
    h1(title),
    callout(body)
  ];
}

function execSummary() {
  if (!S.executiveSummary) return [];
  return [
    h1("Executive Summary"),
    p(S.executiveSummary.paragraph, { spacing: { before: 100, after: 100 } }),
    ...(S.executiveSummary.bullets || []).map(b => bullet(b)),
    ...(S.executiveSummary.callout ? [callout(S.executiveSummary.callout)] : [])
  ];
}

function clientSnapshot() {
  if (!S.clientSnapshot) return [];
  const out = [h1(`1. ${D.client.name} Snapshot`)];
  for (const block of S.clientSnapshot.blocks || []) {
    out.push(h2(block.heading));
    for (const item of block.items || []) {
      if (item.head && item.body) out.push(bulletBoldHead(item.head + " ", item.body, 0, item.cite));
      else if (typeof item === "string") out.push(bullet(item));
      else out.push(bullet(item)); // object form {text, cite}
    }
  }
  if (S.clientSnapshot.priceTable) {
    out.push(h2("Pricing"));
    if (S.clientSnapshot.pricingIntro) out.push(p(S.clientSnapshot.pricingIntro, { spacing: { before: 60, after: 80 } }));
    out.push(buildTable(S.clientSnapshot.priceTable.rows, S.clientSnapshot.priceTable.widths));
  }
  if (S.clientSnapshot.callouts) {
    for (const c of S.clientSnapshot.callouts) out.push(callout(c));
  }
  if (S.clientSnapshot.flags) {
    out.push(h2("Things to flag on the site itself"));
    for (const f of S.clientSnapshot.flags) out.push(bullet(f));
  }
  return out;
}

function landscape() {
  if (!S.landscape) return [];
  const out = [
    h1("2. Competitive Landscape — Four Tiers"),
    p(S.landscape.intro || "")
  ];
  out.push(buildTable(S.landscape.table.rows, S.landscape.table.widths));
  return out;
}

function competitorProfiles() {
  if (!S.competitorProfiles) return [];
  const out = [h1("3. Competitor Profiles")];
  for (const tier of S.competitorProfiles.tiers || []) {
    out.push(h2(tier.heading));
    for (const c of tier.competitors || []) {
      out.push(h3(c.name));
      for (const fact of c.facts || []) {
        out.push(bulletBoldHead(fact.label + ": ", fact.value, 0, fact.cite));
      }
    }
  }
  return out;
}

function pricing() {
  if (!S.pricing) return [];
  const out = [
    h1("4. Pricing & Cost Analysis"),
    p(S.pricing.intro || "")
  ];
  if (S.pricing.vendorTable) out.push(buildTable(S.pricing.vendorTable.rows, S.pricing.vendorTable.widths, { highlightCol: 1 }));
  if (S.pricing.economics) {
    out.push(h2("Per-unit economics"));
    out.push(p(S.pricing.economics.intro || "", { spacing: { before: 60, after: 80 } }));
    out.push(buildTable(S.pricing.economics.table.rows, S.pricing.economics.table.widths));
  }
  if (S.pricing.commentary) {
    out.push(h2("What this means for pricing"));
    for (const c of S.pricing.commentary) out.push(bullet(c));
  }
  return out;
}

function features() {
  if (!S.features) return [];
  const out = [
    h1("5. Feature & Coverage Comparison"),
    p(S.features.intro || ""),
    buildTable(S.features.table.rows, S.features.table.widths, { highlightCol: 1, centerNonFirst: true })
  ];
  return out;
}

function winsAndGaps() {
  if (!S.winsAndGaps) return [];
  const out = [h1("6. Where the Client Stands — Wins, Parity, Gaps")];
  for (const section of [["wins", "Where the client clearly leads"], ["parity", "Where the client is at parity (table stakes)"], ["gaps", "Where the client lags or has visible gaps"]]) {
    const [key, label] = section;
    if (!S.winsAndGaps[key]) continue;
    out.push(h2(label));
    for (const item of S.winsAndGaps[key]) out.push(bullet(item));
  }
  return out;
}

function recommendations() {
  if (!S.recommendations) return [];
  const out = [
    h1("7. Recommendations — Ordered by Leverage"),
    p(S.recommendations.intro || "", { spacing: { before: 60, after: 80 } })
  ];
  for (const bucket of [
    ["a", "A. Trust & defensibility (do these first / this week)"],
    ["b", "B. Product features (the 6-month roadmap)"],
    ["c", "C. Pricing & packaging moves"],
    ["d", "D. GTM & positioning"],
  ]) {
    const [key, heading] = bucket;
    if (!S.recommendations[key]) continue;
    out.push(h2(heading));
    for (const item of S.recommendations[key]) out.push(bullet(item));
  }
  return out;
}

function openQuestions() {
  if (!S.openQuestions) return [];
  return [
    h1("8. Open Questions"),
    p(S.openQuestions.intro || "Answers to these will sharpen the next pass.", { spacing: { before: 60, after: 80 } }),
    ...(S.openQuestions.items || []).map(q => bullet(q))
  ];
}

function sources() {
  if (!S.sources) return [];
  return [
    h1("Sources"),
    p("Public materials referenced for this audit. Citations like [1] in the body refer to these numbered entries.", { spacing: { before: 60, after: 80 } }),
    ...S.sources.map((s, i) => new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [
        new TextRun({ text: `[${i + 1}] `, bold: true, color: TOKENS.subheadAccent }),
        new ExternalHyperlink({
          link: s.url,
          children: [new TextRun({ text: s.label, style: "Hyperlink" })]
        })
      ]
    }))
  ];
}

// ---------- build ----------
const doc = new Document({
  creator: D.client.preparedBy || "Claude",
  title: `${D.client.name} Competitive Audit`,
  description: `Competitive audit of ${D.client.name}`,
  styles: {
    default: { document: { run: { font: TOKENS.font, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: TOKENS.font, color: TOKENS.primary },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: TOKENS.font, color: TOKENS.primary },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: TOKENS.font, color: TOKENS.subheadAccent },
        paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 280 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 280 } } } }
      ]
    }]
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1300, right: 1440, bottom: 1300, left: 1440 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: `${D.client.name} — Competitive Audit`, color: TOKENS.muted, size: 18, italics: true })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ", color: TOKENS.muted, size: 18 }),
          new TextRun({ children: [PageNumber.CURRENT], color: TOKENS.muted, size: 18 }),
          new TextRun({ text: `  •  Prepared ${D.client.date || new Date().toISOString().slice(0,10)}`, color: TOKENS.muted, size: 18 })
        ]
      })] })
    },
    children: [
      TITLE, SUBTITLE, META,
      ...methodologyNote(),
      ...execSummary(),
      ...clientSnapshot(),
      ...landscape(),
      ...competitorProfiles(),
      ...pricing(),
      ...features(),
      ...winsAndGaps(),
      ...recommendations(),
      ...openQuestions(),
      ...sources(),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Wrote:", outPath, buf.length, "bytes");
});

/* ----------------------------------------------------------------------------
DATA SHAPE (audit_data.json)

{
  "client": {
    "name": "Clearance Lab",
    "subtitle": "Positioning, Pricing & Feature Gaps in AI Label-Compliance Tooling",
    "preparedFor": "Brian",
    "date": "2026-04-27",
    "preparedBy": "Claude",
    "inputMode": "url",                    // "url" | "document" | "hybrid" — drives auto-generated methodology section
    "sources": [                           // optional; renders inline in methodology callout if set
      { "type": "url", "value": "https://acme.io" },
      { "type": "document", "name": "Acme Product Brief v3.pdf", "pages": 12 }
    ]
  },
  "brand": { "primary": "1F3A5F", "highlight": "FFF7E6" },   // optional overrides
  "sections": {
    "executiveSummary": {
      "paragraph": "One paragraph framing the audit.",
      "bullets": ["Headline 1", "Headline 2", "Headline 3"],
      "callout": "Bottom line: ..."
    },
    "clientSnapshot": {
      "blocks": [
        { "heading": "Product", "items": [
          {"head":"Tagline:","body":" \"AI for label compliance.\""},
          {"head":"Pricing:","body":" $19-$249 credit packs", "cite": 1},            // ← cited claim (sources[0])
          {"head":"Frameworks:","body":" FDA, EU FIC, AAFCO", "cite": [1, 3]}        // ← multi-cite
        ] },
        { "heading": "Coverage", "items": [...] }
      ],
      "pricingIntro": "Optional intro to pricing table.",
      "priceTable": {
        "widths": [1700, 900, 900, 1400, 4460],
        "rows": [
          ["Plan", "Price", "Credits", "$/scan", "Includes"],
          ["Starter", "$19", "15", "$1.27", "..."],
          ...
        ]
      },
      "callouts": ["Footer brand mismatch..."],
      "flags": ["No enterprise tier.", "No SOC 2 signal.", ...]
    },
    "landscape": {
      "intro": "Four tiers ...",
      "table": {
        "widths": [1700, 2400, 2000, 3260],
        "rows": [["Tier","Players","Pricing range","Strategic posture vs. Client"], [...]]
      }
    },
    "competitorProfiles": {
      "tiers": [
        { "heading": "Tier 1 — AI-native rivals",
          "competitors": [
            { "name": "Label Score AI",
              "facts": [{"label":"Pitch","value":"..."}, {"label":"Pricing","value":"$500-$5,000/mo"}, ...] }
          ] }
      ]
    },
    "pricing": {
      "intro": "...",
      "vendorTable": { "widths":[2100,1800,1800,1800,1860], "rows": [["Vendor","Entry","Mid","Enterprise","Model"], ...] },
      "economics": {
        "intro": "At typical volumes:",
        "table": { "widths":[1800,2700,2700,2160], "rows": [["Volume","Client","Closest competitor","Client is..."], ...] }
      },
      "commentary": ["Lead with the price gap above the fold.", ...]
    },
    "features": {
      "intro": "Y / ~ / N legend.",
      "table": { "widths":[2400,1320,1320,1320,1500,1500], "rows": [["Capability","Client","Comp A","Comp B","Comp C","Comp D"], ...] }
    },
    "winsAndGaps": {
      "wins":   ["..."],
      "parity": ["..."],
      "gaps":   ["..."]
    },
    "recommendations": {
      "intro": "Ordered by leverage.",
      "a": ["Trust fix 1", ...],
      "b": ["Product feature 1", ...],
      "c": ["Pricing move 1", ...],
      "d": ["GTM move 1", ...]
    },
    "openQuestions": {
      "intro": "Answers to these will sharpen the next pass.",
      "items": ["...", "..."]
    },
    "sources": [ {"label": "...", "url": "https://..."}, ... ]
  }
}
---------------------------------------------------------------------------- */
