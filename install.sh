#!/bin/bash
# install.sh — Install competitive-audit@capsule-plugins on Powerbook + Mac Studio
# Designed by Capsule. Run once from the Powerbook; it handles both machines.
#
# Usage:
#   bash /Users/brianadducci/Library/Application\ Support/Claude/local-agent-mode-sessions/b9d89b93-8fbb-4571-80e9-88a4110a27be/a592edce-2d03-49b3-9b3d-67c80a0aeefa/local_b26cb59c-e429-4abd-b9a3-55db2fd4c1a4/outputs/install.sh
#
# What it does:
#   1. Mirrors the plugin source (marketplace + unpacked plugin dir) into ~/CapsulePlugins/
#   2. Removes any prior broken marketplace registration
#   3. Adds the capsule-plugins marketplace and installs competitive-audit
#   4. If SSH to Mac Studio works (Tailscale auto-login), repeats steps 1-3 on Mac Studio
#   5. Prints the final claude plugin list output from both machines
#
# Idempotent — safe to re-run.

set -u

# --- color helpers ---
GREEN=$'\033[1;32m'
RED=$'\033[1;31m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[1;34m'
DIM=$'\033[2m'
NC=$'\033[0m'

say()  { printf "%s%s%s\n" "$BLUE" "$*" "$NC"; }
ok()   { printf "%s✓%s %s\n" "$GREEN" "$NC" "$*"; }
warn() { printf "%s!%s %s\n" "$YELLOW" "$NC" "$*"; }
fail() { printf "%s✘%s %s\n" "$RED" "$NC" "$*"; }
step() { printf "\n%s── %s ──%s\n" "$BLUE" "$*" "$NC"; }

# --- config ---
COWORK_OUTPUTS="/Users/brianadducci/Library/Application Support/Claude/local-agent-mode-sessions/b9d89b93-8fbb-4571-80e9-88a4110a27be/a592edce-2d03-49b3-9b3d-67c80a0aeefa/local_b26cb59c-e429-4abd-b9a3-55db2fd4c1a4/outputs"
CAPSULE_DIR="$HOME/CapsulePlugins"
MARKETPLACE_NAME="capsule-plugins"
PLUGIN_NAME="competitive-audit"

# Optional second-Mac sync target. Public release: not committed.
# To enable Mac Studio (or any second machine) sync, create:
#   ~/.config/capsule-plugins/install.conf
# with one line:
#   MAC_STUDIO_HOST="username@hostname"
# The script will SSH there with key-based auth and mirror ~/CapsulePlugins + install.
USER_CONF="$HOME/.config/capsule-plugins/install.conf"
[ -f "$USER_CONF" ] && source "$USER_CONF"
MAC_STUDIO_HOST="${MAC_STUDIO_HOST:-}"

# --- find claude binary ---
find_claude() {
  for candidate in "$HOME/.local/bin/claude" "/opt/homebrew/bin/claude" "/usr/local/bin/claude" "$(which claude 2>/dev/null)"; do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

CLAUDE_BIN=$(find_claude)
if [ -z "$CLAUDE_BIN" ]; then
  fail "claude CLI not found in any standard location. Install with: /opt/homebrew/bin/npm install -g @anthropic-ai/claude-code"
  exit 1
fi
ok "claude binary: $CLAUDE_BIN"

# --- step 0: ensure claude code is up to date ---
step "Step 0: ensure Claude Code is up to date"

NPM_BIN=$(command -v npm || echo /opt/homebrew/bin/npm)
if [ ! -x "$NPM_BIN" ]; then
  warn "npm not found — skipping Claude Code upgrade. If install fails with 'source type not supported', upgrade manually: npm i -g @anthropic-ai/claude-code"
else
  CURRENT_VERSION=$("$CLAUDE_BIN" --version 2>/dev/null | head -1 || echo "unknown")
  say "Current Claude Code: $CURRENT_VERSION"
  say "Upgrading Claude Code to latest (this enables modern marketplace source types)..."
  if "$NPM_BIN" install -g @anthropic-ai/claude-code >/dev/null 2>&1; then
    NEW_VERSION=$("$CLAUDE_BIN" --version 2>/dev/null | head -1 || echo "unknown")
    ok "Claude Code: $CURRENT_VERSION → $NEW_VERSION"
  else
    warn "Claude Code upgrade failed (may need sudo). Continuing with current version."
  fi
fi

# --- step 1: set up ~/CapsulePlugins as a Git-repo marketplace ---
step "Step 1: set up $CAPSULE_DIR as a Git-backed marketplace"

# Clean slate — remove any prior structure from earlier failed attempts
rm -rf "$CAPSULE_DIR"
mkdir -p "$CAPSULE_DIR/.claude-plugin" "$CAPSULE_DIR/plugins"

if [ ! -f "$COWORK_OUTPUTS/capsule-marketplace.json" ]; then
  fail "Source marketplace.json not found at: $COWORK_OUTPUTS/capsule-marketplace.json"
  exit 1
fi
if [ ! -d "$COWORK_OUTPUTS/competitive-audit" ]; then
  fail "Source plugin dir not found at: $COWORK_OUTPUTS/competitive-audit"
  exit 1
fi

# Marketplace manifest goes to .claude-plugin/ (Anthropic convention)
cp "$COWORK_OUTPUTS/capsule-marketplace.json" "$CAPSULE_DIR/.claude-plugin/marketplace.json"
ok "Wrote .claude-plugin/marketplace.json"

# Plugin lives under plugins/ — relative path ./plugins/competitive-audit resolves from repo root
cp -R "$COWORK_OUTPUTS/competitive-audit" "$CAPSULE_DIR/plugins/competitive-audit"
ok "Copied plugins/competitive-audit/"

# Initialize as a Git repo so Claude Code treats it as a Git source (enables relative-path resolution)
cd "$CAPSULE_DIR" || exit 1
git init -q -b main 2>/dev/null || git init -q
git add -A 2>/dev/null
GIT_AUTHOR_NAME="Capsule" GIT_AUTHOR_EMAIL="plugins@capsule.local" \
GIT_COMMITTER_NAME="Capsule" GIT_COMMITTER_EMAIL="plugins@capsule.local" \
  git commit -q -m "Initial Capsule plugins marketplace" 2>/dev/null || true
ok "Initialized Git repo at $CAPSULE_DIR"

# --- step 2: register marketplace, install plugin (Powerbook) ---
step "Step 2: register marketplace and install plugin on this Mac"

# Remove any prior registration of this marketplace
if "$CLAUDE_BIN" plugin marketplace list 2>/dev/null | grep -q "$MARKETPLACE_NAME"; then
  "$CLAUDE_BIN" plugin marketplace remove "$MARKETPLACE_NAME" >/dev/null 2>&1 || true
  ok "Removed prior $MARKETPLACE_NAME marketplace registration"
fi

# Uninstall any prior install (in case of broken state)
if "$CLAUDE_BIN" plugin list 2>/dev/null | grep -q "$PLUGIN_NAME"; then
  "$CLAUDE_BIN" plugin uninstall "$PLUGIN_NAME" >/dev/null 2>&1 || true
  ok "Removed prior $PLUGIN_NAME plugin install"
fi

# Add marketplace via the local Git repo path (NOT the marketplace.json file directly).
# This is what makes relative-path source fields like "./plugins/competitive-audit" resolve correctly.
if "$CLAUDE_BIN" plugin marketplace add "$CAPSULE_DIR"; then
  ok "Added marketplace: $MARKETPLACE_NAME (via local Git repo)"
else
  fail "Marketplace add failed."
  exit 1
fi

# Install plugin
if "$CLAUDE_BIN" plugin install "${PLUGIN_NAME}@${MARKETPLACE_NAME}"; then
  ok "Installed plugin: $PLUGIN_NAME"
else
  fail "Plugin install failed. Run: $CLAUDE_BIN plugin list — for details."
  exit 1
fi

step "Powerbook install complete. Current plugin list:"
"$CLAUDE_BIN" plugin list
echo

# --- step 3: mirror to second Mac over SSH (optional) ---
if [ -z "$MAC_STUDIO_HOST" ]; then
  step "Step 3: second-Mac sync skipped"
  warn "MAC_STUDIO_HOST not configured — only installing on this machine."
  warn "To enable second-Mac sync, create $USER_CONF with:"
  warn '   MAC_STUDIO_HOST="username@hostname"'
  exit 0
fi

step "Step 3: mirror to second Mac over SSH ($MAC_STUDIO_HOST)"

if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$MAC_STUDIO_HOST" 'echo ok' >/dev/null 2>&1; then
  warn "SSH to $MAC_STUDIO_HOST failed (host offline, or key auth not configured)."
  warn "Skipping second-Mac install. Run this script manually on the second Mac later, or fix SSH first."
  exit 0
fi
ok "SSH to second Mac works"

# Push CapsulePlugins/ via rsync over ssh (preserves perms, deletes stale)
if command -v rsync >/dev/null; then
  rsync -azq --delete "$CAPSULE_DIR/" "$MAC_STUDIO_HOST:CapsulePlugins/"
  ok "Mirrored $CAPSULE_DIR/ to Mac Studio:~/CapsulePlugins/"
else
  warn "rsync not found; falling back to scp"
  ssh "$MAC_STUDIO_HOST" "rm -rf ~/CapsulePlugins && mkdir -p ~/CapsulePlugins"
  scp -rq "$CAPSULE_DIR/." "$MAC_STUDIO_HOST:CapsulePlugins/"
  ok "Mirrored via scp"
fi

# Run install on Mac Studio (with claude code upgrade first)
say "Running install on Mac Studio..."
ssh -t "$MAC_STUDIO_HOST" "bash -lc '
  set -u
  CLAUDE_BIN=\$(command -v claude || echo ~/.local/bin/claude)
  if [ ! -x \"\$CLAUDE_BIN\" ]; then echo \"claude CLI not found on Mac Studio\"; exit 1; fi
  NPM_BIN=\$(command -v npm || echo /opt/homebrew/bin/npm)
  if [ -x \"\$NPM_BIN\" ]; then
    echo \"Upgrading Claude Code on Mac Studio...\"
    \$NPM_BIN install -g @anthropic-ai/claude-code >/dev/null 2>&1 || echo \"  (upgrade skipped or failed)\"
    echo \"  Mac Studio claude version: \$(\$CLAUDE_BIN --version 2>/dev/null | head -1)\"
  fi
  cd ~/CapsulePlugins || exit 1
  \$CLAUDE_BIN plugin marketplace list 2>/dev/null | grep -q '$MARKETPLACE_NAME' && \$CLAUDE_BIN plugin marketplace remove $MARKETPLACE_NAME >/dev/null 2>&1
  \$CLAUDE_BIN plugin list 2>/dev/null | grep -q '$PLUGIN_NAME' && \$CLAUDE_BIN plugin uninstall $PLUGIN_NAME >/dev/null 2>&1
  \$CLAUDE_BIN plugin marketplace add ~/CapsulePlugins
  \$CLAUDE_BIN plugin install ${PLUGIN_NAME}@${MARKETPLACE_NAME}
  echo
  echo \"── Mac Studio plugin list ──\"
  \$CLAUDE_BIN plugin list
'"

if [ $? -eq 0 ]; then
  ok "Mac Studio install complete"
else
  fail "Mac Studio install hit an error — check output above."
fi

step "All done. competitive-audit@capsule-plugins should be enabled on both machines."
echo "${DIM}Tip: open a new Claude Code session ('claude') and the plugin's commands will be available.${NC}"
