# PIXEL NAV

A Waze / Google Maps style navigation app on a real-world **pixel art map**. Everything visual is pixel art, rendered in the browser from open OpenStreetMap tiles. **No Google, no credit card, fully free.**

Built on the pixel engine from [pixel-arted-real-map](https://github.com/guyka2212/pixel-arted-real-map).

Map data belongs to OpenStreetMap contributors.

## Features

- Pixel art world map (pixel size + color depth + scanlines settings)
- Live device location with retro pixel pin
- Place labels from Overpass + Photon
- Place search via Photon (free, no API key)
- Route planning via OpenRouteService (free tier)
- Turn-by-turn navigation (follow mode, maneuver banner, progress bar, off-route auto re-route)
- Waze-style reports: right-click the map, drop hazard / accident / police / camera / road work pins (stored locally, expire after 60 min)
- Works on web, iOS and Android (via WebView)

## How it is free (no credit card)

| Service | Used for | Cost |
|---|---|---|
| OpenStreetMap tiles | base map | free |
| Overpass API | place labels | free |
| Photon | place search | free |
| OpenRouteService | driving directions | free key, no card |

## Setup

1. Serve the folder:
   ```
   python3 -m http.server 8080
   ```
   Open `http://localhost:8080`

2. Get a free OpenRouteService key (no credit card):
   - Go to https://openrouteservice.org -> Sign in / register
   - Create a personal token (free plan)
   - Put it in `api.env`:
   ```
   openrouteservice-api = YOUR_ORS_KEY
   ```
   The app loads the key in this order: `api.env` (fetched from the server at runtime) -> ORS KEY saved in the browser (PIXEL button -> ORS KEY). Search works with no key at all.

## Deploy to GitHub Pages

The site is served at:
```
https://guyka2212.github.io/pixel-arted-waze-google-maps/
```

1. In GitHub: repo Settings -> Pages -> Source: **GitHub Actions** (or **Deploy from a branch**, both work).
2. Push to `main`. `api.env` is committed and served on the site; the app fetches it at runtime.

NOTE: your OpenRouteService key is public on the site. The free plan's 40 requests/min limit is the only guard — fine for a demo app.

## Code rules

- No `//` comments
- No `#` characters
- No `""` double quotes - single quotes only
- Violations fail code review and CI
