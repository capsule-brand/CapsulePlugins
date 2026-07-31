---
name: reskin
description: >
  Restyle an existing site/app to match a reference's look AND feel — including
  animation. Triggers on "reskin", "make this look like <site/screenshot>",
  "match the feel of this reference", "port the animation from", "restyle this
  page to match", "give this the same vibe as". Captures look (DESIGN.md), motion
  (MOTION.md), fonts, and assets from a live URL or screenshot, then applies them
  to the current project's presentation layer without touching app logic.
---

# Reskin — match a reference's look *and* feel

Restyle the current project to match a reference site, template, or screenshot.
The goal is parity on **look** (color, type, spacing, components) *and* **feel**
(motion, easing, scroll behavior, micro-interactions) — not a static look-alike.

A static `DESIGN.md` alone is NOT enough: it has no concept of animation. This
skill adds a `MOTION.md` motion spec and detects the actual animation library so
the result feels right in motion, not just in a screenshot.

## Inputs (accept any)
- A **live URL** (preferred — only a live page reveals motion).
- A **screenshot / image** (look only; warn that motion can't be captured from a still).
- A bundled **`~/.claude/design-systems/<brand>/DESIGN.md`** as the look source.
- **Multiple references** ("layout from A, color from B, motion from C") — keep them straight.

## Hard guardrails (never skip)
1. **Never break the app.** Work on a new git branch (or worktree). Touch only the
   presentation layer — styling, components, animation. Never modify data access,
   auth, routes, env, or business logic (e.g. Supabase calls stay untouched).
2. **IP / brand safety.** Capturing a reference's *language* (tokens, motion style)
   is fine. Pixel-cloning a real brand's site wholesale for a client deliverable is
   not — flag it and ask before reproducing a recognizable site 1:1.
3. **Respect `prefers-reduced-motion`.** Every animation ported must have a reduced
   or disabled state behind the media query.
4. **Keep it accessible.** Don't drop text contrast below WCAG AA to match a look;
   flag the conflict instead.
5. **Font licensing.** If the reference uses a commercial/licensed font, note it and
   suggest a license-clean equivalent rather than silently hotlinking it.

## Pipeline

### 0. Pre-flight
- Detect the project stack (React/Vue/Svelte, Vite/Next, Tailwind/CSS-modules,
  shadcn, etc.) by reading `package.json` + config. This decides which motion
  library to use later.
- Confirm **scope**: single component, one page, or whole app.
- Create a git branch: `reskin/<reference-name>-<date>`.

### 1. Capture LOOK → `./DESIGN.md`
Extract and write in the same format as `~/.claude/design-systems/*/DESIGN.md`:
color tokens, type scale + font families/weights, spacing rhythm, border radius,
shadow/elevation style, button + card + input treatments, layout grid, and
**responsive breakpoints** (how it reflows on mobile). For a URL, inspect computed
styles via Chrome MCP; for an image, infer and state assumptions.

### 2. Capture MOTION → `./MOTION.md`  *(the part DESIGN.md can't do)*
Only possible from a live URL. Via Chrome MCP, inspect the running page:
- **Detect the animation stack** — look for `gsap` (+ ScrollTrigger), `framer-motion`,
  `lenis` (smooth scroll), `lottie`, `three`, or plain CSS transitions/keyframes
  (check window globals, network requests, and class/style signatures).
- Record **easing curves, durations, delays, stagger**, and what **triggers** each
  move (load / hover / in-view / scroll-progress).
- Note **page-transition** style and whether scroll is smoothed.
- Capture a short sequence of scroll-state screenshots to infer reveal/parallax timing.
- Write all of it to `MOTION.md`, plus the `prefers-reduced-motion` fallback plan.

### 3. Capture ASSETS
Fonts (exact family + weights + source + license note), icon set/style, logos,
gradients, noise/texture overlays. Download or reference; flag licensing.

### 4. Plan
Map reference sections → app components. Classify each effect as **clean one-shot**
vs **needs manual pass** (heavy Three.js, bespoke GSAP timelines, canvas/WebGL).
Surface this list *before* implementing so the user knows what reskins cleanly.

### 5. Implement (presentation layer only)
- Apply `DESIGN.md` component by component.
- Install the **matching** motion library for the detected stack (e.g. Framer Motion
  for React component motion, GSAP for scroll timelines, Lenis for smooth scroll) and
  implement per `MOTION.md`. Reuse the project's existing animation lib if it has one.
- Wire `prefers-reduced-motion` for everything.

### 6. Verify (close the loop)
- **Look:** run the dev server, screenshot output, diff against the reference,
  iterate until type/spacing/color/hierarchy line up (~15–30s/pass).
- **Motion:** capture scroll/hover states and sanity-check timing + reduced-motion.
- **Integrity:** confirm the app still builds and runs; no logic/route/data changes.

### 7. Report
What matched, what needs a manual pass and why, any performance/bundle cost from the
motion stack, font-licensing notes, and the branch name to review/merge.

## Reference files
- `references/DESIGN.template.md` — look spec skeleton.
- `references/MOTION.template.md` — motion spec skeleton.
- `references/library-cheatsheet.md` — which animation lib for which stack/effect.
