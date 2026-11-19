// A working gta6-cover-art-01 entry (Node 22, standard library only): the app is this directory's app/ folder, plain
// static files a desktop browser loads offline (app/index.html and its ES modules, no library and no network
// request), and the program hands it in. It copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library. Only the plumbing, not the
// cover art the bounty asks for: Cover Snap, a plain one-photo square cover with a sunset tint and a bold caption,
// exported as a 1080 x 1080 PNG. Its two sample photos (app/samples/) were made for make.fun with an image model and
// are free to use. Build your own GTA-style cover maker in its place, put your 3 or 4 PNG or JPEG screenshots in
// screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// Neon Coast Cover Studio — entrypoint options, authored for this entry.
//   node main.ts                 build to $MAKEFUN_OUTPUT_DIR (default /output)
//   node main.ts --out <dir>     build to <dir> instead of the env default
//   node main.ts --help          print usage and exit
//   node main.ts --version       print the app name and version and exit
const APP_NAME = 'Neon Coast Cover Studio';
const APP_VERSION = '1.0.0';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(
    `Usage: node main.ts [--out <dir>] [--help] [--version]\n\nBuilds ${APP_NAME} v${APP_VERSION} into the output directory\n(default $MAKEFUN_OUTPUT_DIR, or /output): copies app/ and\nscreenshots/ and writes dossier.json for the judge.`,
  );
  process.exit(0);
}
if (argv.includes('--version') || argv.includes('-v')) {
  console.log(`${APP_NAME} v${APP_VERSION}`);
  process.exit(0);
}
const outFlag = argv.indexOf('--out');
const outOverride = outFlag >= 0 && argv[outFlag + 1] ? argv[outFlag + 1] : undefined;

const here = fileURLToPath(new URL('.', import.meta.url));
const out = outOverride ?? process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
console.log(`Building ${APP_NAME} v${APP_VERSION} -> ${out}`);
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
