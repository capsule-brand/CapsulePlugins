---
name: ship-plugin
description: >-
  Ship a Capsule skill as a Claude Code plugin in one step — scaffold it, version it,
  publish it to the capsule-plugins marketplace, and install it on both Macs. Use when the
  user says "make this a plugin", "ship this skill", "publish this as a plugin", "release the
  <name> plugin", "add <name> to the marketplace", or wants a SKILL.md turned into an installed,
  synced plugin. Runs from ~/CapsulePlugins using add-plugin.sh, release.sh, and the claude
  plugin CLI (needs shell access + SSH to the Mac Studio).
---

# Ship Plugin

Turn a Capsule skill into a published, installed plugin on **both machines** so the user never has to remember commands. You (Claude) run the whole pipeline from `~/CapsulePlugins`.

## Get these first
- **name** — plugin slug, kebab-case (lowercase letters, digits, hyphens). Ask if missing.
- **source** — the `SKILL.md` file or skill folder to package. Infer from what the user pointed at (a path, an attached file, or an existing `~/.claude/skills/<name>/`). Ask if unclear.
- **new or update?** Check `~/CapsulePlugins/plugins/<name>`: absent = new, present = update.

## Environment
- Run this where the `~/CapsulePlugins` clone + `git`/`gh` auth + SSH to `mac-studio` exist — i.e. the MacBook (or a Cowork session with Desktop Commander).
- On **Forge** the claude binary is `~/.local/bin/claude` — NOT on the non-interactive SSH `PATH`, so call it by full path over SSH.

## Pipeline (all Bash, from `~/CapsulePlugins`)
1. **Scaffold (new only):** `./add-plugin.sh <name> <source>` — builds `plugins/<name>/` and registers it in `marketplace.json`. For an **update**, instead copy the new SKILL.md over `plugins/<name>/skills/<name>/SKILL.md`.
2. **Publish:**
   - New → `git add -A && git commit -m "<name> v0.1.0 — add plugin" && git push origin main && claude plugin tag plugins/<name> && git push origin --tags`
   - Update → `./release.sh <name> patch --update` (bumps, validates, commits, pushes, tags).
3. **Install / update on BOTH machines:**
   - This machine → `claude plugin marketplace update capsule-plugins && claude plugin install <name>@capsule-plugins` (new) or `claude plugin update <name>@capsule-plugins` (update).
   - Forge → `ssh mac-studio '~/.local/bin/claude plugin marketplace update capsule-plugins && ~/.local/bin/claude plugin install <name>@capsule-plugins'` (or `update`).
4. **Verify + report:** run `claude plugin list | grep <name>` on each machine. Tell the user the version shipped, that it's live on both Macs, and to restart their Claude Code session to load it.

## Guardrails
- Name must be kebab-case (`add-plugin.sh` warns otherwise) — fix before scaffolding.
- `add-plugin.sh` refuses to clobber an existing plugin. If it exists, treat as an update — never delete.
- If any step fails (validate, git push, SSH, install), **STOP and report** the step + the error; don't continue blindly.
- The marketplace repo is public — methodology only, no client data or secrets.
