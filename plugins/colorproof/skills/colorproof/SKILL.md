---
name: colorproof
description: >-
  Proof and correct brand colors across Adobe Illustrator artwork and its exported
  formats. Use whenever the user wants to check, audit, verify, proof, or "QC" colors
  against known brand values (Pantone/PMS names, CMYK builds, or HEX), and optionally
  fix what's off — at the scale of a single folder OR an entire multi-format logo
  package (.ai, vector .pdf, .svg, plus re-rendered .jpg/.png). Trigger on things like
  "check these files against our brand colors", "proof this logo package", "make the
  orange Pantone 3564 C everywhere", "swap the purple to 7683 C across the package",
  "do the colors in this folder match these numbers", or when the user pastes brand
  values / a spec-sheet image and points at a folder. Also handles Pantone-to-Pantone
  spot remaps, pulling the real Lab formula from the Pantone book on the machine. Use
  it for any brand-color checking or correction of Illustrator artwork, even if the
  user never says "ColorProof".
---

# ColorProof

> **v2.1.0** — Multi-format brand color preflight & corrector for Adobe Illustrator artwork.

ColorProof is a brand-color preflight and corrector for Adobe Illustrator artwork. The
user gives a brand palette (exact color numbers) and a folder; you proof every color in
every file against those numbers, show exactly what's off, and — once approved — snap the
wrong colors to the exact values, with a backup taken first.

It works at two scales:
- **A single folder** of `.ai` (also `.eps` / vector `.pdf`) — the original v1 path.
- **A whole logo package** — recurse a delivery tree and handle every format together:
  `.ai`, vector `.pdf`, `.svg`, and the raster exports `.jpg` / `.png`. A correction made
  to the vector master is propagated to the dependent formats (PDF re-exported, JPG
  re-rendered from the `.ai`, PNG re-rendered from the corrected SVG).

Think of it as a spellchecker for brand color. The user always hits "go," and nothing is
changed without a backup first.

## Safety mental model

The brand-critical work is done by a vetted Illustrator engine (`scripts/colorproof.jsx`),
not by improvising color math in chat. Your job is orchestration: understand the request,
assemble the palette/swaps, run the engine, read its JSON result, explain it plainly, and
(on approval) run the fix. Never reimplement color comparison yourself — the engine reads
colors the way Illustrator actually stores them, the only trustworthy source. Matching is
**value-exact**; ΔE is advisory only. The fix changes **only** colors you explicitly swap —
never layers, positions, appearance, or text.

## Where it lives (deployed on the Mac)

The engine and helpers are installed at `~/.colorproof/`:

- `colorproof.jsx` — the ES3-safe ExtendScript engine. Reads its job from
  `~/.colorproof/job.jsxinc` (which defines the global `COLORPROOF_JOB`) and writes
  `~/.colorproof/result.json`.
- `run.sh` — the runner. Executes the engine inside Illustrator **wrapped in
  `with timeout of 1800 seconds`** (macOS otherwise caps a `do javascript` Apple event at
  ~120s and aborts long batches mid-run), then runs `report.js` and `open`s the report.
- `report.js` — Node generator that turns `result.json` into a dark-themed, self-contained
  `report.html` and is auto-run at the end of every job.
- `snapshot.sh` — `snapshot.sh "<folder>" ["<label>"]` rsyncs a whole folder to the backup
  home before any edit.
- `acb_lab.py` — pulls a Pantone's authoritative **Lab** formula from the PANTONE+ book on
  the machine (see "Pantone targets" below).

The skill's `scripts/` folder carries the canonical copies; if `~/.colorproof/` is missing
or stale, redeploy from there (see `references/install.md`).

## Running a job (the pattern)

**Quick decision tree — pick your path:**

```
Is this the first time on this machine?  →  Walk through references/install.md first.
↓ No
Do you want to CHECK colors only (no edits)?  →  Proofing section below.
↓ No — you want to FIX colors
Is this a single folder of .ai files?  →  Fix with mode:"fix" (single-folder path).
Is this a full logo package (.ai + .pdf + .svg + .jpg/.png)?  →  Fix with mode:"package" action:"fix".
```

1. Write the job to `~/.colorproof/job.jsxinc` as `var COLORPROOF_JOB = {…};` (evaluable JS,
   so no JSON parser is needed on the Mac).
2. Illustrator must be **open** — there is no headless mode.
3. Run it. For small jobs, `zsh ~/.colorproof/run.sh` is fine. For a **whole package**
   (dozens of files), launch it backgrounded so neither the Apple-event cap nor a client
   timeout interrupts it, then poll for the result:

   ```bash
   rm -f ~/.colorproof/result.json
   nohup zsh ~/.colorproof/run.sh >/tmp/cp.log 2>&1 & disown
   # then poll ~/.colorproof/result.json until it appears (each poll call kept short)
   ```

4. The runner auto-generates and opens `report.html` at the end. Read `result.json` to
   summarize in chat.

The full job/result schema and every matching rule are in `references/color-logic.md` —
read it before your first run.

## Proofing (read-only)

Proof checks the artwork against an expected palette and changes nothing.

- **Single folder:** `mode:"proof"` over one folder.
- **Whole package:** `mode:"package", action:"proof"` — recurses the tree, counts every
  format (`.ai/.pdf/.svg/.jpg/.png`), inventories the distinct colors in the `.ai` files
  and the hexes in the `.svg` files, and — if you pass a `palette` — marks each color
  **pass / fail / neutral / needs-spec**.

Because the input palette can be given in only some color models, be explicit about
coverage: a **CMYK-only** palette rigorously verifies the CMYK `.ai` files, but real
**Pantone** spots and **SVG** web hexes come back as **"needs spec"** — the engine won't
guess across color spaces. To verify those too, supply the expected **Pantone name** and
**web hex** alongside the CMYK build.

Many of these packages store a *process* color as a **spot named like its build**
(`"C=0 M=62 Y=100 K=0"`). The engine reads the CMYK out of that name, so such a spot is
checked against a CMYK palette entry correctly. A genuine Pantone spot (e.g.
`PANTONE 3564 C`) has no CMYK in its name and is "needs spec" against a CMYK-only palette.

Report the result plainly first (counts + what passed / what's off / what needs a spec),
then point the user at the auto-opened `report.html`.

→ Full job/result schema and matching rules: `references/color-logic.md §Package proof`

## Fixing (writes, after a backup)

A fix is driven by **value-based swaps** — you describe the color to find and the color to
become, in whatever models apply. The engine matches each found color and lets the
**matched representation drive the output**: a spot matched by Pantone name → outputs that
spot; a (spot-named or process) CMYK build matched by C/M/Y/K → outputs process CMYK; an
RGB/SVG color matched by hex → outputs the new hex.

For a whole package, one fix run cascades across formats:

- **`.ai`** — swap the color on the art, optionally clean the now-unused source swatch,
  save.
- **`.pdf`** — re-export the sibling PDF from the corrected `.ai`, in the mode that follows
  the edit: **process CMYK** if the target is a CMYK build (spots flattened, numbers
  preserved, no profile — lean files), **spot-preserving** if the target is a Pantone (the
  separation plate is kept and re-named).
- **`.svg`** — direct, case-insensitive hex text-swap (these packages have no `.ai` master
  for the web files), then
- **`.png`** — re-rendered from the corrected SVG at each sibling's pixel size.
- **`.jpg`** — re-rendered from the corrected `.ai` at its target pixel size.

Raster siblings are matched by basename and their target pixels are parsed from the
filename (`…_1200px…`, `…_2160px@300ppi…`); the engine sets the export scale to hit that
size.

→ Full swap schema and output rules: `references/color-logic.md §Package fix`

### Backups — external whole-folder snapshot

Before any edit, snapshot the **whole folder** to the external backup home
`~/Desktop/ColorProof Backups/<label> - <timestamp>/` (via `snapshot.sh`). The engine then
**edits the originals in place**, so the deliverable stays clean — no `_ColorProof_Backups`
subfolders polluting the package. For a package-wide sweep, snapshot the common parent
**once**. Revert = copy the snapshot back over the originals. (This external-snapshot model
is the chosen default; it replaces v1's in-folder backups.)

### Swatch cleanup

`options.removeUnusedSwatches` defaults to **`"non-palette"`** — after a swap, the orphaned
source swatch (e.g. the old purple) is removed while brand/neutral swatches are kept. Use
`"all"` to drop every unused swatch, `"none"` to skip. Protected swatches ([None],
[Registration], default Black/White) are never deleted.

## Pantone targets — real Lab from the book

Adobe pulled the Pantone libraries out of Illustrator in 2022, but a genuine
`PANTONE+ Solid Coated.acb` ships inside the **LogoPackageExpress** CEP extension on this
machine. To build a Pantone target swatch with its true color (not a placeholder), pull the
Lab formula from that book:

```bash
python3 ~/.colorproof/acb_lab.py 7683
# -> Lab L*=44.71 a*=0 b*=-38, ~sRGB #426CA9, plus a JSON line for the swap's to.lab
```

Pass that as the swap target's `lab:[L,a,b]`; the engine creates the spot named
`PANTONE 7683 C` with that Lab. **Note:** when a spot is created in a CMYK document,
Illustrator stores the swatch's *alternate* (preview/convert) color in the document's space
(it converts the Lab to CMYK/RGB), so a readback shows CMYK — but the **separation plate
name is authoritative and correct**, which is what prints. That is the intended, correct
behavior for a spot.

The bundled book is an older ~1,365-color set, so the newest 2xxx/3xxx Pantone additions
may be absent. If `acb_lab.py` can't find a number, fall back to: harvesting the spot's Lab
from an `.ai` that already uses it, supplying CMYK/hex directly, or Pantone Connect.

## The report

`report.js` writes a self-contained `report.html` (dark themed, accurate swatch chips) and
the runner opens it automatically. A **proof** report shows the format counts, the expected
palette being checked, pass/fail/neutral/needs-spec tallies, and per-color status with file
+ instance counts. A **fix** report shows per-format change tables (instances changed,
swatches removed, PDFs/SVGs/JPGs/PNGs touched and their status) and the backup location.

## Operating principles

- **Exact, not approximate.** Pass means the value matches the supplied number exactly in
  the model it's stored in (spot by name, CMYK by build, RGB/SVG by hex). The only smoothing
  is rounding float dust to the integer grid. ΔE is advisory only — for ranking near-miss vs
  ambiguous — never for pass/fail.
- **Neutrals pass.** CMYK with C=M=Y=0 (any K), RGB with R=G=B, gray, and spots named
  Black/White/Paper/Registration pass without being in the palette.
- **Report, don't guess.** Anything that can't be verified in the models provided (real
  Pantones or web hex against a CMYK-only palette, placed rasters) is surfaced as
  "needs spec" / "review," never silently passed. A false green check is worse than a flag.
- **The matched representation drives the output.** A fix never converts color spaces
  uninvited: a CMYK match stays/*outputs* process CMYK, a Pantone match outputs a spot, a
  hex match outputs hex. PDF re-export mode follows the edit (process vs spot).
- **Surgical and reversible.** Whole-folder snapshot to the external backup home before any
  write; only colors you swap (and unused swatches) change; revert is a file copy. State
  these guarantees — for a designer, that reassurance is what unlocks letting it near files.
- **Copy-first for new ground.** When validating a new kind of swap (a new format, a
  Pantone remap), run it on a **copy** of one lockup first so the user can see every format
  update correctly before it touches the real package.

## Honest limitations

- Color only — it does not redesign, move, or reshape artwork.
- Vector color only — colors inside placed/embedded rasters are flagged, not proofed.
- Illustrator must be open; there is no headless mode.
- SVG is handled as a hex text-swap (no `.ai` master for web files in these packages); PNGs
  re-render from the corrected SVG, JPGs from the corrected `.ai`.
- The bundled Pantone book is an older set; very new Pantone numbers may need a fallback.
- Nothing changes in fix mode without an approved swap and a backup.

## First-run setup

If this is the user's first time, walk them through `references/install.md` — Illustrator
open, the engine deployed at `~/.colorproof/`, Cowork folder access, and Illustrator
automation permission. After that it's pure chat.
