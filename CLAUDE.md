# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

지하주차장 좌표 메모 앱 ("Underground Parking Lot Coordinate Memo App") — a single-page,
no-build, static web app for marking and annotating points (pins) on underground
parking garage floor plan images. There is no backend; all app logic lives in one
HTML file and data is persisted client-side.

## Repository layout

This is a flat, minimal static site — no `src/`, no package manager, no build tooling.

- `index.html` — the entire application: markup, CSS, and JS, all inline. This is
  the only source file.
- `4f.jpg`, `3f.jpg`, `2f.jpg` — floor plan images for basement levels 4, 3, and 2
  (3394x2400 JPEGs). Filenames are also used as the floor identifiers in code.
- `4f.json`, `3f.json`, `2f.json` — seed/fallback pin data per floor, shape:
  `{ "floor": "4f", "pins": [] }`. Each pin object (when present) has
  `{ id, x, y, label, note }` where `x`/`y` are percentages (0-100) of image
  width/height.

There is no `package.json`, no build step, and no test suite. Changes are made
directly to `index.html` and the static assets.

## Running locally

Just serve the directory statically and open it in a browser, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Opening `index.html` directly via `file://` will break the `fetch('<floor>.json')`
calls in most browsers due to CORS restrictions on local files — use a local
server instead.

## Architecture notes (`index.html`)

The script is a single IIFE with a global-ish `state` object. Key pieces:

- **Floors**: `FLOORS = ['4f', '3f', '2f']`, displayed as tabs (지하4층/3층/2층).
  Switching floors swaps the displayed image (`<floor>.jpg`) and pin set.
- **Data loading** (`ensureFloorLoaded`): for each floor, pins are loaded from
  `localStorage` (`parking_pins_v2_<floor>`) if present; otherwise they're fetched
  from `<floor>.json`. localStorage always wins once populated — the JSON files act
  only as initial/seed data, not as a synced source of truth.
- **Persistence**: `saveLocal(floor)` writes the current in-memory pins for a floor
  straight to `localStorage` on every add/edit/delete. There is no server-side
  persistence — the JSON files in the repo are NOT updated automatically when pins
  change in the browser.
- **Export/Import**: `exportBtn`/`importBtn` let users download/upload a combined
  JSON file (`{ "4f": {...}, "3f": {...}, "2f": {...} }`) covering all floors, for
  backup or transferring data between devices/browsers.
- **Modes**: `보기` (view), `지점 추가` (add pin), `메모 수정` (edit note),
  `지점 삭제` (delete pin) — controlled via `state.mode`, changes tap behavior on
  the floor plan.
- **Pan/zoom**: custom pointer-event-based pan and pinch-zoom implementation on the
  `.stage` element (no external library), with `clampPan`/`applyZoom`/`resetView`.
- **Search**: `doSearch` looks for a pin by label/note text across floors, switching
  floor and focusing/blinking the matching pin if found on another floor.

## Conventions

- Plain ES5-style JavaScript (`var`, function expressions) — no modules, no
  transpilation, no framework. Keep additions consistent with this style unless
  explicitly asked to modernize.
- All UI copy is in Korean; keep new user-facing strings in Korean to match the
  existing app.
- All styling is inline `<style>` in `index.html` — there is no separate CSS file.
- Keep the app dependency-free and buildless unless the user explicitly asks to
  introduce tooling (bundler, framework, package.json, etc.).
- Floor identifiers (`4f`, `3f`, `2f`) double as filenames for both the image and
  JSON data — if adding a floor, follow the same `<id>.jpg` / `<id>.json` pairing
  and add the id to `FLOORS`/`FLOOR_LABEL`.

## Git history note

Past commits show files (including `index.html`, `app.js`, `style.css`, floor
assets, `README.md`) were repeatedly deleted and re-uploaded via the GitHub web UI
("Add files via upload" / "Delete X"). The app was previously split into
`index.html` + `app.js` + `style.css` but is now consolidated into a single
`index.html`. There is no CI/CD configured for this repository.
