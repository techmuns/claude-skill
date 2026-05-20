#!/bin/bash
# One-time local setup: clone the skills repo under $HOME and symlink
# .claude/skills into $HOME/.claude/skills. Re-running is safe and also pulls.
#
# TODO(auto-pull): in a future iteration, add OS detection here and install
# a periodic pull job:
#   - macOS:  launchd plist in ~/Library/LaunchAgents/
#   - Linux:  systemd --user timer (if available), else crontab -e entry
# For now this is a one-shot — re-run the script or `git pull` manually.
set -euo pipefail

REPO_URL="https://github.com/techmuns/claude-skill.git"
REPO="$HOME/claude-skill"

if [ -d "$REPO/.git" ]; then
  echo "[install-local] updating $REPO"
  git -C "$REPO" pull --quiet --ff-only
else
  echo "[install-local] cloning $REPO_URL into $REPO"
  git clone --quiet "$REPO_URL" "$REPO"
fi

mkdir -p "$HOME/.claude"

src="$REPO/.claude/skills"
dst="$HOME/.claude/skills"

if [ ! -d "$src" ]; then
  echo "[install-local] ERROR: $src not found in the cloned repo" >&2
  exit 1
fi

if [ -e "$dst" ] && [ ! -L "$dst" ]; then
  backup="${dst}.bak.$(date +%s)"
  echo "[install-local] backing up existing $dst -> $backup"
  mv "$dst" "$backup"
fi

ln -sfn "$src" "$dst"
echo "[install-local] linked $dst -> $src"

cat <<EOF

[install-local] done.
Auto-pull daemon not installed (cloud-first phase).
To refresh skills:  git -C "$REPO" pull   (or re-run this script)
EOF
