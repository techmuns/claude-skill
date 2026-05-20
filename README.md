# claude-skill

Personal Claude skills, synced. One git repo is the source of truth; every Claude Code on the web session pulls it in via a `SessionStart` hook and symlinks `skills/`, `commands/`, `agents/`, and `hooks/` into `~/.claude/`.

## Cloud Claude Code setup (primary)

1. In [Claude Code on the web](https://claude.ai/code), create a Cloud environment pointing at `github.com/techmuns/claude-skill`.
2. In that environment's `.env`, set:

   ```
   GH_TOKEN=<fine-grained PAT with `contents: read` on this repo>
   ```

3. Start any session. The `SessionStart` hook runs `scripts/setup-agent-base.sh`, which:
   - Clones the repo to `~/agent-base` (or pulls if already cloned).
   - Symlinks `~/agent-base/.claude/{skills,commands,agents,hooks}` into `~/.claude/`.
   - Symlinks `~/agent-base/CLAUDE.md` to `~/.claude/CLAUDE.md` if present.
4. Confirm it worked: look for `[skills-sync]` lines in the session log, or ask Claude to run `ls -la ~/.claude/skills/`.

The hook is gated on `$CLAUDE_CODE_REMOTE == "true"`, so it no-ops in local sessions and won't double-clone.

## Local install (secondary, minimal)

One-time per machine — clones the repo into `~/claude-skill` and symlinks skills into `~/.claude/skills`:

```sh
curl -fsSL https://raw.githubusercontent.com/techmuns/claude-skill/main/scripts/install-local.sh | bash
```

No auto-pull daemon yet (cloud-first phase). To refresh:

```sh
git -C ~/claude-skill pull
```

Re-running `install-local.sh` is safe and also pulls.

## Adding a new skill

```sh
mkdir -p .claude/skills/my-new-skill
cat > .claude/skills/my-new-skill/SKILL.md <<'EOF'
---
name: my-new-skill
description: One-line description of when Claude should use this.
---

# my-new-skill

Instructions for Claude...
EOF
git add .claude/skills/my-new-skill
git commit -m "feat(skills): add my-new-skill"
git push
```

- Local sessions pick up new skills on the next file-watch tick.
- Cloud sessions pick them up at the next session start.

After committing a new skill, regenerate the public index:

```sh
node scripts/build-index.js
git add public/index.html
git commit -m "chore: rebuild skills index"
```

(Cloudflare Pages also regenerates this on push — see below.)

## Cloudflare Pages (one-time)

The `public/` directory is a static index of your skills. Connect this repo in the Cloudflare dashboard once with:

- **Build command:** `node scripts/build-index.js`
- **Output directory:** `public`
- **Root directory:** `/`
- **Production branch:** `main`

No Node dependencies required — the build script uses only stdlib.

## Security notes

- `GH_TOKEN` is passed to git via `-c http.extraHeader=...` (process-scoped). It never lands in `~/agent-base/.git/config` and never appears in the clone URL.
- Use a fine-grained PAT scoped to this repo only.
- `.gitignore` excludes `.env`, `.env.local`, `*.bak.*`, and `node_modules/`.

## Repo layout

```
.
├── .claude/
│   ├── settings.json                          # SessionStart hook
│   └── skills/
│       └── git-commit-summarizer/SKILL.md     # example skill
├── scripts/
│   ├── setup-agent-base.sh                    # cloud sessions
│   ├── install-local.sh                       # local one-time
│   └── build-index.js                         # builds public/index.html
├── public/
│   └── index.html                             # generated registry page
├── .gitignore
├── LICENSE
└── README.md
```
