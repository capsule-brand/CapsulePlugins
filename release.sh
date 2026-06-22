#!/usr/bin/env bash
# release.sh — bump, validate, tag, and publish a Capsule plugin in one command.
#
# Usage:
#   ./release.sh <plugin-name> [patch|minor|major|X.Y.Z] [--update]
#
# Examples:
#   ./release.sh ebillity-timesheet                 # patch bump (0.1.0 -> 0.1.1)
#   ./release.sh ebillity-timesheet minor           # minor bump (0.1.0 -> 0.2.0)
#   ./release.sh ebillity-timesheet 1.0.0           # set an explicit version
#   ./release.sh ebillity-timesheet patch --update  # also update the local install
#
# Bumps the version in BOTH the plugin's .claude-plugin/plugin.json AND the matching
# entry in .claude-plugin/marketplace.json (kept equal), validates, commits, pushes
# main, then creates and pushes the {name}--v{version} release tag. With --update it
# also refreshes and updates the locally installed copy (restart Claude to apply).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

PLUGIN="${1:-}"
BUMP="patch"
DO_UPDATE=0
shift || true
for a in "$@"; do
  if [[ "$a" == "--update" ]]; then DO_UPDATE=1; else BUMP="$a"; fi
done

list_plugins() { ls -1 plugins 2>/dev/null | sed 's/^/  - /'; }

if [[ -z "$PLUGIN" ]]; then
  echo "Usage: ./release.sh <plugin-name> [patch|minor|major|X.Y.Z] [--update]"
  echo "Available plugins:"; list_plugins
  exit 1
fi

PLUGIN_DIR="plugins/$PLUGIN"
PJSON="$PLUGIN_DIR/.claude-plugin/plugin.json"
MJSON=".claude-plugin/marketplace.json"

if [[ ! -f "$PJSON" ]]; then
  echo "✗ No plugin.json at $PJSON"; echo "Available plugins:"; list_plugins; exit 1
fi

CLAUDE="$(command -v claude 2>/dev/null || true)"
if [[ -z "$CLAUDE" ]]; then
  for c in "$HOME/.local/npm-global/bin/claude" "$HOME/.npm-global/bin/claude" /opt/homebrew/bin/claude; do
    if [[ -x "$c" ]]; then CLAUDE="$c"; break; fi
  done
fi

# Best-effort sync so two machines don't collide (skip quietly if offline).
git pull --rebase --autostash origin main || echo "⚠ pull skipped (offline or conflict) — continuing"

NEWVER="$(python3 - "$PJSON" "$MJSON" "$PLUGIN" "$BUMP" <<'PY'
import json, re, sys
pjson, mjson, plugin, bump = sys.argv[1:5]
pj = json.load(open(pjson))
cur = pj.get("version", "0.0.0")
if re.match(r"^\d+\.\d+\.\d+$", bump):
    new = bump
else:
    m = re.match(r"^(\d+)\.(\d+)\.(\d+)$", cur)
    if not m:
        sys.stderr.write("Current version %r isn't semver; pass an explicit X.Y.Z\n" % cur); sys.exit(2)
    M, mi, pa = map(int, m.groups())
    if bump == "major": M, mi, pa = M+1, 0, 0
    elif bump == "minor": mi, pa = mi+1, 0
    elif bump == "patch": pa = pa+1
    else: sys.stderr.write("Unknown bump %r (use patch|minor|major|X.Y.Z)\n" % bump); sys.exit(2)
    new = "%d.%d.%d" % (M, mi, pa)
pj["version"] = new
json.dump(pj, open(pjson, "w"), indent=2); open(pjson, "a").write("\n")
mp = json.load(open(mjson))
hit = [e for e in mp.get("plugins", []) if e.get("name") == plugin]
if not hit:
    sys.stderr.write("No marketplace entry named %r\n" % plugin); sys.exit(2)
for e in hit: e["version"] = new
json.dump(mp, open(mjson, "w"), indent=2); open(mjson, "a").write("\n")
print(new)
PY
)"

echo "→ $PLUGIN: v$NEWVER"

if [[ -n "$CLAUDE" ]]; then
  if "$CLAUDE" plugin validate "$PLUGIN_DIR" >/dev/null 2>&1; then
    echo "✔ manifest valid"
  else
    echo "✗ validation failed — run: $CLAUDE plugin validate $PLUGIN_DIR"; exit 1
  fi
fi

git add -A
git -c user.name="$(git config user.name 2>/dev/null || echo Capsule)" \
    -c user.email="$(git config user.email 2>/dev/null || echo dev@clearancelab.ai)" \
    commit -m "$PLUGIN v$NEWVER" >/dev/null
GIT_TERMINAL_PROMPT=0 git push origin main
echo "✔ pushed commit"

if [[ -n "$CLAUDE" ]]; then
  GIT_TERMINAL_PROMPT=0 "$CLAUDE" plugin tag "$PLUGIN_DIR" --push -m "$PLUGIN v%s"
else
  git tag "$PLUGIN--v$NEWVER" -m "$PLUGIN v$NEWVER"
  GIT_TERMINAL_PROMPT=0 git push origin "$PLUGIN--v$NEWVER"
  echo "✔ tagged $PLUGIN--v$NEWVER"
fi

if [[ "$DO_UPDATE" == "1" && -n "$CLAUDE" ]]; then
  "$CLAUDE" plugin marketplace update capsule-plugins >/dev/null 2>&1 || true
  "$CLAUDE" plugin update "$PLUGIN" || true
  echo "✔ local install updated (restart Claude to apply)"
fi

echo ""
echo "✅ Done — $PLUGIN is now v$NEWVER on GitHub (tag: $PLUGIN--v$NEWVER)."
if [[ "$DO_UPDATE" != "1" ]]; then
  echo "   Tip: re-run with --update (or 'claude plugin update $PLUGIN') to pull it locally."
fi
