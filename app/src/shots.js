// Fixed scenes for screenshots.
// ?shot=cover shows the cover alone (body.shot-cover, canvas fills the viewport).
// ?shot=editor shows the editor with a sample photo loaded.
// Query: photo (sample name), title, subtitle, layout, grade, size.
// window.__shotReady is set once painted.
// ctx: { state, loadImage, redraw, fitPreview, setSize }
export async function runShot(shot, query, ctx) {
  const { state, loadImage, redraw, setSize } = ctx;
  const photo = query.get('photo') ?? 'pier';
  const title = query.get('title') ?? query.get('caption') ?? 'Neon Coast';
  const subtitle = query.get('subtitle') ?? 'Vice City nights';
  const layout = query.get('layout') ?? 'nine';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? 'square';

  state.title = title;
  state.subtitle = subtitle;
  if (['nine', 'hero3', 'four', 'bleed', 'tilt', 'story'].includes(layout)) state.layout = layout;
  if (['sunset', 'neon', 'golden', 'dusk', 'night', 'mono'].includes(grade)) state.grade = grade;

  // Load the sample photo (and a second one so multi-panel layouts have variety).
  state.photos = [];
  state.photoNames = [];
  for (const name of [photo, photo === 'pier' ? 'boulevard' : 'pier']) {
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      state.photos.push(img);
      state.photoNames.push(name);
    } catch { /* ignore */ }
  }
  const { defaultPanels } = await import('./cover.js');
  state.panels = defaultPanels(state.layout, state.photos.length);
  state.selected = 0;

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const canvas = document.getElementById('cover');
    // Render at the viewport size (the screenshot viewport), for a crisp cover.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  } else {
    setSize(size);
  }
  // Let the fonts settle, then paint.
  try { await Promise.race([Promise.all([document.fonts.load('40px Anton'), document.fonts.load('40px Pacifico')]), new Promise((r) => setTimeout(r, 2000))]); } catch { /* ignore */ }
  redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
