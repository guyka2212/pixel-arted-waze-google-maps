# PIXEL NAV

A Waze / Google Maps style navigation app on a real-world **pixel art map**. Everything visual is pixel art, rendered in the browser from open OpenStreetMap tiles. Routing, search, and traffic data come from the Google Maps API.

Built on the pixel engine from [pixel-arted-real-map](https://github.com/guyka2212/pixel-arted-real-map).

Map data belongs to OpenStreetMap contributors.

## Features

- Pixel art world map (pixel size + color depth + scanlines settings)
- Live device location with retro pixel pin
- Place labels from Overpass + Photon
- Google Places search with autocomplete
- Google Directions routing with traffic-aware colors and alternative routes
- Turn-by-turn navigation (follow mode, maneuver banner, progress bar, off-route auto re-route)
- Waze-style reports: right-click the map, drop hazard / accident / police / camera / road work pins (stored locally, expire after 60 min)
- Works on web, iOS and Android (via WebView)

## Local setup

1. Serve the folder:
   ```
   python3 -m http.server 8080
   ```
   Open `http://localhost:8080`

2. The Google Maps API key lives in `api.env`:
   ```
   google-maps-api = YOUR_KEY
   ```
   The app loads the key in this order: `config.js` (injected at deploy) -> `api.env` (fetched from the server at runtime) -> GMAPS KEY saved in the browser. So for local runs just make sure `api.env` exists and it will be picked up automatically.

3. Enable these Google APIs in Google Cloud Console: Places API, Directions API, and restrict the key to your domain. On GitHub Pages add your page URL as an allowed HTTP referrer.

## Deploy to GitHub Pages

The site is served at:
```
https://guyka2212.github.io/pixel-arted-waze-google-maps/
```

The repo is a static site: all asset links are relative and a `.nojekyll` file is included, so it works under the `/pixel-arted-waze-google-maps/` base path with zero configuration.

1. In GitHub: repo Settings -> Pages -> Source: **GitHub Actions** (or **Deploy from a branch**, both work).
2. Push to `main`. `api.env` is committed and served on the site; the app fetches it at runtime and the key is loaded in the browser.

IMPORTANT SECURITY NOTE: because the key ships to the browser, anyone can read it. Restrict it in Google Cloud Console -> API key -> Application restrictions -> HTTP referrers -> add `guyka2212.github.io/*`, and only enable the Places and Directions APIs on it. Never use a key without referrer restrictions here.

Optional but recommended: instead of committing the key, set it as the `GMAPS_KEY` repository secret (Settings -> Secrets and variables -> Actions). The `.github/workflows/deploy.yml` then injects it into `dist/config.js`, and `api.env` stays out of the public site.

## Code rules

- No `//` comments
- No `#` characters
- No `""` double quotes - single quotes only
- Violations fail code review and CI
