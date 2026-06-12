#!/usr/bin/env node
// Renders the ascii-art ICONS/BADGES from src/art.js as terminal block art and
// validates row lengths + characters. Usage:
//   node tools/render-icons.mjs            # validate everything, render all
//   node tools/render-icons.mjs sword bow  # render only matching names
//   node tools/render-icons.mjs --composites  # render skilltree badge composites
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const artSrc = readFileSync(join(root, 'src/art.js'), 'utf8');

function extractObject(src, name) {
  const start = src.indexOf(`const ${name} = {`);
  if (start < 0) return null;
  const open = src.indexOf('{', start);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  return new Function(`return ${src.slice(open, i + 1)};`)();
}

const ICONS = extractObject(artSrc, 'ICONS') || {};
const BADGES = extractObject(artSrc, 'BADGES') || {};

const SHADE = { '.': ' .', ' ': ' .', 0: '░░', 1: '▒▒', 2: '▓▓', 3: '██' };

let errors = 0;
function validate(name, rows, w, h) {
  if (rows.length !== h) { console.error(`!! ${name}: ${rows.length} rows (want ${h})`); errors++; }
  rows.forEach((r, y) => {
    if (r.length !== w) { console.error(`!! ${name} row ${y}: len ${r.length} (want ${w}): "${r}"`); errors++; }
    if (/[^.0123 ]/.test(r)) { console.error(`!! ${name} row ${y}: bad chars: "${r}"`); errors++; }
  });
}

function render(name, rows) {
  console.log(`\n— ${name} —`);
  for (const r of rows) console.log([...r].map((c) => SHADE[c] ?? '??').join(''));
}

function compose(base, badge) {
  const out = base.map((r) => [...r]);
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    const ch = badge[y]?.[x] ?? '.';
    out[9 + y][9 + x] = ch === '.' ? '.' : ch; // clearRect semantics: box goes transparent first
    if (true) out[9 + y][9 + x] = ch; // full 7x7 box cleared then badge drawn
  }
  return out.map((r) => r.join(''));
}

const args = process.argv.slice(2);
const wantComposites = args.includes('--composites');
const filters = args.filter((a) => !a.startsWith('--'));

for (const [k, rows] of Object.entries(ICONS)) validate(k, rows, 16, 16);
for (const [k, rows] of Object.entries(BADGES)) validate(k, rows, 7, 7);

if (wantComposites) {
  const treeSrc = readFileSync(join(root, 'src/skilltree.js'), 'utf8');
  const names = [...new Set(treeSrc.match(/'[a-z]+\+[a-z]+'/g) || [])].map((s) => s.slice(1, -1));
  for (const n of names) {
    const [b, g] = n.split('+');
    if (!ICONS[b]) { console.error(`!! composite ${n}: no base icon '${b}'`); errors++; continue; }
    if (!BADGES[g]) { console.error(`!! composite ${n}: no badge '${g}'`); errors++; continue; }
    if (!filters.length || filters.some((f) => n.includes(f))) render(n, compose(ICONS[b], BADGES[g]));
  }
} else {
  for (const [k, rows] of Object.entries(ICONS)) {
    if (!filters.length || filters.some((f) => k.includes(f))) render(k, rows);
  }
  for (const [k, rows] of Object.entries(BADGES)) {
    if (!filters.length || filters.some((f) => k.includes(f))) render(`badge:${k}`, rows);
  }
}

console.log(errors ? `\n${errors} error(s)` : '\nall valid');
process.exit(errors ? 1 : 0);
