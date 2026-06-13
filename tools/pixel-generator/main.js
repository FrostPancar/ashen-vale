// ASHEN VALE — AI Pixel Art Generator
import { PAL, drawAscii, makeCanvas } from '@/art.js';

const API = '/api/pixel-art/generate';
const LS_KEY = 'pixel-gen-cursor-key';

const SIZE_PRESETS = [
  { label: '16×16', w: 16, h: 16 },
  { label: '16×20', w: 16, h: 20 },
  { label: '16×24', w: 16, h: 24 },
  { label: '32×16', w: 32, h: 16 },
];

const $ = id => document.getElementById(id);

function showToast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 2200);
}

function setStatus(msg, kind = '') {
  const el = $('status');
  el.textContent = msg;
  el.className = 'status' + (kind ? ` ${kind}` : '');
}

function renderPalette() {
  const bar = $('palette-swatches');
  bar.innerHTML = '';
  const labels = ['0', '1', '2', '3'];
  PAL.forEach((hex, i) => {
    const sw = document.createElement('div');
    sw.className = 'swatch' + (i >= 2 ? ' dark-text' : '');
    sw.style.background = hex;
    sw.title = `shade ${i}`;
    sw.textContent = labels[i];
    bar.appendChild(sw);
  });
}

function renderSizePresets(activeW, activeH) {
  const row = $('size-presets');
  row.innerHTML = '';
  for (const p of SIZE_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab-btn' + (p.w === activeW && p.h === activeH ? ' active' : '');
    btn.textContent = p.label;
    btn.addEventListener('click', () => {
      $('size-w').value = String(p.w);
      $('size-h').value = String(p.h);
      renderSizePresets(p.w, p.h);
    });
    row.appendChild(btn);
  }
}

function previewCanvas(rows, scale = 8) {
  const w = rows[0]?.length || 16;
  const h = rows.length;
  const [c, ctx] = makeCanvas(w, h);
  drawAscii(ctx, rows);
  const out = document.createElement('canvas');
  out.width = w * scale;
  out.height = h * scale;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(c, 0, 0, out.width, out.height);
  return out;
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
  showToast('Copied to clipboard');
}

function variantCard(v) {
  const card = document.createElement('article');
  card.className = 'variant-card';

  const head = document.createElement('div');
  head.className = 'variant-head';
  head.innerHTML = `<h3>${v.label.toUpperCase()}</h3><span class="meta">${v.width}×${v.height} · ${v.pixels}px</span>`;
  card.appendChild(head);

  const preview = document.createElement('div');
  preview.className = 'variant-preview';
  preview.appendChild(previewCanvas(v.rows));
  card.appendChild(preview);

  const code = document.createElement('div');
  code.className = 'variant-code';
  const pre = document.createElement('pre');
  pre.textContent = v.jsCode;
  code.appendChild(pre);

  const actions = document.createElement('div');
  actions.className = 'variant-actions';

  const btnJs = document.createElement('button');
  btnJs.type = 'button';
  btnJs.className = 'btn small primary';
  btnJs.textContent = 'COPY JS CONST';
  btnJs.addEventListener('click', () => copyText(v.jsCode));

  const btnAscii = document.createElement('button');
  btnAscii.type = 'button';
  btnAscii.className = 'btn small';
  btnAscii.textContent = 'COPY ASCII';
  btnAscii.addEventListener('click', () => copyText(v.asciiBlock));

  const btnRows = document.createElement('button');
  btnRows.type = 'button';
  btnRows.className = 'btn small';
  btnRows.textContent = 'COPY ROWS ARRAY';
  const rowsJs = '[\n' + v.rows.map(r => `  '${r}'`).join(',\n') + ',\n]';
  btnRows.addEventListener('click', () => copyText(rowsJs));

  actions.append(btnJs, btnAscii, btnRows);
  code.appendChild(actions);
  card.appendChild(code);

  const desc = document.createElement('p');
  desc.className = 'hint';
  desc.style.padding = '0 12px 10px';
  desc.textContent = v.description;
  card.appendChild(desc);

  return card;
}

function showVariants(variants) {
  const grid = $('variant-grid');
  const empty = $('empty-state');
  grid.innerHTML = '';
  for (const v of variants) grid.appendChild(variantCard(v));
  empty.classList.add('hidden');
  grid.classList.remove('hidden');
}

async function generate() {
  const name = $('object-name').value.trim();
  if (!name) {
    setStatus('Enter an object name first.', 'error');
    $('object-name').focus();
    return;
  }

  const width = Number($('size-w').value) || 16;
  const height = Number($('size-h').value) || 16;
  const description = $('object-desc').value.trim();
  const apiKey = $('api-key').value.trim();
  const model = $('model').value;

  if (apiKey) localStorage.setItem(LS_KEY, apiKey);

  const btn = $('btn-generate');
  btn.disabled = true;
  setStatus('Generating 4 variants via Cursor (may take 30–60s)…', 'busy');

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, width, height, apiKey, model }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

    showVariants(data.variants);
    setStatus(
      `Generated ${data.variants.length} variants for "${data.name}". Register in Art.init(): ${data.usage.register}`
    );
  } catch (err) {
    setStatus(err.message || 'Generation failed', 'error');
  } finally {
    btn.disabled = false;
  }
}

function init() {
  renderPalette();
  renderSizePresets(16, 16);

  const savedKey = localStorage.getItem(LS_KEY);
  if (savedKey) $('api-key').value = savedKey;

  $('size-w').addEventListener('change', () => {
    renderSizePresets(Number($('size-w').value), Number($('size-h').value));
  });
  $('size-h').addEventListener('change', () => {
    renderSizePresets(Number($('size-w').value), Number($('size-h').value));
  });

  $('btn-generate').addEventListener('click', generate);
  $('object-name').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) generate();
  });
}

init();
