# ColorProof — setup & deployment (per Mac)

One-time per machine. After this it's pure chat — the user just tells Claude to proof or
fix a folder/package.

## 1. Adobe Illustrator

Must be installed and **open** while ColorProof works — there is no headless mode; the
engine drives the running app. Any recent Illustrator (CC) is fine.

## 2. Deploy the engine to `~/.colorproof/`

The skill's `scripts/` folder is the canonical source. Deploy/refresh the working copy:

```bash
mkdir -p ~/.colorproof
cp scripts/colorproof.jsx scripts/run.sh scripts/report.js scripts/snapshot.sh scripts/acb_lab.py ~/.colorproof/
chmod +x ~/.colorproof/run.sh ~/.colorproof/snapshot.sh
```

The engine reads `~/.colorproof/job.jsxinc` and writes `~/.colorproof/result.json`;
`run.sh` runs the engine then `report.js` then opens `report.html`.

## 3. The runner & the 120-second Apple-event cap

`run.sh` wraps the `do javascript` call in `with timeout of 1800 seconds`. This matters:
without it, macOS aborts a `do javascript` Apple event at ~120s, which silently kills a
large package run mid-way (Illustrator finishes free, but no `result.json` is written).
For big packages, also launch the runner **backgrounded** and poll for `result.json`:

```bash
rm -f ~/.colorproof/result.json
nohup zsh ~/.colorproof/run.sh >/tmp/cp.log 2>&1 & disown
```

If a run ever produces no `result.json`, probe Illustrator with a short
`count documents` Apple event: if it answers instantly, the batch was timeout-aborted (use
the backgrounded pattern); if it hangs, a modal dialog is blocking (bring Illustrator
forward and dismiss it).

## 4. Backup home

Whole-folder snapshots live **outside** the deliverables at
`~/Desktop/ColorProof Backups/`. `snapshot.sh "<folder>" ["<label>"]` rsyncs a folder there
(excluding any backup subfolders) before edits. The engine edits originals in place; revert
by copying a snapshot back.

## 5. Pantone library (for spot targets)

A real `PANTONE+ Solid Coated.acb` ships inside the LogoPackageExpress CEP extension,
typically at:

```
/Library/Application Support/Adobe/CEP/extensions/.../LogoPackageExpress/resources/Pantone Swatches/
~/Library/Application Support/Adobe/CEP/extensions/.../LogoPackageExpress/resources/Pantone Swatches/
```

`scripts/acb_lab.py <number>` reads a Pantone's Lab from it. The bundled book is an older
~1,365-color set; very new 2xxx/3xxx numbers may be absent (fallbacks in SKILL.md).

## 6. Cowork folder access & automation

Point Cowork at the package folder (or its parent) so it can read files and write
snapshots. The first run, macOS prompts to allow controlling "Adobe Illustrator" — click
**OK**. If denied earlier, re-enable under System Settings ▸ Privacy & Security ▸ Automation.

## 7. Smoke test

Ask Claude: *"Proof this package against Orange = CMYK 0/62/100/0."* Point it at a small
package. A clean proof report (counts + pass/fail) means setup is good.

## Troubleshooting

- **No `result.json`** — timeout-aborted batch (use backgrounded runner) or a modal dialog
  in Illustrator (dismiss it). See §3.
- **A Pantone target comes out as a placeholder color** — pass `to.lab` from `acb_lab.py`;
  if the number isn't in the book, harvest it from an `.ai` that uses it or supply CMYK/hex.
- **A spot readback shows CMYK in a CMYK doc** — expected; Illustrator stores the alternate
  in the doc space. The separation plate name is what's authoritative.
- **A raster didn't re-render** — its basename must match the source `.ai`/`.svg` and carry
  a `…<N>px…` size token in the filename.
