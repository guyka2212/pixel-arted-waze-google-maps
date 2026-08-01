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

2. The Google Maps API key comes from `api.env` (gitignored). For local runs it is baked into `config.js`:
   ```
   google-maps-api = YOUR_KEY
   ```
   Run the bake step (writes `config.js`):
   ```
   node -e "const fs=require('fs'),t=fs.readFileSync('api.env','utf8').split('=')[1].trim();fs.writeFileSync('config.js',\"window.GMAP_KEY = '\"+t+\"';\")"
   ```
   Or skip it and paste the key in the app: PIXEL button -> GMAPS KEY (saved in your browser).

3. Enable these Google APIs in Google Cloud Console: Places API, Directions API, and restrict the key to your domain. On GitHub Pages add your page URL as an allowed HTTP referrer.

## Deploy to GitHub Pages

The site is served at:
```
https://guyka2212.github.io/pixel-arted-waze-google-maps/
```

The repo is a static site: all asset links are relative and a `.nojekyll` file is included, so it works under the `/pixel-arted-waze-google-maps/` base path with zero configuration.

1. In GitHub: repo Settings -> Pages -> Source: **GitHub Actions**.
2. In GitHub: repo Settings -> Secrets and variables -> Actions -> **New repository secret**.
   - Name: `GMAPS_KEY`
   - Value: your Google Maps API key
3. Push to `main` (or run the workflow manually from the Actions tab). The `.github/workflows/deploy.yml` workflow:
   - stages only the site files (`index.html`, `style.css`, `script.js`, `.nojekyll`) into a `dist` folder,
   - injects the key from the secret into `dist/config.js`,
   - uploads and deploys to Pages.

Only the `dist` files go live. `api.env`, `config.js`, `Plan.md`, and the git folder are never uploaded, so your key never ships to the public site.

The key is loaded in the browser, so restrict it in Google Cloud Console -> API key -> Application restrictions -> HTTP referrers -> add `guyka2212.github.io/*`. Enable the Places and Directions APIs on the key. LocalStorage values are namespaced per-project (`pixel-nav:*`) because all `guyka2212.github.io` pages share one origin.

## Code rules

- No `//` comments
- No `#` characters
- No `""` double quotes - single quotes only
- Violations fail code review and CI
