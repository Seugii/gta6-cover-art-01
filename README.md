# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Seugii/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Seugii/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns any photo and a caption into GTA 6-style cover art — the multi-panel poster look with bold lettering and a Vice City sunset or neon colour grade — exported as a PNG to share. Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty, $250 in USDC.

## What it does

- **6 layouts:** Nine-Panel Grid, Hero + Three, Four-Panel Grid, Full Bleed, Tilted Snapshots, Story Stack.
- **6 gradient-map grades:** Sunset, Neon Pink/Teal, Golden Hour, Vice Dusk, Night Drive, Mono Heat.
- **Any photo:** upload one or several photos, or use the built-in samples. Click a panel to select it, drag to pan its photo, scroll or slide to zoom.
- **Caption:** editable title in Anton with a sunset-to-neon underline, plus a neon script subtitle in Pacifico. Halftone title block, grain, vignette, inked and banded panel borders.
- **Export:** PNG in 1080×1080, 1080×1350, 1920×1080 and 1080×1920, one click each or all sizes at once.
- **Undo / redo** (buttons or Ctrl+Z / Ctrl+Shift+Z).
- **Offline:** no network requests; all fonts vendored (Anton and Pacifico, SIL Open Font License).

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `app/index.html` directly in a desktop browser. No build step, no dependencies.

## How it is entered

`main.ts` (Node 22) copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored `vendor/makefun-app.ts`.

## License

MIT. Fonts under `app/fonts/` are under the SIL Open Font License; see their OFL texts beside them.
