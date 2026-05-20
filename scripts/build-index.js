#!/usr/bin/env node
// Scan .claude/skills/*/SKILL.md, parse minimal YAML frontmatter (name + description),
// and regenerate public/index.html. Node stdlib only — no npm install needed.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');
const OUT_FILE = path.join(REPO_ROOT, 'public', 'index.html');
const REPO_SLUG = 'techmuns/claude-skill';

function stripQuotes(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = text.slice(3, end).trim();
  const result = {};
  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();

    // Folded scalar: `description: >` — collect following indented lines.
    if (value === '>' || value === '>-' || value === '|' || value === '|-') {
      const collected = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
        collected.push(lines[i + 1].trim());
        i++;
      }
      value = collected.join(' ');
    } else {
      value = stripQuotes(value);
    }
    result[key] = value;
  }
  return result;
}

function htmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function collectSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const text = fs.readFileSync(skillFile, 'utf8');
    const fm = parseFrontmatter(text);
    if (!fm || !fm.name || !fm.description) {
      console.warn(`[build-index] skipping ${entry.name}: missing name or description`);
      continue;
    }
    skills.push({ name: fm.name, description: fm.description });
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

function render(skills) {
  const today = new Date().toISOString().slice(0, 10);
  const items = skills.length
    ? skills
        .map(
          (s) =>
            `      <li><strong>${htmlEscape(s.name)}</strong> &mdash; ${htmlEscape(s.description)}</li>`
        )
        .join('\n')
    : '      <li><em>No skills yet.</em></li>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>My Claude Skills</title>
  <style>
    :root { color-scheme: dark; }
    body {
      background: #0d1117;
      color: #c9d1d9;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      max-width: 760px;
      margin: 4rem auto;
      padding: 0 1.25rem;
      line-height: 1.55;
    }
    h1 { font-size: 1.5rem; margin: 0 0 1.5rem; }
    ul { list-style: none; padding: 0; }
    li { padding: 0.5rem 0; border-bottom: 1px solid #21262d; }
    li:last-child { border-bottom: none; }
    strong { color: #f0f6fc; }
    a { color: #58a6ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    footer { margin-top: 2rem; color: #8b949e; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>My Claude Skills</h1>
  <ul>
${items}
  </ul>
  <footer>
    Generated <time datetime="${today}">${today}</time>
    from <a href="https://github.com/${REPO_SLUG}">github.com/${REPO_SLUG}</a>.
  </footer>
</body>
</html>
`;
}

function main() {
  const skills = collectSkills();
  const html = render(skills);
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, html);
  console.log(`[build-index] wrote ${OUT_FILE} (${skills.length} skill${skills.length === 1 ? '' : 's'})`);
}

main();
