#!/bin/bash
# Runs as a Claude Code SessionStart hook in remote/cloud sessions only.
# Clones (or pulls) the public skills repo and symlinks
# .claude/{skills,commands,agents,hooks} from the cloned tree into $HOME/.claude/
# so every cloud session inherits them.
set -euo pipefail

REPO_URL="https://github.com/techmuns/claude-skill.git"
BASE="$HOME/agent-base"

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "[skills-sync] local session detected, skipping cloud setup"
  exit 0
fi

if [ -d "$BASE/.git" ]; then
  echo "[skills-sync] updating $BASE"
  git -C "$BASE" pull --quiet --ff-only
else
  echo "[skills-sync] cloning $REPO_URL into $BASE"
  git clone --quiet "$REPO_URL" "$BASE"
fi

mkdir -p "$HOME/.claude"

link_one() {
  local name="$1"
  local src="$BASE/.claude/$name"
  local dst="$HOME/.claude/$name"

  if [ ! -e "$src" ]; then
    return 0
  fi

  if [ -e "$dst" ] && [ ! -L "$dst" ]; then
    local backup="${dst}.bak.$(date +%s)"
    echo "[skills-sync] backing up existing $dst -> $backup"
    mv "$dst" "$backup"
  fi

  ln -sfn "$src" "$dst"
  echo "[skills-sync] linked $name -> $src"
}

for name in skills commands agents hooks; do
  link_one "$name"
done

# Optional top-level CLAUDE.md
if [ -f "$BASE/CLAUDE.md" ]; then
  dst="$HOME/.claude/CLAUDE.md"
  if [ -e "$dst" ] && [ ! -L "$dst" ]; then
    backup="${dst}.bak.$(date +%s)"
    echo "[skills-sync] backing up existing $dst -> $backup"
    mv "$dst" "$backup"
  fi
  ln -sfn "$BASE/CLAUDE.md" "$dst"
  echo "[skills-sync] linked CLAUDE.md"
fi

echo "[skills-sync] done. agent-base at $BASE"
