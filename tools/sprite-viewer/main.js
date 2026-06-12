// ASHEN VALE — Sprite Viewer
import { Art, PAL } from '@/art.js';

const CATEGORIES = [
  { id: 'all', label: 'ALL' },
  { id: 'chars', label: 'CHARS' },
  { id: 'enemies', label: 'ENEMIES' },
  { id: 'props', label: 'PROPS' },
  { id: 'sprinkles', label: 'SPRINKLES' },
  { id: 'patches', label: 'PATCHES' },
  { id: 'areas', label: 'AREAS' },
  { id: 'biomes', label: 'BIOMES' },
  { id: 'icons', label: 'ICONS' },
  { id: 'projectiles', label: 'PROJECTILES' },
  { id: 'tiles', label: 'TILES' },
];

const CHAR_DIRS = ['down', 'up', 'left', 'right'];

/** @typedef {{ id: string, category: string, name: string, label: string, canvas: HTMLCanvasElement, variant?: string, frame?: number, meta?: object }} SpriteEntry */

function metaFor(category, name) {
  if (category === 'patches') return Art.patchMeta?.[name];
  if (category === 'areas') return Art.areaMeta?.[name];
  if (category === 'biomes') return Art.biomeMeta?.[name];
  if (category === 'sprinkles') return Art.sprinkleMeta?.[name];
  return null;
}

function displayLabel(category, name) {
  const meta = metaFor(category, name);
  if (meta?.name) return meta.name;
  return name;
}

/** @returns {SpriteEntry[]} */
function collectSprites() {
  const list = [];

  for (const [name, frames] of Object.entries(Art.chars)) {
    for (const dir of CHAR_DIRS) {
      frames[dir].forEach((canvas, frame) => {
        list.push({
          id: `chars/${name}/${dir}/${frame}`,
          category: 'chars',
          name,
          label: `${name} · ${dir} · f${frame}`,
          canvas,
          variant: dir,
          frame,
        });
      });
    }
  }

  for (const [name, frames] of Object.entries(Art.enemies)) {
    frames.forEach((canvas, frame) => {
      list.push({
        id: `enemies/${name}/${frame}`,
        category: 'enemies',
        name,
        label: `${name} · f${frame}`,
        canvas,
        frame,
      });
    });
  }

  const staticCats = [
    ['props', Art.props],
    ['icons', Art.icons],
    ['projectiles', Art.projectiles],
    ['tiles', Art.tiles],
    ['sprinkles', Art.sprinkles],
    ['patches', Art.patches],
    ['areas', Art.areas],
    ['biomes', Art.biomes],
  ];
  for (const [cat, registry] of staticCats) {
    if (!registry) continue;
    for (const [name, canvas] of Object.entries(registry)) {
      const meta = metaFor(cat, name);
      list.push({
        id: `${cat}/${name}`,
        category: cat,
        name,
        label: displayLabel(cat, name),
        canvas,
        meta,
      });
    }
  }

  return list.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return (a.label || '').localeCompare(b.label || '');
  });
}

function variantsForSelection(sprite, allSprites) {
  if (!sprite) return [];
  if (sprite.category === 'chars') {
    return allSprites.filter(
      s => s.category === 'chars' && s.name === sprite.name && s.variant === sprite.variant
    );
  }
  if (sprite.category === 'enemies') {
    return allSprites.filter(s => s.category === 'enemies' && s.name === sprite.name);
  }
  return [sprite];
}

function blitScaled(target, src, scale) {
  const w = src.width * scale;
  const h = src.height * scale;
  target.width = w;
  target.height = h;
  const ctx = target.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, w, h);
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 2200);
}

async function copyCanvasPng(canvas) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not create PNG');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

function downloadCanvas(canvas, filename) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}

Art.init();
const allSprites = collectSprites();

const state = {
  category: 'patches',
  patchGroup: 'all',
  search: '',
  selected: allSprites.find(s => s.category === 'patches') || allSprites[0] || null,
  frameIndex: 0,
  zoom: 4,
  panX: 0,
  panY: 0,
  dragging: false,
  dragStart: null,
};

const els = {
  categoryTabs: document.getElementById('category-tabs'),
  patchGroupSection: document.getElementById('patch-group-section'),
  patchGroupTabs: document.getElementById('patch-group-tabs'),
  search: document.getElementById('search'),
  grid: document.getElementById('sprite-grid'),
  gridCount: document.getElementById('grid-count'),
  frameTabs: document.getElementById('frame-tabs'),
  zoomSlider: document.getElementById('zoom-slider'),
  zoomLabel: document.getElementById('zoom-label'),
  previewStage: document.getElementById('preview-stage'),
  previewCanvas: document.getElementById('preview-canvas'),
  infoName: document.getElementById('info-name'),
  infoMeta: document.getElementById('info-meta'),
  paletteSwatches: document.getElementById('palette-swatches'),
  btnReset: document.getElementById('btn-reset-view'),
  btnCopy: document.getElementById('btn-copy-png'),
  btnDownload: document.getElementById('btn-download'),
};

const exportCanvas = document.createElement('canvas');

function defaultZoomFor(sprite) {
  if (!sprite) return 8;
  if (sprite.category === 'patches') return Math.max(2, Math.min(6, Math.floor(96 / Math.max(sprite.canvas.width, sprite.canvas.height))));
  if (sprite.canvas.width > 32 || sprite.canvas.height > 32) return 4;
  return 8;
}

function filteredSprites() {
  const q = state.search.trim().toLowerCase();
  return allSprites.filter(s => {
    if (state.category !== 'all' && s.category !== state.category) return false;
    if (state.category === 'patches' && state.patchGroup !== 'all') {
      const g = Art.patchMeta?.[s.name]?.group;
      if (g !== state.patchGroup) return false;
    }
    if (!q) return true;
    const tags = (s.meta?.tags || []).join(' ');
    return s.label.toLowerCase().includes(q)
      || s.name.toLowerCase().includes(q)
      || s.category.includes(q)
      || tags.toLowerCase().includes(q);
  });
}

function activeSprite() {
  if (!state.selected) return null;
  const variants = variantsForSelection(state.selected, allSprites);
  return variants[state.frameIndex] || variants[0] || state.selected;
}

function centerPan() {
  const sprite = activeSprite();
  if (!sprite) return;
  const stage = els.previewStage.getBoundingClientRect();
  if (stage.width < 1 || stage.height < 1) return;
  state.panX = (stage.width - sprite.canvas.width * state.zoom) / 2;
  state.panY = (stage.height - sprite.canvas.height * state.zoom) / 2;
}

function scheduleCenterPan() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      centerPan();
      renderPreview();
    });
  });
}

function setZoom(z, recenter = false) {
  state.zoom = Math.max(1, Math.min(32, z));
  els.zoomSlider.value = String(state.zoom);
  els.zoomLabel.textContent = `${state.zoom}×`;
  if (recenter) centerPan();
  renderPreview();
}

function selectSprite(sprite) {
  state.selected = sprite;
  state.frameIndex = sprite.frame ?? 0;
  setZoom(defaultZoomFor(sprite), true);
  renderGrid();
  renderFrameTabs();
  renderPreview();
  renderInfo();
}

function renderCategoryTabs() {
  els.categoryTabs.innerHTML = '';
  for (const cat of CATEGORIES) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (state.category === cat.id ? ' active' : '');
    btn.textContent = cat.label;
    btn.addEventListener('click', () => {
      state.category = cat.id;
      els.patchGroupSection.classList.toggle('hidden', cat.id !== 'patches');
      renderCategoryTabs();
      renderGrid();
    });
    els.categoryTabs.appendChild(btn);
  }
}

function renderPatchGroupTabs() {
  els.patchGroupTabs.innerHTML = '';
  const groups = Art.patchGroups || [{ id: 'all', label: 'ALL PATCHES' }];
  for (const g of groups) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (state.patchGroup === g.id ? ' active' : '');
    btn.textContent = g.label;
    btn.addEventListener('click', () => {
      state.patchGroup = g.id;
      renderPatchGroupTabs();
      renderGrid();
    });
    els.patchGroupTabs.appendChild(btn);
  }
}

function renderGrid() {
  const items = filteredSprites();
  els.grid.innerHTML = '';
  els.gridCount.textContent = `${items.length} SPRITE${items.length === 1 ? '' : 'S'}`;

  for (const sprite of items) {
    const cell = document.createElement('div');
    cell.className = 'sprite-thumb' + (state.selected?.id === sprite.id ? ' selected' : '');
    cell.title = sprite.label + (sprite.meta?.tags ? `\n${sprite.meta.tags.join(' · ')}` : '');

    const thumb = document.createElement('canvas');
    const maxDim = Math.max(sprite.canvas.width, sprite.canvas.height);
    const scale = Math.min(56 / maxDim, 4);
    blitScaled(thumb, sprite.canvas, Math.max(1, Math.floor(scale)) || 1);
    cell.appendChild(thumb);

    const label = document.createElement('div');
    label.className = 'thumb-label';
    label.textContent = sprite.category === 'patches' ? sprite.name : sprite.name;
    cell.appendChild(label);

    if (sprite.meta?.group) {
      const sub = document.createElement('div');
      sub.className = 'thumb-sub';
      sub.textContent = sprite.meta.group;
      cell.appendChild(sub);
    }

    cell.addEventListener('click', () => selectSprite(sprite));
    els.grid.appendChild(cell);
  }
}

function renderFrameTabs() {
  els.frameTabs.innerHTML = '';
  const sprite = state.selected;
  if (!sprite) return;

  const variants = variantsForSelection(sprite, allSprites);
  if (variants.length <= 1) {
    if (sprite.category === 'chars') {
      const dirRow = document.createElement('div');
      dirRow.className = 'tab-row small';
      dirRow.style.marginTop = '4px';
      for (const dir of CHAR_DIRS) {
        const btn = document.createElement('button');
        btn.className = 'tab-btn' + (sprite.variant === dir ? ' active' : '');
        btn.textContent = dir.toUpperCase();
        btn.addEventListener('click', () => {
          const match = allSprites.find(
            s => s.category === 'chars' && s.name === sprite.name && s.variant === dir && s.frame === 0
          );
          if (match) selectSprite(match);
        });
        dirRow.appendChild(btn);
      }
      els.frameTabs.appendChild(dirRow);
    }
    return;
  }

  variants.forEach((v, i) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (state.frameIndex === i ? ' active' : '');
    btn.textContent = `F${i}`;
    btn.addEventListener('click', () => {
      state.frameIndex = i;
      renderFrameTabs();
      renderPreview();
      renderInfo();
    });
    els.frameTabs.appendChild(btn);
  });
}

function renderPreview() {
  const sprite = activeSprite();
  const canvas = els.previewCanvas;
  if (!sprite) {
    canvas.width = 0;
    canvas.height = 0;
    return;
  }

  blitScaled(canvas, sprite.canvas, state.zoom);
  canvas.style.transform = `translate(${state.panX}px, ${state.panY}px)`;
}

function renderInfo() {
  const sprite = activeSprite();
  if (!sprite) {
    els.infoName.textContent = '—';
    els.infoMeta.textContent = 'Select a sprite from the gallery';
    return;
  }
  const { canvas } = sprite;
  els.infoName.textContent = sprite.label.toUpperCase();
  const parts = [
    `Category: ${sprite.category}`,
    `Id: ${sprite.name}`,
    `Size: ${canvas.width}×${canvas.height}px`,
    `Zoom: ${state.zoom}× → ${canvas.width * state.zoom}×${canvas.height * state.zoom}px`,
    `Path: Art.${sprite.category}.${sprite.name}`,
  ];
  const meta = sprite.meta || metaFor(sprite.category, sprite.name);
  if (meta?.group) parts.push(`Group: ${meta.group}`);
  if (meta?.tags?.length) parts.push(`Tags: ${meta.tags.join(', ')}`);
  if (meta?.w && meta?.h) parts.push(`Stamp: ${meta.w}×${meta.h} tiles`);
  els.infoMeta.innerHTML = parts.join('<br>');
}

function renderPalette() {
  els.paletteSwatches.innerHTML = '';
  PAL.forEach((color, idx) => {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = color;
    sw.dataset.idx = String(idx);
    sw.title = `${color} (index ${idx})`;
    sw.addEventListener('click', () => {
      navigator.clipboard.writeText(color).then(() => showToast(`Copied ${color}`));
    });
    els.paletteSwatches.appendChild(sw);
  });
}

function getExportCanvas() {
  const sprite = activeSprite();
  if (!sprite) return null;
  blitScaled(exportCanvas, sprite.canvas, state.zoom);
  return exportCanvas;
}

function bindEvents() {
  els.search.addEventListener('input', () => {
    state.search = els.search.value;
    renderGrid();
  });

  els.zoomSlider.addEventListener('input', () => setZoom(Number(els.zoomSlider.value)));

  document.querySelectorAll('[data-zoom]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.zoom;
      setZoom(state.zoom + (dir === 'in' ? 1 : -1));
    });
  });

  document.querySelectorAll('[data-zoom-val]').forEach(btn => {
    btn.addEventListener('click', () => setZoom(Number(btn.dataset.zoomVal)));
  });

  els.btnReset.addEventListener('click', () => {
    setZoom(defaultZoomFor(activeSprite()), true);
    showToast('View reset');
  });

  els.btnCopy.addEventListener('click', async () => {
    const c = getExportCanvas();
    if (!c) return;
    try {
      await copyCanvasPng(c);
      showToast('PNG copied to clipboard');
    } catch {
      showToast('Copy failed — try Download instead');
    }
  });

  els.btnDownload.addEventListener('click', () => {
    const sprite = activeSprite();
    const c = getExportCanvas();
    if (!sprite || !c) return;
    const safe = `${sprite.category}_${sprite.name}`.replace(/[^a-z0-9._-]+/gi, '_');
    downloadCanvas(c, `${safe}_${state.zoom}x.png`);
    showToast('Download started');
  });

  els.previewStage.addEventListener('pointerdown', e => {
    state.dragging = true;
    state.dragStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
    els.previewStage.classList.add('dragging');
    els.previewStage.setPointerCapture(e.pointerId);
  });

  els.previewStage.addEventListener('pointermove', e => {
    if (!state.dragging || !state.dragStart) return;
    state.panX = e.clientX - state.dragStart.x;
    state.panY = e.clientY - state.dragStart.y;
    renderPreview();
  });

  const endDrag = e => {
    if (!state.dragging) return;
    state.dragging = false;
    state.dragStart = null;
    els.previewStage.classList.remove('dragging');
    try { els.previewStage.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };
  els.previewStage.addEventListener('pointerup', endDrag);
  els.previewStage.addEventListener('pointercancel', endDrag);

  els.previewStage.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = els.previewStage.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldZoom = state.zoom;
    const delta = e.deltaY < 0 ? 1 : -1;
    const newZoom = Math.max(1, Math.min(32, oldZoom + delta));
    if (newZoom === oldZoom) return;

    const ratio = newZoom / oldZoom;
    state.panX = mx - (mx - state.panX) * ratio;
    state.panY = my - (my - state.panY) * ratio;
    setZoom(newZoom);
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.target.matches('input')) return;

    if (e.key === 'ArrowLeft') { state.panX -= e.shiftKey ? 16 : 4; renderPreview(); }
    if (e.key === 'ArrowRight') { state.panX += e.shiftKey ? 16 : 4; renderPreview(); }
    if (e.key === 'ArrowUp') { state.panY -= e.shiftKey ? 16 : 4; renderPreview(); }
    if (e.key === 'ArrowDown') { state.panY += e.shiftKey ? 16 : 4; renderPreview(); }

    if (e.key === '+' || e.key === '=') { setZoom(state.zoom + 1); e.preventDefault(); }
    if (e.key === '-') { setZoom(state.zoom - 1); e.preventDefault(); }
    if (e.key === 'r' || e.key === 'R') { setZoom(defaultZoomFor(activeSprite()), true); showToast('View reset'); }

    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      els.btnCopy.click();
    }

    const items = filteredSprites();
    const idx = items.findIndex(s => s.id === state.selected?.id);
    if (e.key === '[' && idx > 0) selectSprite(items[idx - 1]);
    if (e.key === ']' && idx >= 0 && idx < items.length - 1) selectSprite(items[idx + 1]);
  });

  window.addEventListener('resize', () => {
    if (!state.dragging) scheduleCenterPan();
  });
}

renderCategoryTabs();
renderPatchGroupTabs();
els.patchGroupSection.classList.toggle('hidden', state.category !== 'patches');
renderPalette();
bindEvents();
if (state.selected) {
  setZoom(defaultZoomFor(state.selected), true);
  renderGrid();
  renderFrameTabs();
  renderPreview();
  renderInfo();
  scheduleCenterPan();
} else {
  renderGrid();
  els.infoMeta.textContent = 'No sprites found — check Art.init()';
}
