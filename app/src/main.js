// Neon Coast Cover Studio — the editor.
// Photos in, multi-panel GTA-style cover out. Undo/redo, per-panel crop, PNG export.
import { drawCover, defaultPanels, LAYOUTS, GRADES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// State (serialisable part is what undo/redo snapshots).
// ---------------------------------------------------------------------------
const state = {
  layout: 'nine',
  grade: 'sunset',
  title: 'NEON COAST',
  subtitle: 'Vice City nights',
  photos: [],       // HTMLImageElement[]
  photoNames: [],   // display names
  panels: defaultPanels('nine', 2),
  selected: 0,
};

function snapshot() {
  return JSON.parse(JSON.stringify({
    layout: state.layout, grade: state.grade, title: state.title,
    subtitle: state.subtitle, panels: state.panels, selected: state.selected,
  }));
}
function restore(snap) {
  state.layout = snap.layout; state.grade = snap.grade;
  state.title = snap.title; state.subtitle = snap.subtitle;
  state.panels = snap.panels; state.selected = snap.selected;
  syncControls();
}

// Undo / redo.
const past = [], future = [];
function pushHistory() {
  const s = snapshot();
  if (past.length && JSON.stringify(past[past.length - 1]) === JSON.stringify(s)) return;
  past.push(s);
  if (past.length > 80) past.shift();
  future.length = 0;
  updateUndoButtons();
}
function undo() {
  if (!past.length) return;
  future.push(snapshot());
  restore(past.pop());
  redraw();
  updateUndoButtons();
}
function redo() {
  if (!future.length) return;
  past.push(snapshot());
  restore(future.pop());
  redraw();
  updateUndoButtons();
}
function updateUndoButtons() {
  $('undo').disabled = !past.length;
  $('redo').disabled = !future.length;
}
$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
});

// ---------------------------------------------------------------------------
// Rendering: the preview canvas follows the chosen export size's aspect.
// ---------------------------------------------------------------------------
function sizeFor(id) { return SIZES.find((s) => s.id === id) ?? SIZES[0]; }
function fitPreview() {
  const s = sizeFor($('size').value);
  const max = 640;
  const scale = Math.min(max / s.w, max / s.h);
  canvas.width = Math.round(s.w * scale);
  canvas.height = Math.round(s.h * scale);
}
async function ensureFonts() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('40px Anton'), document.fonts.load('40px Pacifico')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fall back to system fonts */ }
}
function redraw() {
  drawCover(canvas, state);
  updateSelLabel();
}
function updateSelLabel() {
  const n = LAYOUTS[state.layout]?.slots ?? 9;
  $('selName').textContent = `panel ${state.selected + 1} of ${n}`;
  $('zoom').value = String(state.panels[state.selected]?.zoom ?? 1);
}

// ---------------------------------------------------------------------------
// Controls.
// ---------------------------------------------------------------------------
function chipGroup(el, items, current, onPick) {
  el.innerHTML = '';
  for (const [id, def] of Object.entries(items)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = def.name;
    b.setAttribute('aria-pressed', String(id === current));
    b.addEventListener('click', () => {
      pushHistory();
      onPick(id);
      chipGroup(el, items, id, onPick);
      redraw();
    });
    el.appendChild(b);
  }
}
function syncControls() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  chipGroup($('layouts'), LAYOUTS, state.layout, (id) => { state.layout = id; state.panels = defaultPanels(id, Math.max(1, state.photos.length)); state.selected = 0; });
  chipGroup($('grades'), GRADES, state.grade, (id) => { state.grade = id; });
  renderThumbs();
}
chipGroup($('layouts'), LAYOUTS, state.layout, (id) => { state.layout = id; state.panels = defaultPanels(id, Math.max(1, state.photos.length)); state.selected = 0; });
chipGroup($('grades'), GRADES, state.grade, (id) => { state.grade = id; });

$('title').addEventListener('focus', pushHistory);
$('title').addEventListener('input', () => { state.title = $('title').value; redraw(); });
$('subtitle').addEventListener('focus', pushHistory);
$('subtitle').addEventListener('input', () => { state.subtitle = $('subtitle').value; redraw(); });
$('size').addEventListener('change', () => { fitPreview(); redraw(); });
$('zoom').addEventListener('pointerdown', pushHistory);
$('zoom').addEventListener('input', () => {
  const p = state.panels[state.selected];
  if (p) { p.zoom = Number($('zoom').value); redraw(); }
});
$('resetPanel').addEventListener('click', () => {
  pushHistory();
  const p = state.panels[state.selected];
  if (p) { p.zoom = 1; p.ox = 0; p.oy = 0; }
  redraw();
});

// ---------------------------------------------------------------------------
// Photos.
// ---------------------------------------------------------------------------
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
async function addPhotoFiles(files) {
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      state.photos.push(img);
      state.photoNames.push(file.name);
    } catch { /* skip unreadable files */ }
  }
  if (state.photos.length) {
    state.panels = defaultPanels(state.layout, state.photos.length);
    state.selected = 0;
  }
  renderThumbs();
  redraw();
}
$('photos').addEventListener('change', (e) => addPhotoFiles([...e.target.files]));
$('sampleBtn').addEventListener('click', async () => {
  pushHistory();
  state.photos = [];
  state.photoNames = [];
  for (const name of ['boulevard.jpg', 'pier.jpg']) {
    try {
      const img = await loadImage(`samples/${name}`);
      state.photos.push(img);
      state.photoNames.push(name);
    } catch { /* ignore */ }
  }
  state.panels = defaultPanels(state.layout, state.photos.length);
  state.selected = 0;
  renderThumbs();
  redraw();
});

function renderThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  state.photos.forEach((img, i) => {
    const t = document.createElement('img');
    t.src = img.src;
    t.alt = state.photoNames[i] ?? `photo ${i + 1}`;
    t.title = `Put ${t.alt} in panel ${state.selected + 1}`;
    const inSel = state.panels[state.selected]?.photo === i;
    t.classList.toggle('sel', inSel);
    t.addEventListener('click', () => {
      pushHistory();
      const p = state.panels[state.selected];
      if (p) p.photo = i;
      renderThumbs();
      redraw();
    });
    box.appendChild(t);
  });
}

// ---------------------------------------------------------------------------
// Panel picking: click to select, drag to pan the photo, wheel to zoom.
// ---------------------------------------------------------------------------
function panelRects() {
  // Recompute the layout rects the engine drew (same formula as cover.js).
  const W = canvas.width, H = canvas.height;
  const tb = Math.round(H * 0.17);
  const gap = Math.max(4, Math.round(Math.min(W, H) * 0.008));
  const pw = W, ph = H - tb;
  const R = (x, y, w, h, rot = 0) => ({ x, y, w, h, rot });
  switch (state.layout) {
    case 'nine': {
      const cw = (pw - gap * 2) / 3, ch = (ph - gap * 2) / 3, out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(R(c * (cw + gap), r * (ch + gap), cw, ch));
      return out;
    }
    case 'hero3': {
      const lw = Math.round(pw * 0.62), rw = pw - lw - gap, sh = (ph - gap * 2) / 3;
      return [R(0, 0, lw, ph), R(lw + gap, 0, rw, sh), R(lw + gap, sh + gap, rw, sh), R(lw + gap, 2 * (sh + gap), rw, sh)];
    }
    case 'four': {
      const cw = (pw - gap) / 2, ch = (ph - gap) / 2;
      return [R(0, 0, cw, ch), R(cw + gap, 0, cw, ch), R(0, ch + gap, cw, ch), R(cw + gap, ch + gap, cw, ch)];
    }
    case 'bleed': return [R(0, 0, W, H)];
    case 'tilt': {
      const cw = Math.round(pw * 0.60), ch = Math.round(ph * 0.60);
      const sw = Math.round(pw * 0.36), sh = Math.round(ph * 0.36);
      return [
        R(Math.round((pw - sw) / 2) - Math.round(pw * 0.06), Math.round(ph * 0.52), sw, sh, 5),
        R(Math.round(pw * 0.62), Math.round(ph * 0.04), sw, sh, -4),
        R(Math.round((pw - cw) / 2), Math.round((ph - ch) / 2) - Math.round(ph * 0.03), cw, ch, -3),
      ];
    }
    case 'story': {
      const top = Math.round(ph * 0.60);
      return [R(0, 0, pw, top), R(0, top + gap, pw, ph - top - gap)];
    }
    default: return [];
  }
}
function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}
function hitPanel(pt) {
  const rects = panelRects();
  // Topmost first (tilted frames draw back-to-front, so the last is on top).
  for (let i = rects.length - 1; i >= 0; i--) {
    const rc = rects[i];
    // Un-rotate the point for tilted panels.
    let px = pt.x, py = pt.y;
    if (rc.rot) {
      const cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2;
      const a = (-rc.rot * Math.PI) / 180;
      const dx = pt.x - cx, dy = pt.y - cy;
      px = cx + dx * Math.cos(a) - dy * Math.sin(a);
      py = cy + dx * Math.sin(a) + dy * Math.cos(a);
    }
    if (px >= rc.x && px <= rc.x + rc.w && py >= rc.y && py <= rc.y + rc.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const pt = toCanvas(e);
  const i = hitPanel(pt);
  if (i < 0) return;
  pushHistory();
  state.selected = i;
  const p = state.panels[i];
  drag = { i, x: pt.x, y: pt.y, ox: p.ox, oy: p.oy, w: panelRects()[i].w, h: panelRects()[i].h };
  canvas.setPointerCapture(e.pointerId);
  renderThumbs();
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = toCanvas(e);
  const p = state.panels[drag.i];
  if (!p) return;
  p.ox = drag.ox + (pt.x - drag.x) / drag.w;
  p.oy = drag.oy + (pt.y - drag.y) / drag.h;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[state.selected];
  if (!p) return;
  pushHistory();
  p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  redraw();
}, { passive: false });

// ---------------------------------------------------------------------------
// Export.
// ---------------------------------------------------------------------------
function exportPNG(size, filename) {
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(blob);
    }, 'image/png');
  });
}
$('export').addEventListener('click', async () => {
  const s = sizeFor($('size').value);
  await exportPNG(s, `cover-${s.w}x${s.h}.png`);
  $('status').textContent = `Saved cover-${s.w}x${s.h}.png`;
});
$('exportAll').addEventListener('click', async () => {
  for (const s of SIZES) {
    await exportPNG(s, `cover-${s.w}x${s.h}.png`);
    await new Promise((r) => setTimeout(r, 250));
  }
  $('status').textContent = 'Saved all 4 sizes.';
});

// ---------------------------------------------------------------------------
// Boot. ?shot= scenes come from shots.js; otherwise load the samples.
// ---------------------------------------------------------------------------
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
async function boot() {
  await ensureFonts();
  fitPreview();
  if (shot) {
    await runShot(shot, params, {
      state,
      loadImage,
      redraw,
      fitPreview,
      setSize: (id) => { $('size').value = id; fitPreview(); },
    });
    redraw();
  } else {
    for (const name of ['boulevard.jpg', 'pier.jpg']) {
      try {
        const img = await loadImage(`samples/${name}`);
        state.photos.push(img);
        state.photoNames.push(name);
      } catch { /* ignore */ }
    }
    state.panels = defaultPanels(state.layout, state.photos.length);
    renderThumbs();
    redraw();
  }
}
boot();
