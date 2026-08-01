# Plan: Pixel Art Navigation App (Waze/Google Maps clone)

Build a turn-by-turn navigation + traffic app where **everything on the map is rendered in pixel art** from open, vector (GeoJSON) data. Google Maps API is used only for the "brains" (routing, geocoding, places, traffic), never for the visuals.

---

## 1. Vision & Goals

- A Waze-style app: live map, search, route planning, turn-by-turn navigation, ETA, traffic, crowdsourced reports.
- A Google Maps-style map: pan/zoom, search, place details.
- **Pixel art everywhere**: the base map (OSM raster tiles pixelated in-browser), markers, route lines, labels, pins — all chunky-pixel styled.
- Built on the existing open source pixel engine: **[github.com/guyka2212/pixel-arted-real-map](https://github.com/guyka2212/pixel-arted-real-map)** — a Leaflet app that pixelates OpenStreetMap raster tiles at runtime (downscale + posterize + nearest-neighbor upscale).
- Map data belongs to OpenStreetMap contributors; the pixel engine is our own open source renderer.
- Google Maps API used for **routing / search / traffic data only** (no Google tiles, no Google map visuals).

### Non-goals (v1)
- Real-time live traffic analytics from scratch (use Google Traffic or OSM-derived data).
- Full offline maps for v1 (add in v2).
- Turn-by-turn voice with background audio in v1 (add later).

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Map rendering | **Leaflet** + custom `PixelTileLayer` canvas engine (from existing repo) | Web-native, proven, keeps the exact pixel look |
| Pixel engine | Canvas: downscale to ~51px → posterize to 32 levels → nearest-neighbor upscale (existing `script.js`) | Real-time pixelation of any raster tile source |
| Base tiles | **OpenStreetMap raster tiles** (`{s}.tile.openstreetmap.org`) | Free, open data, works with the pixel engine as-is |
| App shell | **Expo (React Native)** + `react-native-web`; the Leaflet map runs inside a **WebView** on mobile | One pixel renderer for iOS/Android/Web; outer app UI (search, nav, settings) in RN |
| Place labels | Overpass API + Photon (already in the repo) | City/town/natural place labels, pixel-styled |
| Fonts | **Press Start 2P** (pixel font, already used) | Retro labels everywhere |
| Google APIs | **Directions**, **Geocoding**, **Places**, **Roads** via backend proxy | Nav brains only (routing, search, ETA, snap-to-road) |
| State/Data | Zustand + TanStack Query (web), or Jotai + SWR (RN) | Lightweight, shared logic |
| Auth | Supabase / Firebase Auth (optional v1) | Reports need user identity |
| Language | TypeScript everywhere | Shared types between engine and app |

---

## 3. Architecture Overview

```
                 ┌─────────────────────────────┐
                 │   APP SHELL (Expo / RN + web)│  ← search, nav, settings UI
                 └──────────────┬──────────────┘
                 ┌──────────────┴──────────────┐
                 │   PIXEL MAP (Leaflet)        │  ← canvas pixel engine
                 └──────────────┬──────────────┘
                 ┌──────────────┴──────────────┐
                 │  OSM raster tiles (free)     │  ← base map data
                 └─────────────────────────────┘

        ┌───────────────────────────────┐
        │  Google Maps API (no visuals) │  ← routing, search, traffic data
        │  (via /api backend proxy)     │
        └───────────────────────────────┘

        ┌───────────────────────────────┐
        │  Overpass + Photon            │  ← place labels (open source)
        └───────────────────────────────┘
```

### Data flow
1. OSM raster tiles load into Leaflet exactly as today; the `PixelTileLayer` (existing repo code) pixelates each tile on a canvas: downscale by `pixelScale` (default 5), quantize to `posterize` color levels (default 32), upscale back with `imageSmoothingEnabled = false`.
2. Place labels stream from Overpass (`node['place']…`) + Photon, drawn with the `Press Start 2P` pixel font (existing repo code).
3. On mobile, the whole Leaflet app runs inside a React Native **WebView** — pixel rendering stays byte-identical across platforms.
4. Google APIs (via backend proxy) provide search (Places), routing (Directions), snap-to-road (Roads), traffic ETA. Returned polylines are rendered on the pixel map as chunky pixel route lines.
5. Waze-style report pins are drawn the same way as the existing location pin (`makePinDataUrl` — a low-res canvas upscaled 4×).

### Why raster-pixelation instead of GeoJSON/vector
- The pixel engine already exists and works (the real map repo). No rewrite needed.
- Real-time pixelation works with **any** raster tiles — swap OSM for another source later without touching the engine.
- Keeps the whole map visual 100% open source (OSM data + our canvas code).

---

## 4. Pixel Art Style Guide

The pixel look comes from the existing canvas engine (not hand-drawn tiles). Tune these knobs:

- **Pixel scale** (existing setting, default 5): tile is downscaled to `256 / scale` px, then upscaled back — bigger value = chunkier pixels.
- **Color depth / posterize** (existing setting, default 32): channel values snapped to `floor(v / step) * step` where `step = 256 / levels` — lower = more retro palette.
- **Scanlines** (existing setting): optional CRT overlay for extra retro feel.
- **Nearest-neighbor upscale**: `imageSmoothingEnabled = false` everywhere (already in the repo) — no blur, ever.
- **Pixel font**: `Press Start 2P` for all labels, place names, HUD, and UI text (already in the repo).
- **Icons**: any pixel icon (car, route marker, report pins, POIs) is drawn on a low-res canvas (16×16) and upscaled 4× with nearest-neighbor — the same technique as the existing location pin `makePinDataUrl`.
- **Route line**: draw the Google Directions polyline on an overlay canvas with chunky rounded segments snapped to the same visual grid; traffic-jammed segments tinted red/orange.
- **Optional accent palette** (keep pixel roads recognizable on OSM base):
  - Route line `#3b8ff2`, traffic jam `#e5533c`, free `#2bd97f`
  - Hazard report `#ff4d5a`, police `#3b82f6`, camera `#a855f7`, construction `#f59e0b`
- Keep zoom behavior: pixelation constant per tile is fine; reduce label density at low zoom (existing `minZoom` gate at z4).

---

## 5. Google Maps API Integration (backend proxy)

Never call Google APIs from the client with a public key. Build a thin backend proxy (Node/Express or Cloudflare Worker):

| Endpoint | Google API | Used for |
|---|---|---|
| `/api/search` | Places API (Text Search / Autocomplete) | Search box, place results |
| `/api/place/:id` | Places Details | Place info panel |
| `/api/route` | Routes API or Directions API | Route polyline, legs, duration, distance |
| `/api/snap` | Roads API (`nearestRoads`) | Snap raw GPS tracks to road for Waze-style driving lines |
| `/api/traffic` | Directions API traffic_model | ETA with traffic, per-leg congestion |

- Server-side API key kept in env vars / secret manager.
- **Key storage**: the Google Maps API key lives in a gitignored `api.env` file at the repo root. The `api` package loads `api.env` on startup (via dotenv-style loader) and never exposes it to the client.
- Client sends only search/route requests; polyline is returned and drawn as a **pixel-art route line** on our MapLibre map.
- Cache identical route/search queries (Redis or in-memory TTL) to cut API cost.

---

## 6. App Screens & Features (v1)

1. **Map screen** (home)
   - Pixel map pan/zoom, device location, heading
   - Route preview, alternative routes
   - Traffic overlay toggle (colored road segments from Directions `traffic_model`)
   - Waze-style report pins (hazard, police, accident, camera) tapped → modal
2. **Search screen**
   - Google Places autocomplete → results list → place detail → "Navigate"
3. **Navigation screen**
   - Full-screen nav: turn-by-turn banner, next maneuver icon (pixel sprite), distance/ETA
   - Step list, progress bar, lane guidance (from Directions)
   - Re-route on deviation (silent background re-route every N seconds when off-path)
   - Pixel-art car sprite oriented by heading
4. **Reports (Waze-like)**
   - Tap map → report type picker (hazard, accident, police, construction, speed camera)
   - Reports stored in Supabase/self-hosted DB, rendered as pixel pins; expiring (e.g. 60 min)
   - Upvote/dismiss reports
5. **Settings**
   - Units, voice prompt toggle, theme (day/night pixel palettes), tile source, offline download (v2)

---

## 7. Repo / Project Structure

```
repo/
├─ packages/
│  ├─ app/                 # Expo app (iOS + Android + Web) — screens + WebView host
│  ├─ pixel-map/           # The existing Leaflet pixel engine (fork/submodule of
│  │                       #   github.com/guyka2212/pixel-arted-real-map) + our
│  │                       #   new nav/search/report overlays
│  ├─ api/                 # Backend proxy for Google APIs + report API (loads api.env)
│  └─ shared/              # Shared types + helpers (route models, report schema)
├─ api.env                 # Google Maps API key (gitignored, NOT committed)
├─ docs/                   # Style guide, integration docs
└─ Plan.md
```

- `packages/pixel-map` is the source of truth for all map visuals: `script.js` (PixelTileLayer, pins, labels) and `style.css` (retro theme). The web app IS this package; the RN app embeds it via WebView.
- `api.env` is added to `.gitignore` — the key must never be committed or pushed.

---

## 8. Milestones

### Phase 0 — Foundation (1 week)
- [ ] Fork/import the pixel map repo into `packages/pixel-map`; confirm it runs locally (web)
- [ ] Scaffold Expo app (RN + web) with TypeScript, monorepo (npm workspaces)
- [ ] Embed the Leaflet app in a React Native WebView; verify identical pixel rendering
- [ ] Google Cloud project + enable Directions/Places/Roads/Geocoding; create `/api` proxy service

### Phase 1 — Pixel map integration & polish (1–2 weeks)
- [ ] Wire `api.env` loading into `packages/api`
- [ ] Add traffic-colored route polyline overlay to the Leaflet engine
- [ ] Add pixel car marker (rotating by heading), destination pin, start pin
- [ ] Place-label density tuning across zoom (existing Overpass/Photon, add throttle)
- [ ] Screenshot-compare pixel output across zoom levels on web + phone

### Phase 2 — Search + Routing (2–3 weeks)
- [ ] Proxy endpoints: search, place details, route (Directions), snap (Roads)
- [ ] Search UI: autocomplete dropdown → place card (pixel font styling)
- [ ] Route UI: draw pixel route line, alternatives, ETA card, tap-to-navigate
- [ ] Route line animation (pixel dashes marching along path)

### Phase 3 — Navigation (3–4 weeks)
- [ ] Navigation engine: follow mode, heading-based car rotation, auto-zoom
- [ ] Turn-by-turn instructions from Directions steps (maneuver icon sprites)
- [ ] Progress bar, distance/ETA, arrival detection
- [ ] Off-route detection + automatic re-route
- [ ] Traffic: per-leg congestion colors + ETA via `traffic_model`

### Phase 4 — Waze features (3–4 weeks)
- [ ] Reports DB (Supabase schema: type, lat/lng, user, expiry, votes)
- [ ] Add-report flow (tap map → pick type), render pixel pins, expiry sweep
- [ ] Upvote / confirm / dismiss reports
- [ ] Login (optional): saves reports, syncs favorites
- [ ] Settings screen (units, day/night palette, sound)

### Phase 5 — Hardening & launch (2–3 weeks)
- [ ] Offline tile caching (MapLibre offline / cached PMTiles) — v2 feature, but design hooks now
- [ ] Performance: sprite atlasing, tile pruning, memory on mobile
- [ ] Battery/GPS: location batching, geofenced re-routing
- [ ] E2E tests on web (Playwright) + smoke tests on device
- [ ] Store/web deployment (EAS Build, Vercel/Cloudflare for web + API)
- [ ] Cost dashboard for Google API usage; quota alerts

**Total: ~3–4 months part-time.**

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Google Directions only works on their road graph | Accept; use Road API snap + our pixel map for display only |
| Pixelation doubles every tile's canvas work | Offscreen canvas reuse, tile caching, lower `pixelScale` on mobile WebView |
| OSM tile usage policy (heavy load) | Respect tile limits, cache aggressively, keep `minZoom`/`maxZoom` sane |
| WebView perf on old devices | Keep map JS lean, disable scanlines by default on mobile, test on mid-range device |
| Google API cost | Cache, quota limits, `traffic_model=best_guess` sparingly, free tier first |
| React Native + Web drift | Map logic lives only in the Leaflet package; RN shell only calls it via bridge |

---

## 10. Code Rules (hard constraints)

1. **No `//` comments** — never write `//` in code. No inline, block-line, or trailing slashes.
2. **No `#` characters** — never write `#` in code (no hash-style comments, no hashes of any kind).
3. **No `""` double quotes** — never write `"` or `""` in code. Use single quotes `'` for strings only.
4. Violations are a hard fail in code review and CI lint.
5. These rules apply to all packages (`app`, `pixel-map`, `api`, `shared`) and all config source files. Exceptions: none. Plain data files such as this document are not code and are excluded.

---

## 11. Immediate Next Steps

1. Fork/import the pixel map repo into `packages/pixel-map` and confirm it runs locally (web).
2. Scaffold the monorepo (`packages/app`, `packages/pixel-map`, `packages/api`, `packages/shared`) with Expo.
3. Embed the Leaflet pixel app in a React Native WebView; confirm identical rendering on phone + web.
4. Enable Google Directions/Places/Roads, put the key in `api.env`, and build the `/api/route` proxy returning a polyline.
5. Then begin the pixel route/car overlay (Phase 1).
