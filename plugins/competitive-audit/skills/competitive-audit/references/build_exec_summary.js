// build_exec_summary.js — 2-page Executive Summary docx
//
// Same data shape as build_audit.js, but emits a condensed 2-page brief for
// founders, CMOs, and clients who won't read the full 20-page audit.
//
// Includes:
//   - Title block + mode-aware methodology note (if doc/hybrid)
//   - Executive summary paragraph + 3 headline bullets + callout
//   - Mini four-tier landscape (just the tier names + closest threat)
//   - Top 5 recommendations (drawn from A-bucket, falls back to B if A < 5)
//   - Open questions (top 3)
//   - Sources (top 5)
//
// Usage:
//   node build_exec_summary.js <data.json> [output.docx]
//
// Default output: ~/Downloads/<Client>_ExecSummary.docx

const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, ExternalHyperlink,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber
} = require("docx");

// ---- args ----
const dataPath = process.argv[2];
if (!dataPath) {
  console.error("Usage: node build_exec_summary.js <data.json> [output.docx]");
  process.exit(1);
}
const D = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const clientSlug = (D.client.name || "Client").replace(/[^A-Za-z0-9]+/g, "_");
const outPath = process.argv[3] || path.join(os.homedir(), "Downloads", `${clientSlug}_ExecSummary.docx`);

// ---- tokens ----
const TOKENS = {
  primary:       D.brand?.primary       || "1F3A5F",
  subheadAccent: D.brand?.subheadAccent || "2E5984",
  highlight:     D.brand?.highlight     || "FFF7E6",
  zebra:         D.brand?.zebra         || "F2F4F7",
  muted:         D.brand?.muted         || "808080",
  font:          D.brand?.font          || "Calibri",
};

// ---- helpers ----
const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [new TextRun(text)]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    children: [new TextRun(text)]
  });
}
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 30, after: 30 },
    children: [new TextRun(text)]
  });
}
function callout(text) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    shading: { fill: TOKENS.highlight, type: ShadingType.CLEAR },
    indent: { left: 240, right: 240 },
    children: [new TextRun({ text, italics: true, bold: true, color: TOKENS.primary })]
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    ...opts,
    children: [new TextRun({ text })]
  });
}
function link(label, href) {
  return new Paragraph({
    spacing: { before: 30, after: 30 },
    children: [new ExternalHyperlink({
      link: href,
      children: [new TextRun({ text: label, style: "Hyperlink", size: 18 })]
    })]
  });
}
function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: TOKENS.primary, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({
      spacing: { before: 20, after: 20 },
      children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })]
    })]
  });
}
function bodyCell(text, width, opts = {}) {
  const runs = String(text).split("\n").map(line => new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text: line, bold: !!opts.bold, size: 18 })]
  }));
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    children: runs
  });
}

// ---- title block ----
const TITLE = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 80 },
  children: [new TextRun({ text: `${D.client.name} — Executive Summary`, bold: true, size: 32 })]
});

const SUBTITLE = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 40 },
  children: [new TextRun({ text: "Competitive Audit at a Glance", italics: true, size: 22, color: "5B5B5B" })]
});

const META = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({
    text: `Prepared for ${D.client.preparedFor || ""}  •  ${D.client.date || new Date().toISOString().slice(0, 10)}  •  Full audit available separately`,
    size: 18, color: TOKENS.muted
  })]
});

// ---- methodology note (only if non-URL mode) ----
function methodologyNote() {
  const mode = D.client?.inputMode || "url";
  if (mode === "url") return [];
  const sources = D.client?.sources || [];
  const list = sources.length
    ? sources.map(s => s.type === "url"
        ? `the live site at ${s.value}`
        : `internal document "${s.name}"`).join(" and ")
    : "internal documents provided by the client";
  const body = mode === "document"
    ? `This summary is based on ${list}; no public website was available at preparation time. Trust-surface and pricing observations are limited to what was provided.`
    : `This summary combines ${list}. Where the document and website conflict, the document is treated as more current internal truth.`;
  return [callout(body)];
}

// ---- exec summary ----
const S = D.sections || {};
const execSection = [];
if (S.executiveSummary) {
  execSection.push(h2("The Headline"));
  if (S.executiveSummary.paragraph) execSection.push(p(S.executiveSummary.paragraph));
  for (const b of (S.executiveSummary.bullets || []).slice(0, 3)) execSection.push(bullet(b));
  if (S.executiveSummary.callout) execSection.push(callout(S.executiveSummary.callout));
}

// ---- mini landscape ----
const landscapeSection = [];
if (S.landscape?.table?.rows) {
  landscapeSection.push(h2("Competitive Landscape"));
  const rows = S.landscape.table.rows;
  // Show header + each tier's "players" column only
  const condensed = [
    ["Tier", "Closest threat / cohort"],
    ...rows.slice(1).map(r => [r[0], r[1]])
  ];
  const widths = [3000, 6360];
  const table = new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: condensed.map((row, idx) => new TableRow({
      children: row.map((text, col) => idx === 0
        ? headerCell(text, widths[col])
        : bodyCell(text, widths[col], { fill: idx % 2 === 0 ? TOKENS.zebra : undefined, bold: col === 0 })
      )
    }))
  });
  landscapeSection.push(table);
}

// ---- top 5 recommendations (A bucket, fall back to B if needed) ----
const recsSection = [];
if (S.recommendations) {
  recsSection.push(h2("Top Recommendations (Act This Week)"));
  const aBucket = S.recommendations.a || [];
  const bBucket = S.recommendations.b || [];
  const top5 = [...aBucket, ...bBucket].slice(0, 5);
  for (const r of top5) recsSection.push(bullet(r));
}

// ---- open questions (top 3) ----
const openQSection = [];
if (S.openQuestions?.items?.length) {
  openQSection.push(h2("Open Questions"));
  for (const q of S.openQuestions.items.slice(0, 3)) openQSection.push(bullet(q));
}

// ---- sources (top 5) ----
const sourcesSection = [];
if (S.sources?.length) {
  sourcesSection.push(h2("Key Sources"));
  for (const s of S.sources.slice(0, 5)) sourcesSection.push(link(s.label, s.url));
}

// ---- footer note ----
const footerNote = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 240, after: 0 },
  children: [new TextRun({
    text: `Full audit (${D.client.name}_Competitive_Audit.docx) is available in the same folder. This summary is a 2-page extract.`,
    italics: true, size: 16, color: TOKENS.muted
  })]
});

// ---- build doc ----
const doc = new Document({
  creator: D.client.preparedBy || "Capsule",
  title: `${D.client.name} Executive Summary`,
  description: `2-page executive summary of competitive audit for ${D.client.name}`,
  styles: {
    default: { document: { run: { font: TOKENS.font, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: TOKENS.font, color: TOKENS.primary },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: TOKENS.font, color: TOKENS.primary },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 1 } },
    ]
  },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 280 } } } }
      ]
    }]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1200, right: 1440, bottom: 1200, left: 1440 }
      }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: `${D.client.name} — Executive Summary`, color: TOKENS.muted, size: 16, italics: true })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ", color: TOKENS.muted, size: 16 }),
          new TextRun({ children: [PageNumber.CURRENT], color: TOKENS.muted, size: 16 }),
          new TextRun({ text: "  •  Designed by Capsule", color: TOKENS.muted, size: 16 })
        ]
      })] })
    },
    children: [
      TITLE, SUBTITLE, META,
      ...methodologyNote(),
      ...execSection,
      ...landscapeSection,
      ...recsSection,
      ...openQSection,
      ...sourcesSection,
      footerNote
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log("Wrote:", outPath, buf.length, "bytes");
});
