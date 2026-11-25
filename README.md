# Edison Muñoz Matasea — Showroom

A bilingual (ES/EN) landing page and walk-through 3D showroom for the painter
Edison Muñoz Matasea, archive 2021–2026. Built with React 18, TypeScript (strict),
Vite and three.js.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the built site locally
```

`dist/` is a static site with relative paths: upload it to any static host
(Netlify, Vercel, Cloudflare Pages, S3, cPanel…), at the domain root or in a sub-folder.

## Deploy on Railway

The repo ships a `Dockerfile` (Node 22 builds `dist/`, then Caddy serves it) and a
`Caddyfile`. Railway builds from the Dockerfile automatically; no `railway.json` is needed
(Config as Code is deprecated for new services).

1. Push this folder to a GitHub repository.
2. In Railway: **New Project → Deploy from GitHub repo**, pick the repo.
3. In the service's settings:
   - **Networking**: generate a public domain (or add your own and point a CNAME at it).
   - **Healthcheck path**: `/health`.
4. No environment variables are needed. Railway sets `PORT`; Caddy listens on it.

Every push to the default branch redeploys.

What Caddy adds in production: gzip/zstd compression; one-year immutable caching for
`/assets/*` (Vite fingerprints those); one-week caching for `/img/*`; `no-cache` on the page
itself so new deploys show at once; and security headers (CSP allowing only this site plus
Google Fonts, `nosniff`, referrer policy, frame protection).

Run the same container locally:

```bash
docker build -t emm-showroom .
docker run --rm -p 3000:3000 emm-showroom   # http://localhost:3000
```

> Replacing an image under the same file name? Visitors may see the old one for up to a
> week. Give the new file a new name (and update `src/data/works.ts`), or lower the
> `/img/*` cache time in the `Caddyfile`.

## What's in it

| View | What it does |
| --- | --- |
| Cover | Arched-window portrait, name, signature, "Enter the showroom" / "View as list" |
| Room | A circular gallery in WebGL: oxblood walls, spot-lit works, an arched window and a year title per chapter. Scroll, drag or use ← → to walk; click a work to step closer, click again to open it; Esc steps back |
| List | The same works as a grid by chapter (also the fallback when WebGL is unavailable) |
| Detail | Full-screen work with an Enhanced / Original switch, ← → and swipe between works |

The language follows the browser on first visit and is remembered per browser.

## Project layout

```
src/
  main.tsx                 React entry
  App.tsx                  views, language, detail state; wires the engine to the UI
  i18n.ts                  ES/EN dictionary and useLanguage()
  styles.css               all styles (the UI shows/hides through body.at-intro / body.at-list)
  data/works.ts            the 41 works, chapters, image URLs
  room/ShowroomEngine.ts   three.js room: layout, camera, input, texture streaming
  room/textures.ts         canvas-drawn textures: plaster, wood, window, glow, labels
  components/
    Intro.tsx  TopBar.tsx  RoomHud.tsx  ListView.tsx  DetailDialog.tsx
    Showroom.tsx           owns the <canvas> and the engine's lifetime
    LanguageSwitch.tsx  icons.tsx
public/img/                images (see below)
tools/process_images.py    the crop + enhancement script that produced public/img
```

`ShowroomEngine` has no React dependency. The UI talks to it through
`step()`, `goChapter()`, `handleKey()`, `relabel()`, `setActive()` and `dispose()`,
and it reports back through `onHud` (current chapter, focused or not) and `onOpen`.

## Images

Every work has three files in `public/img/`:

- `<id>.webp` enhanced, long edge up to 1600 px (detail view; swapped onto the wall when the visitor is near)
- `<id>-t.webp` enhanced, 520 px (list view and distant wall textures)
- `<id>-o.webp` cropped and straightened only (the "Original" comparison)

The sources are WhatsApp copies. Enhancement is deliberately light and conventional:
perspective correction and crop, compression clean-up (chroma bilateral + light luma
non-local means), gentle luminance levels, small sources upscaled 1.5× (Lanczos), and a mild
unsharp mask. No AI detail is generated. Re-run `tools/process_images.py` (Python, OpenCV,
NumPy) when better originals arrive; it keeps the corner coordinates for each crop.

### Adding or replacing a work

1. Put the three image files in `public/img/`.
2. Add a row to `ROWS` in `src/data/works.ts`: `[id, year, 'p' | 's', width, height]`
   (`'p'` painting, `'s'` studio photograph; width/height of the enhanced file).
3. Chapters and the wall layout are computed from that table.

## Notes

- three.js is pinned to 0.170.0. Colour management is switched off and light intensities
  are scaled by π so the room renders like the original prototype (three r128).
- Wall labels show the artist and year only; works have no titles yet.
- Respects `prefers-reduced-motion` (camera moves without easing).
