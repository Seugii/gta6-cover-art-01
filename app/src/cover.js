// Neon Coast Cover Studio — the cover engine.
// Draws a GTA 6-style multi-panel poster cover onto a canvas at the canvas's own
// size, from a state: layout, grade, title, subtitle, photos and per-panel crops.
// Pure 2D canvas, no network. Layouts adapt to the canvas aspect, so the same state
// renders at 1080x1080, 1080x1350, 1920x1080 and 1080x1920.

export const LAYOUTS = {
  nine:  { name: 'Nine-Panel Grid', slots: 9 },
  hero3: { name: 'Hero + Three', slots: 4 },
  four:  { name: 'Four-Panel Grid', slots: 4 },
  bleed: { name: 'Full Bleed', slots: 1 },
  tilt:  { name: 'Tilted Snapshots', slots: 3 },
  story: { name: 'Story Stack', slots: 2 },
};

export const GRADES = {
  sunset: { name: 'Sunset' },
  neon:   { name: 'Neon Pink / Teal' },
  golden: { name: 'Golden Hour' },
  dusk:   { name: 'Vice Dusk' },
  night:  { name: 'Night Drive' },
  mono:   { name: 'Mono Heat' },
};

export const SIZES = [
  { id: 'square',  label: 'Square 1080 x 1080',   w: 1080, h: 1080 },
  { id: 'portrait',label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: 'wide',    label: 'Wide 1920 x 1080',     w: 1920, h: 1080 },
  { id: 'story',   label: 'Story 1080 x 1920',    w: 1080, h: 1920 },
];

// ---------------------------------------------------------------------------
// Layouts: panel rects for a canvas W x H with a title band of height tb.
// Each rect: {x, y, w, h, rot (deg, optional), frame ('ink' | 'polaroid')}.
// ---------------------------------------------------------------------------
function layoutRects(layout, W, H, tb) {
  const gap = Math.max(4, Math.round(Math.min(W, H) * 0.008));
  const pw = W;                 // panel area width
  const ph = H - tb;            // panel area height (above the title band)
  const R = (x, y, w, h, rot = 0, frame = 'ink') => ({ x, y, w, h, rot, frame });
  switch (layout) {
    case 'nine': {
      const cw = (pw - gap * 2) / 3, ch = (ph - gap * 2) / 3;
      const out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
        out.push(R(c * (cw + gap), r * (ch + gap), cw, ch));
      return out;
    }
    case 'hero3': {
      const lw = Math.round(pw * 0.62), rw = pw - lw - gap;
      const sh = (ph - gap * 2) / 3;
      return [
        R(0, 0, lw, ph),
        R(lw + gap, 0, rw, sh),
        R(lw + gap, sh + gap, rw, sh),
        R(lw + gap, 2 * (sh + gap), rw, sh),
      ];
    }
    case 'four': {
      const cw = (pw - gap) / 2, ch = (ph - gap) / 2;
      return [R(0, 0, cw, ch), R(cw + gap, 0, cw, ch), R(0, ch + gap, cw, ch), R(cw + gap, ch + gap, cw, ch)];
    }
    case 'bleed':
      return [R(0, 0, W, H)];
    case 'tilt': {
      const cw = Math.round(pw * 0.60), ch = Math.round(ph * 0.60);
      const sw = Math.round(pw * 0.36), sh = Math.round(ph * 0.36);
      return [
        R(Math.round((pw - sw) / 2) - Math.round(pw * 0.06), Math.round(ph * 0.52), sw, sh, 5, 'polaroid'),
        R(Math.round(pw * 0.62), Math.round(ph * 0.04), sw, sh, -4, 'polaroid'),
        R(Math.round((pw - cw) / 2), Math.round((ph - ch) / 2) - Math.round(ph * 0.03), cw, ch, -3, 'polaroid'),
      ];
    }
    case 'story': {
      const top = Math.round(ph * 0.60);
      return [R(0, 0, pw, top), R(0, top + gap, pw, ph - top - gap)];
    }
    default:
      return layoutRects('nine', W, H, tb);
  }
}

// ---------------------------------------------------------------------------
// Grades: layered gradient overlays clipped to a rect. Fast (composited), and
// they give the neon-sunset / Vice City feel without per-pixel work.
// ---------------------------------------------------------------------------
function applyGrade(ctx, x, y, w, h, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const overlay = (grad, mode, alpha) => {
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
  const lin = (x0, y0, x1, y1, stops) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  };
  switch (grade) {
    case 'sunset':
      overlay(lin(x, y + h * 0.3, x, y + h, [[0, 'rgba(255,120,60,0)'], [1, 'rgba(214,48,120,0.55)']]), 'overlay', 0.85);
      overlay(lin(x, y, x, y + h, [[0, 'rgba(255,190,80,0.28)'], [0.5, 'rgba(255,120,80,0.10)'], [1, 'rgba(90,10,90,0.30)']]), 'soft-light', 0.9);
      break;
    case 'neon':
      overlay(lin(x, y, x + w, y + h, [[0, 'rgba(255,45,149,0.42)'], [0.5, 'rgba(120,40,160,0.12)'], [1, 'rgba(0,229,255,0.42)']]), 'overlay', 0.9);
      overlay(lin(x, y + h, x, y, [[0, 'rgba(0,229,255,0.20)'], [1, 'rgba(255,45,149,0.10)']]), 'soft-light', 0.9);
      break;
    case 'golden':
      overlay(lin(x, y, x, y + h, [[0, 'rgba(255,214,110,0.34)'], [1, 'rgba(255,140,40,0.30)']]), 'soft-light', 1);
      overlay(lin(x, y + h * 0.5, x, y + h, [[0, 'rgba(255,170,60,0)'], [1, 'rgba(180,80,10,0.28)']]), 'overlay', 0.7);
      break;
    case 'dusk':
      overlay(lin(x, y, x, y + h, [[0, 'rgba(40,20,90,0.42)'], [0.55, 'rgba(90,30,110,0.18)'], [1, 'rgba(255,110,60,0.30)']]), 'overlay', 0.9);
      overlay(lin(x, y, x, y + h, [[0, 'rgba(20,10,50,0.25)'], [1, 'rgba(20,10,50,0)']]), 'multiply', 0.8);
      break;
    case 'night':
      ctx.globalCompositeOperation = 'saturation';
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#808080';
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      overlay(lin(x, y, x, y + h, [[0, 'rgba(10,30,80,0.50)'], [1, 'rgba(0,10,40,0.55)']]), 'overlay', 0.9);
      overlay(lin(x, y + h, x + w, y, [[0, 'rgba(255,60,150,0.22)'], [1, 'rgba(0,220,255,0.18)']]), 'soft-light', 0.9);
      break;
    case 'mono':
      ctx.globalCompositeOperation = 'saturation';
      ctx.globalAlpha = 0;
      ctx.fillStyle = '#808080';
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      overlay(lin(x, y, x, y + h, [[0, 'rgba(255,255,255,0.10)'], [0.5, 'rgba(0,0,0,0.05)'], [1, 'rgba(0,0,0,0.35)']]), 'overlay', 0.9);
      break;
    default:
      break;
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Grain: one small noise tile, drawn tiled at low opacity over the whole cover.
// ---------------------------------------------------------------------------
let grainTile = null;
function getGrain() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = 140; c.height = 140;
  const g = c.getContext('2d');
  const img = g.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.floor(Math.random() * 20);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

// ---------------------------------------------------------------------------
// Photo into a panel rect, with a crop (zoom + offset). Offsets are fractions of
// the panel size and are clamped so the photo always covers the panel.
// ---------------------------------------------------------------------------
function drawPhotoInto(ctx, img, rect, crop) {
  const { x, y, w, h } = rect;
  const zoom = crop?.zoom ?? 1;
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * base;
  const ph = img.naturalHeight * base;
  // Horizontal: centred. Vertical: anchored at 35% of the photo height, so a
  // face (usually in the upper third) stays visible when a tall photo is cropped
  // into a wide, short panel; the user's offset is applied on top of that.
  const maxOx = Math.max(0, (pw - w) / 2);
  const ox = Math.max(-maxOx, Math.min(maxOx, (crop?.ox ?? 0) * w));
  const anchorY = h / 2 - 0.35 * ph;
  const y0 = Math.max(h - ph, Math.min(0, anchorY + (crop?.oy ?? 0) * h));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - pw) / 2 + ox, y + y0, pw, ph);
  ctx.restore();
}

// Inked band border around a panel: thick dark stroke + thin light inner line.
function drawPanelBorder(ctx, rect, W) {
  const bw = Math.max(3, Math.round(Math.min(W, 1080) * 0.006));
  ctx.save();
  ctx.lineWidth = bw;
  ctx.strokeStyle = '#14101c';
  ctx.strokeRect(rect.x + bw / 2, rect.y + bw / 2, rect.w - bw, rect.h - bw);
  ctx.lineWidth = Math.max(1, bw * 0.28);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeRect(rect.x + bw + 1, rect.y + bw + 1, rect.w - bw * 2 - 2, rect.h - bw * 2 - 2);
  ctx.restore();
}

// Polaroid-style frame for the tilted layout: white border, thicker at the foot.
function drawPolaroidFrame(ctx, rect, W) {
  const pad = Math.max(6, Math.round(Math.min(W, 1080) * 0.012));
  const foot = pad * 2.4;
  ctx.save();
  ctx.fillStyle = '#f7f2e8';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = Math.round(W * 0.02);
  ctx.shadowOffsetY = Math.round(W * 0.006);
  ctx.fillRect(rect.x - pad, rect.y - pad, rect.w + pad * 2, rect.h + pad + foot);
  ctx.restore();
  ctx.save();
  ctx.lineWidth = Math.max(2, Math.round(W * 0.003));
  ctx.strokeStyle = 'rgba(20,16,28,0.9)';
  ctx.strokeRect(rect.x - pad + 1, rect.y - pad + 1, rect.w + pad * 2 - 2, rect.h + pad + foot - 2);
  ctx.restore();
}

// Halftone dots across a band: rows of dots, size shrinking toward the top.
function drawHalftone(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(7, Math.round(w / 90));
  for (let row = 0; row * step < h; row++) {
    const yy = y + row * step + step / 2;
    const t = 1 - row * step / Math.max(1, h);
    const r = Math.max(0.6, step * 0.20 * (0.35 + 0.65 * t));
    for (let col = 0; col * step < w; col++) {
      const xx = x + col * step + step / 2 + (row % 2 ? step / 2 : 0);
      if (xx > x + w) continue;
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function fitFont(ctx, text, maxW, start, family, weight = '') {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxW && size > 10) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

// ---------------------------------------------------------------------------
// The cover. state: { layout, grade, title, subtitle, photos[], panels[] }.
// panels[i] = { photo, zoom, ox, oy }. Draws onto the canvas at its own size.
// ---------------------------------------------------------------------------
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const tb = Math.round(H * (state.layout === 'bleed' ? 0.17 : 0.17));
  const rects = layoutRects(state.layout, W, H, tb);

  // Base.
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160f24';
  ctx.fillRect(0, 0, W, H);

  // Panels (back to front, so tilted frames overlap correctly).
  rects.forEach((rect, i) => {
    const panel = state.panels?.[i] ?? { photo: i % Math.max(1, state.photos.length), zoom: 1, ox: 0, oy: 0 };
    const img = state.photos?.[panel.photo] ?? state.photos?.[0] ?? null;
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((rect.rot * Math.PI) / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      if (rect.frame === 'polaroid') drawPolaroidFrame(ctx, { x: 0, y: 0, w: rect.w, h: rect.h }, W);
      const inner = rect.frame === 'polaroid'
        ? { x: 0, y: 0, w: rect.w, h: rect.h }
        : { x: 0, y: 0, w: rect.w, h: rect.h };
      if (img) drawPhotoInto(ctx, img, inner, panel);
      else { ctx.fillStyle = '#3a2b52'; ctx.fillRect(0, 0, rect.w, rect.h); }
      applyGrade(ctx, 0, 0, rect.w, rect.h, state.grade);
      if (rect.frame !== 'polaroid') drawPanelBorder(ctx, inner, W);
      ctx.restore();
    } else {
      if (rect.frame === 'polaroid') drawPolaroidFrame(ctx, rect, W);
      if (img) drawPhotoInto(ctx, img, rect, panel);
      else { ctx.fillStyle = '#3a2b52'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); }
      applyGrade(ctx, rect.x, rect.y, rect.w, rect.h, state.grade);
      if (rect.frame !== 'polaroid') drawPanelBorder(ctx, rect, W);
      ctx.restore();
    }
  });

  // Title band: halftone strip + big Anton title + Pacifico subtitle.
  const by = H - tb;
  const bandGrad = ctx.createLinearGradient(0, by, 0, H);
  bandGrad.addColorStop(0, '#1b1030');
  bandGrad.addColorStop(1, '#0d0718');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, by, W, tb);
  drawHalftone(ctx, 0, by, W, Math.round(tb * 0.42), 'rgba(255,93,162,0.30)');
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillRect(0, by, W, Math.max(2, Math.round(H * 0.004)));

  const title = (state.title || 'NEON COAST').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const padX = Math.round(W * 0.045);
  const titleSize = fitFont(ctx, title, W - padX * 2, Math.round(tb * 0.52), 'Anton, "Arial Black", sans-serif');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const titleY = by + tb * 0.52 + (sub ? tb * 0.10 : tb * 0.16);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, Math.round(titleSize * 0.14));
  ctx.strokeStyle = '#12081f';
  ctx.strokeText(title, padX, titleY);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, padX, titleY);
  // Sunset underline under the title.
  const tw = ctx.measureText(title).width;
  const ul = ctx.createLinearGradient(padX, 0, padX + tw, 0);
  ul.addColorStop(0, '#ffb347');
  ul.addColorStop(0.5, '#ff5da2');
  ul.addColorStop(1, '#00e5ff');
  ctx.fillStyle = ul;
  ctx.fillRect(padX, titleY + Math.round(tb * 0.07), tw, Math.max(3, Math.round(tb * 0.045)));

  if (sub) {
    const subSize = fitFont(ctx, sub, W - padX * 2, Math.round(tb * 0.30), 'Pacifico, cursive');
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ff5da2';
    ctx.shadowColor = 'rgba(255,93,162,0.9)';
    ctx.shadowBlur = Math.round(subSize * 0.55);
    ctx.fillText(sub, padX, by + tb * 0.90);
    ctx.shadowBlur = 0;
  }

  // Vignette + grain over everything.
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,4,18,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  const grain = getGrain();
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  const pat = ctx.createPattern(grain, 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Default per-panel state for a layout: cycle the photos across the slots.
export function defaultPanels(layout, photoCount) {
  const n = LAYOUTS[layout]?.slots ?? 9;
  const out = [];
  for (let i = 0; i < 9; i++) out.push({ photo: photoCount ? i % photoCount : 0, zoom: 1, ox: 0, oy: 0 });
  return out.slice(0, Math.max(n, 1));
}
