# ColorProof — color logic & data schemas (v2)

Read this before interpreting results. It defines how the engine decides
pass / fail / neutral / needs-spec, and the shape of the job and result files.

## Modes

`COLORPROOF_JOB.mode` routes the engine:

- `"package"` + `action:"proof"` → recursive multi-format proof against an expected palette.
- `"package"` + `action:"fix"`   → recursive multi-format correction via value-based swaps.
- `"proof"` / `"fix"`            → original single-folder paths (exact-signature mappings).
- `"reexport"`                   → re-export sibling `.pdf` from `.ai` (mode spot|cmyk|preserve).

The engine sets `app.userInteractionLevel = DONTDISPLAYALERTS` so batch opens don't block on
routine dialogs.

## Palette format (proof)

```javascript
palette: [
  { id:"orange", name:"Orange", cmyk:[0,62,100,0], pantone:"PANTONE 3564 C", hex:"ef6a00" },
  { id:"purple", name:"Purple", cmyk:[95,100,0,6], pantone:"PANTONE 2105 C", hex:"39207c" }
]
```

Supply every model the files actually use. A color stored in a model you did NOT supply is
returned as **needs-spec** (uncheckable), never guessed. CMYK-only input verifies CMYK files;
add `pantone` to verify PMS files and `hex` to verify SVG.

## How a color is matched

- **Spot named like a CMYK build** (`"C=0 M=62 Y=100 K=0"`) → the CMYK is parsed from the
  name and compared to palette `cmyk`.
- **Process CMYK** → compared by exact C,M,Y,K (integers).
- **RGB / SVG hex** → compared by exact hex.
- **Genuine Pantone spot** → compared by normalized name to palette `pantone`
  (PANTONE/PMS prefixes stripped, case/space-insensitive). With no `pantone` in the palette,
  it's **needs-spec**, not fail.
- **Neutral** (CMYK C=M=Y=0 any K; RGB R=G=B; gray; spot Black/White/Paper/Registration) →
  **neutral** (passes).

## Statuses (package proof)

Per color: `pass` | `fail` | `neutral` | `uncheckable` ("needs spec" in the report).
`result.summary` tallies distinct colors: `{pass, fail, neutral, uncheckable}`.

## Package proof — job & result

```javascript
var COLORPROOF_JOB = {
  mode:"package", action:"proof",
  root:"/abs/path/to/Package",
  palette:[ /* entries above; omit to inventory only */ ]
};
```

```javascript
{
  mode:"package", action:"proof", root:"...", expected:[...palette...],
  counts:{ aiFiles, svgFiles, pdfFiles, jpgFiles, pngFiles },
  aiColors:[ { signature, model, name, values, files, instances, status, match } ],
  svgColors:[ { hex, files, instances, status } ],
  summary:{ pass, fail, neutral, uncheckable }
}
```

## Package fix — job & result

Swaps are **value-based**. Each swap names the color to find (`from`) and the color to
become (`to`), in whatever models apply. The matched representation drives the output.

```javascript
var COLORPROOF_JOB = {
  mode:"package", action:"fix",
  root:"/abs/path/to/Package",
  swaps:[
    // process / CMYK-built color -> new CMYK (and the matching SVG hex):
    { name:"Purple to Teal",
      from:{ cmyk:[95,100,0,6], hex:"39207c" },
      to:{   cmyk:[83,44,36,8], hex:"288396" } },
    // Pantone spot -> Pantone spot, target built from real Lab (see acb_lab.py):
    { name:"Purple 2105 C to 7683 C",
      from:{ pantone:"PANTONE 2105 C" },
      to:{   pantone:"PANTONE 7683 C", lab:[44.71,0,-38] } }
  ],
  options:{
    removeUnusedSwatches:"non-palette", // "non-palette"(default) | "all" | "none"
    reexportPDF:true, reexportJPG:true, reexportPNG:true, svg:true, // all default true
    snapshotDir:"<echoed into the report>"
  }
};
```

Target color construction (`to`): `lab:[L,a,b]` → LabColor (preferred for Pantone, from the
book); else `cmyk:[c,m,y,k]` in a CMYK doc; else `hex:"RRGGBB"`. For a Pantone target, also
pass `pantone:"PANTONE N C"` so the spot is named correctly.

```javascript
{
  mode:"package", action:"fix", root:"...", snapshotDir:"...",
  ai:[ { file, instancesChanged, applied:[{from,as,swap}], removedSwatches:[...], note } ],
  svg:[ { file, replaced, status } ],
  pdf:[ { file, pdf, mode:"cmyk"|"spot", status } ],
  jpg:[ { file, px, status } ],
  png:[ { file, px, status } ]
}
```

Notes: files with no match report `instancesChanged:0, note:"no changes"` and aren't
rewritten. `applied[].as` is the output representation used (`pantone` | `cmyk` | `rgb`).
The compound-path instance counter can under-report; a re-proof is the source of truth.

## PDF re-export detail

`buildPdfOptions` writes lean files matching the originals (PDF 1.4 / Acrobat 5,
`preserveEditability=false`, no color profile). CMYK target → Convert-to-Destination
(Preserve Numbers) into DeviceCMYK, flattening spots to process while keeping the numbers.
Pantone target → no color conversion, so the spot separation is preserved and re-named.

## Single-folder (v1) modes

`mode:"proof"` / `mode:"fix"` operate on one folder with exact-signature mappings
(`{file, fromSignature, toId}`) and palette `id`s. Signatures: `RGB:RRGGBB`,
`CMYK:c,m,y,k`, `SPOT:<normalized name>@<tint>`, `GRAY:0-100`. These still exist; the
package modes are the v2 superset for multi-format deliveries.

## Document color mode

Each `.ai` reports its document color space. The engine doesn't auto-fail on mode, but an
RGB document bound for print (or CMYK bound for web) is worth surfacing to the user.
