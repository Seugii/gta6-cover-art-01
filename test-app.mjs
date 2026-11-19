// Smoke test + screenshots for the Neon Coast Cover Studio app.
// Serves app/ with serve.ts, opens it in Chromium, checks for errors, exercises
// the editor (layout/grade/photo/export), and takes the screenshots from shots.json.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 18081;
const shots = JSON.parse(readFileSync(path.join(here, 'shots.json'), 'utf8'));

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 1200));

let failures = 0;
const fail = (m) => { failures++; console.error('FAIL:', m); };
const ok = (m) => console.log('ok:', m);

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

try {
  // 1. Load the editor.
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const ready = await page.evaluate(() => {
    const c = document.getElementById('cover');
    return c && c.width > 0 && !!window.document.fonts;
  });
  if (!ready) fail('cover canvas not ready');
  // Canvas should not be blank: sample pixels.
  const px = await page.evaluate(() => {
    const c = document.getElementById('cover');
    const x = c.getContext('2d');
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let sum = 0; for (let i = 0; i < d.length; i += 4013) sum += d[i] + d[i + 1] + d[i + 2];
    return sum;
  });
  if (px <= 0) fail('cover canvas is blank');
  else ok(`editor renders (pixel sum ${px})`);
  if (errors.length) fail('console errors on load: ' + errors.join(' | '));

  // 2. Switch layout + grade, verify it still renders.
  await page.click('text=Four-Panel Grid');
  await page.click('text=Neon Pink / Teal');
  await page.waitForTimeout(600);
  const px2 = await page.evaluate(() => {
    const c = document.getElementById('cover');
    const x = c.getContext('2d');
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let sum = 0; for (let i = 0; i < d.length; i += 4013) sum += d[i] + d[i + 1] + d[i + 2];
    return sum;
  });
  if (px2 <= 0) fail('canvas blank after layout/grade switch');
  else ok('layout + grade switch renders');

  // 3. Export a PNG at 1080x1080 and verify it is a real PNG.
  const download = page.waitForEvent('download', { timeout: 15000 });
  await page.selectOption('#size', 'square');
  await page.click('#export');
  const dl = await download;
  const dlPath = `/tmp/test-export-${Date.now()}.png`;
  await dl.saveAs(dlPath);
  const { execSync } = await import('node:child_process');
  const info = execSync(`python3 -c "from PIL import Image; im=Image.open('${dlPath}'); print(im.size, im.mode)"`).toString().trim();
  if (!/^\(1080, 1080\) (RGB|RGBA)$/.test(info)) fail('exported PNG is not 1080x1080: ' + info);
  else ok('export PNG 1080x1080 verified (' + info + ')');

  // 4. Render the real engine at every export size and verify dimensions + content.
  for (const [id, w, h, layout, grade] of [
    ['portrait', 1080, 1350, 'hero3', 'neon'],
    ['wide', 1920, 1080, 'four', 'dusk'],
    ['story', 1080, 1920, 'story', 'golden'],
    ['tilt', 1080, 1080, 'tilt', 'sunset'],
  ]) {
    const p = `/tmp/test-render-${id}.png`;
    const dataUrl = await page.evaluate(async ({ w, h, layout, grade }) => {
      const { drawCover, defaultPanels } = await import('./src/cover.js');
      const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
      const photos = [await load('samples/boulevard.jpg'), await load('samples/pier.jpg')];
      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      drawCover(off, {
        layout, grade, title: 'TEST COVER', subtitle: 'vice city nights',
        photos, panels: defaultPanels(layout, photos.length), selected: 0,
      });
      // Non-blank check.
      const x = off.getContext('2d');
      const d = x.getImageData(0, 0, w, h).data;
      let sum = 0; for (let i = 0; i < d.length; i += 7919) sum += d[i] + d[i + 1] + d[i + 2];
      if (sum <= 0) throw new Error('blank render at ' + id);
      return off.toDataURL('image/png');
    }, { w, h, layout, grade });
    const { writeFileSync } = await import('node:fs');
    writeFileSync(p, Buffer.from(dataUrl.split(',')[1], 'base64'));
    const info2 = execSync(`python3 -c "from PIL import Image; im=Image.open('${p}'); print(im.size)"`).toString().trim();
    if (info2 !== `(${w}, ${h})`) fail(`render ${id} wrong: ${info2}`);
    else ok(`engine render ${id} ${w}x${h} (${layout}/${grade}) verified`);
  }

  // 5. Screenshots from shots.json.
  mkdirSync(path.join(here, 'screenshots'), { recursive: true });
  for (const s of shots) {
    const shotPage = await browser.newPage({ viewport: { width: s.w, height: s.h } });
    shotPage.on('pageerror', (e) => errors.push(`shot ${s.name}: ` + e.message));
    await shotPage.goto(`http://localhost:${PORT}/` + s.query, { waitUntil: 'networkidle' });
    try {
      await shotPage.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });
    } catch { fail(`shot ${s.name} never became ready`); }
    await shotPage.waitForTimeout(400);
    const out = path.join(here, 'screenshots', s.name);
    const tmpPng = out.replace(/\.jpg$/, '.tmp.png');
    await shotPage.screenshot({ path: tmpPng, type: 'png' });
    // Encode to JPEG under the 256 KiB gate cap (long side <= 1280 already).
    const sz = execSync(`python3 -c "
from PIL import Image
import os
im = Image.open('${tmpPng}').convert('RGB')
q = 85
while True:
    im.save('${out}', 'JPEG', quality=q, optimize=True)
    if os.path.getsize('${out}') <= 262144 or q <= 55:
        break
    q -= 7
print(im.size, os.path.getsize('${out}'), 'q' + str(q))
"`).toString().trim();
    execSync(`rm -f '${tmpPng}'`);
    console.log(`shot ${s.name}: ${sz}`);
    await shotPage.close();
  }
} finally {
  await browser.close();
  server.kill();
}
if (errors.length) { console.error('ERRORS:', errors.join('\n')); failures++; }
console.log(failures ? `DONE with ${failures} failure(s)` : 'DONE — all checks passed');
process.exit(failures ? 1 : 0);
