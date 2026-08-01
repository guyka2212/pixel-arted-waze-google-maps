(() => {
  'use strict';

  const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const OSM_SUBDOMAINS = 'abc';

  const q = (sel) => document.querySelector(sel);

  const els = {
    map: q('.map'),
    lat: q('.hud-lat'),
    lng: q('.hud-lng'),
    zoom: q('.hud-zoom'),
    body: document.body,
    toast: q('.toast'),
    btnLocate: q('.btn-locate'),
    btnSettings: q('.btn-settings'),
    btnCloseSettings: q('.btn-close-settings'),
    settings: q('.settings'),
    scaleEl: q('.pixel-scale'),
    scaleVal: q('.pixel-scale-val'),
    levelsEl: q('.pixel-levels'),
    levelsVal: q('.pixel-levels-val'),
    scanlines: q('.scanlines'),
    splash: q('.splash'),
  };

  const map = L.map(els.map, {
    zoomControl: false,
    attributionControl: false,
    minZoom: 2,
    maxZoom: 19,
    worldCopyJump: true,
  }).setView([20, 0], 2);

  const PixelTileLayer = L.TileLayer.extend({
    createTile(coords, done) {
      const size = this.getTileSize();
      const canvas = document.createElement('canvas');
      canvas.width = size.x;
      canvas.height = size.y;
      canvas.setAttribute('role', 'presentation');

      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.alt = '';
      img.onload = () => {
        try {
          drawPixel(canvas, img, this.options.pixelScale, this.options.posterize);
          done(null, canvas);
        } catch (err) {
          done(err);
        }
      };
      img.onerror = () => done(new Error('tile load failed'));
      img.src = this.getTileUrl(coords);
      return canvas;
    },
  });

  const tiles = new PixelTileLayer(OSM_URL, {
    subdomains: OSM_SUBDOMAINS,
    minZoom: 2,
    maxZoom: 19,
    maxNativeZoom: 19,
    crossOrigin: true,
    pixelScale: 5,
    posterize: 32,
    attribution: '&copy; <a href=\'https://www.openstreetmap.org/copyright\'>OpenStreetMap</a> contributors',
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

  function drawPixel(canvas, img, scale, posterize) {
    const w = canvas.width;
    const h = canvas.height;
    const pw = Math.max(2, Math.round(w / scale));
    const ph = Math.max(2, Math.round(h / scale));

    const mini = document.createElement('canvas');
    mini.width = pw;
    mini.height = ph;
    const mctx = mini.getContext('2d');
    mctx.imageSmoothingEnabled = false;
    mctx.drawImage(img, 0, 0, pw, ph);

    if (posterize && posterize < 256) {
      try {
        const data = mctx.getImageData(0, 0, pw, ph);
        const d = data.data;
        const step = 256 / posterize;
        for (let i = 0; i < d.length; i += 4) {
          d[i] = Math.floor(d[i] / step) * step;
          d[i + 1] = Math.floor(d[i + 1] / step) * step;
          d[i + 2] = Math.floor(d[i + 2] / step) * step;
        }
        mctx.putImageData(data, 0, 0);
      } catch (e) {}
    }

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mini, 0, 0, w, h);
  }

  function pinPath(ctx, cx, cy, r, tipY) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.45);
    ctx.lineTo(cx - r * 0.95, tipY);
    ctx.lineTo(cx + r * 0.95, tipY);
    ctx.closePath();
    ctx.fill();
  }

  function makePinDataUrl(pixels, color) {
    const low = document.createElement('canvas');
    low.width = low.height = pixels;
    const lx = low.getContext('2d');
    lx.imageSmoothingEnabled = false;

    const cx = pixels / 2;
    const cy = pixels * 0.4;
    const r = pixels * 0.3;
    const tipY = pixels - 2;

    lx.fillStyle = 'rgb(17, 17, 17)';
    pinPath(lx, cx, cy, r + 0.9, tipY + 0.6);
    lx.fillStyle = color;
    pinPath(lx, cx, cy, r, tipY);
    lx.fillStyle = 'rgb(0, 0, 0)';
    lx.beginPath();
    lx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    lx.closePath();
    lx.fill();
    lx.fillStyle = 'rgba(255, 255, 255, .6)';
    lx.fillRect(cx - r * 0.7, cy - r * 0.55, r * 0.45, r * 0.3);

    const out = document.createElement('canvas');
    const size = pixels * 4;
    out.width = out.height = size;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, size, size);
    return out.toDataURL();
  }

  const PIN = makePinDataUrl(16, 'rgb(255, 77, 90)');

  function makeCarDataUrl(pixels, color) {
    const low = document.createElement('canvas');
    low.width = low.height = pixels;
    const lx = low.getContext('2d');
    const u = pixels / 8;

    lx.fillStyle = 'rgb(17, 17, 17)';
    lx.fillRect(0, 0, pixels, pixels);
    lx.fillStyle = color;
    lx.fillRect(u, u * 2, u * 6, u * 4);
    lx.fillRect(u * 2, u, u * 4, u * 2);
    lx.fillStyle = 'rgb(43, 217, 127)';
    lx.fillRect(u * 2, u * 3, u * 2, u * 2);
    lx.fillRect(u * 4, u * 3, u * 2, u * 2);

    const out = document.createElement('canvas');
    const size = pixels * 3;
    out.width = out.height = size;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, size, size);
    return out.toDataURL();
  }

  const CAR = makeCarDataUrl(16, 'rgb(0, 191, 255)');

  const playerIcon = L.divIcon({
    className: 'player-div',
    html: `<div class='player-ring'></div><div class='player-ring player-ring2'></div><div class='player-bounce'><img src='${PIN}' width='48' height='48' alt='you are here' /></div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 45],
    popupAnchor: [0, -42],
  });

  const player = L.marker([0, 0], { icon: playerIcon, zIndexOffset: 1000, interactive: false });
  const accuracy = L.circle([0, 0], {
    radius: 0,
    color: 'rgb(34, 197, 94)',
    weight: 2,
    fillColor: 'rgb(34, 197, 94)',
    fillOpacity: 0.08,
    interactive: false,
    className: 'accuracy-path',
  });
  const playerGroup = L.layerGroup([player, accuracy]).addTo(map);

  let firstFix = true;
  let hasPlayer = false;

  function placePlayer(latlng, acc, label, fly, open) {
    player.setLatLng(latlng);
    if (acc > 0) {
      accuracy.setLatLng(latlng).setRadius(acc);
    }
    player.bindPopup(
      `<div class='pixel-popup'>${label}<span class='dim'>${latlng.lat.toFixed(4)} , ${latlng.lng.toFixed(4)}</span></div>`,
      { closeButton: true, offset: [0, -6] }
    );
    if ((firstFix && fly) || open) {
      player.openPopup();
      firstFix = false;
      setTimeout(() => player.closePopup(), 4000);
    }
    hasPlayer = true;
    updateHud(latlng);
    hideToast();
    if (fly) {
      map.flyTo(latlng, Math.max(map.getZoom(), 16), { duration: 1.4 });
    }
  }

  function updateHud(latlng) {
    els.lat.textContent = latlng.lat.toFixed(4);
    els.lng.textContent = latlng.lng.toFixed(4);
  }

  function refreshHud() {
    els.zoom.textContent = map.getZoom();
    if (hasPlayer) {
      updateHud(player.getLatLng());
    } else {
      updateHud(map.getCenter());
    }
  }
  map.on('move', refreshHud);

  function locateMe() {
    if (!navigator.geolocation) {
      showToast('GEOLOCATION NOT SUPPORTED.\nCLICK THE MAP TO PLACE A MARKER.');
      return;
    }
    showToast('LOCATING...', 2500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        placePlayer(L.latLng(latitude, longitude), acc, 'YOU ARE HERE', true);
      },
      (err) => {
        let msg = 'CANNOT GET POSITION.';
        if (err.code === err.PERMISSION_DENIED) msg = 'LOCATION BLOCKED BY THE BROWSER.';
        else if (err.code === err.TIMEOUT) msg = 'LOCATION TIMED OUT.';
        showToast(msg + '\nCLICK THE MAP TO PLACE A MARKER.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  els.btnLocate.addEventListener('click', locateMe);

  let toastTimer;
  function showToast(msg, ms) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms || 4500);
  }
  function hideToast() {
    els.toast.classList.add('hidden');
  }

  let splashHidden = false;
  function hideSplash() {
    if (splashHidden) return;
    splashHidden = true;
    els.body.classList.add('map-ready');
    els.splash.classList.add('hidden');
  }
  tiles.once('load', hideSplash);
  setTimeout(hideSplash, 8000);

  function applyTileSettings() {
    tiles.options.pixelScale = Number(els.scaleEl.value);
    tiles.options.posterize = Number(els.levelsEl.value);
    els.scaleVal.textContent = els.scaleEl.value;
    els.levelsVal.textContent = els.levelsEl.value;
    tiles.redraw();
  }

  els.scaleEl.addEventListener('input', applyTileSettings);
  els.levelsEl.addEventListener('input', applyTileSettings);
  els.scanlines.addEventListener('change', () => {
    els.body.classList.toggle('scan', els.scanlines.checked);
  });
  els.btnSettings.addEventListener('click', () => els.settings.classList.toggle('hidden'));
  els.btnCloseSettings.addEventListener('click', () => els.settings.classList.add('hidden'));

  const PLACE_OK = ['city', 'town', 'municipality', 'village', 'borough', 'island', 'suburb', 'neighbourhood', 'quarter', 'square', 'locality', 'hamlet', 'farm', 'islet', 'isolated_dwelling'];
  const NATURAL_OK = ['peak', 'mountain', 'volcano', 'hill', 'cape', 'bay', 'island', 'islet'];

  function placeRankFor(value) {
    const n = { peak: 2, mountain: 2, volcano: 2, hill: 3, cape: 3, bay: 3, island: 2, islet: 4 };
    if (n[value] !== undefined) return n[value];
    const p = {
      city: 0,
      town: 1,
      municipality: 1,
      village: 2,
      borough: 2,
      island: 2,
      suburb: 3,
      neighbourhood: 3,
      quarter: 3,
      square: 3,
      locality: 4,
      hamlet: 4,
      farm: 4,
      islet: 4,
      isolated_dwelling: 4,
    };
    return p[value] === undefined ? 3 : p[value];
  }

  function placeRank(tags) {
    return placeRankFor(tags.natural || tags.place);
  }

  const OVERPASS_URLS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
    'https://overpass.kaart.com/api/interpreter',
    'https://overpass.nchc.org.tw/api/interpreter',
  ];

  let placesLayer = null;
  let placesTimer = null;
  let placesAbort = null;

  function fetchWithTimeout(url, opts, ms) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), ms);
      fetch(url, opts)
        .then((res) => { clearTimeout(timer); resolve(res); })
        .catch((err) => { clearTimeout(timer); reject(err); });
    });
  }

  const RANK_COLORS = [
    'rgb(0, 0, 0)',
    'rgb(0, 0, 0)',
    'rgb(0, 0, 0)',
    'rgb(0, 0, 0)',
    'rgb(0, 0, 0)',
  ];
  const RANK_PX = [9, 9, 8, 8, 7];

  function placeIcon(color) {
    return L.divIcon({
      className: 'place-pixel-icon',
      html: `<div style='--pc:${color}'></div>`,
      iconSize: [5, 5],
      iconAnchor: [2, 2],
    });
  }

  function pixelLabelCanvas(name, rank) {
    const color = RANK_COLORS[rank] || RANK_COLORS[3];
    const fontSize = RANK_PX[rank] || 8;
    const probe = document.createElement('canvas');
    const pctx = probe.getContext('2d');
    const font = `${fontSize}px 'Press Start 2P', monospace`;
    pctx.font = font;
    const textW = Math.ceil(pctx.measureText(name).width);
    const padX = 4;
    const padY = 2;
    const boxH = fontSize + padY * 2;
    const lowW = textW + padX * 2;
    const lowH = boxH;
    const low = document.createElement('canvas');
    low.width = lowW;
    low.height = lowH;
    const lx = low.getContext('2d');
    lx.font = font;
    lx.textBaseline = 'top';
    const textX = Math.round((lowW - textW) / 2);
    lx.fillStyle = 'rgba(0, 0, 0, .85)';
    lx.fillText(name, textX + 1, padY + 1);
    lx.fillStyle = color;
    lx.fillText(name, textX, padY);
    const scale = 2;
    const out = document.createElement('canvas');
    out.width = lowW * scale;
    out.height = lowH * scale;
    out.className = 'pixel-label';
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, out.width, out.height);
    return out;
  }

  function addPlaceLabel(latlng, name, rank) {
    const label = pixelLabelCanvas(name, rank);
    const marker = L.marker(latlng, {
      interactive: false,
      keyboard: false,
      icon: placeIcon(RANK_COLORS[rank] || RANK_COLORS[3]),
    });
    marker.bindTooltip(label, {
      permanent: true,
      direction: 'top',
      className: 'place-tooltip pl-' + rank,
      offset: [1, Math.round(label.height / 2) + 6.5],
    });
    return marker;
  }

  let placesData = null;
  function redrawPlaces() {
    if (placesData) placesData.render();
  }

  function renderPlaceItems(items, maxCount) {
    items.sort((a, b) => (a.rank - b.rank) || (a.dist - b.dist));
    if (placesLayer) placesLayer.clearLayers();
    placesLayer = L.layerGroup().addTo(map);
    const seen = new Set();
    for (const item of items.slice(0, maxCount)) {
      const key = item.rank + ':' + item.name;
      if (seen.has(key)) continue;
      seen.add(key);
      placesLayer.addLayer(addPlaceLabel(item.latlng, item.name, item.rank));
    }
  }

  function renderPlaces(json, center) {
    placesData = { render: () => renderPlaces(json, center) };
    const items = [];
    for (const el of json.elements || []) {
      if (!el.tags) continue;
      const name = el.tags['name:en'] || el.tags.name;
      if (!name) continue;
      const hasPt = el.lat !== undefined && el.lat !== null;
      const hasCenter = el.center && el.center.lat !== undefined && el.center.lon !== undefined;
      if (!hasPt && !hasCenter) continue;
      const latlng = hasPt ? [el.lat, el.lon] : [el.center.lat, el.center.lon];
      const rank = placeRank(el.tags);
      items.push({ name: name, rank: rank, dist: map.distance(center, latlng), latlng: latlng });
    }
    renderPlaceItems(items, 40);
  }

  function renderPhotonPlaces(json, center) {
    placesData = { render: () => renderPhotonPlaces(json, center) };
    const items = [];
    for (const f of json.features || []) {
      const props = f.properties || {};
      const name = props.name;
      if (!name) continue;
      const value = props.osm_value;
      if (props.osm_key === 'place' && PLACE_OK.indexOf(value) < 0) continue;
      if (props.osm_key === 'natural' && NATURAL_OK.indexOf(value) < 0) continue;
      if (props.osm_key !== 'place' && props.osm_key !== 'natural') continue;
      const coords = f.geometry && f.geometry.coordinates;
      if (!coords || coords.length < 2) continue;
      const latlng = [coords[1], coords[0]];
      const rank = placeRankFor(value);
      items.push({ name: name, rank: rank, dist: map.distance(center, latlng), latlng: latlng });
    }
    renderPlaceItems(items, 40);
  }

  function loadPlaces(center, zoom) {
    if (zoom < 4) return;
    if (placesAbort) placesAbort.abort();
    placesAbort = new AbortController();
    const signal = placesAbort.signal;
    const radius = Math.round(Math.max(2000, Math.min(400000, 400000 / Math.pow(2, zoom - 4))));
    let resolved = false;
    const finish = (fn) => {
      if (!signal.aborted && !resolved) {
        resolved = true;
        fn();
      }
    };
    const query = `[out:json][timeout:20];(node['place'](around:${radius},${center.lat},${center.lng});way['place'](around:${radius},${center.lat},${center.lng});node['natural'~'(peak|mountain|hill|volcano|cape|bay|island|islet)'](around:${radius},${center.lat},${center.lng}););out center tags;`;
    const opts = { method: 'POST', body: 'data=' + encodeURIComponent(query), signal: signal };
    const targets = [OVERPASS_URLS[0], OVERPASS_URLS[0]].concat(OVERPASS_URLS.slice(1));
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const attempt = (i, tries) => {
      if (signal.aborted) return;
      if (i >= targets.length) {
        if (tries < 4 && !signal.aborted) {
          delay(8000).then(() => attempt(0, tries + 1));
        }
        return;
      }
      fetchWithTimeout(targets[i], opts, 12000)
        .then((res) => {
          if (!res.ok) throw new Error('bad status');
          return res.json();
        })
        .then((json) => {
          finish(() => renderPlaces(json, center));
        })
        .catch((err) => {
          if (!signal.aborted && err.name !== 'AbortError') {
            delay(2000).then(() => attempt(i + 1, tries));
          }
        });
    };
    attempt(0, 0);

    const url = `https://photon.komoot.io/reverse?lon=${center.lng}&lat=${center.lat}&limit=40&lang=en&layer=locality&layer=city&layer=district&layer=county&layer=state&layer=country&layer=other`;
    fetchWithTimeout(url, { signal: signal }, 15000)
      .then((res) => {
        if (!res.ok) throw new Error('bad status');
        return res.json();
      })
      .then((json) => {
        finish(() => renderPhotonPlaces(json, center));
      })
      .catch(() => {});
  }

  function schedulePlaces() {
    clearTimeout(placesTimer);
    if (map.getZoom() < 4) {
      if (placesLayer) placesLayer.clearLayers();
      return;
    }
    placesTimer = setTimeout(() => loadPlaces(map.getCenter(), map.getZoom()), 300);
  }
  map.on('moveend', schedulePlaces);

  refreshHud();
  schedulePlaces();
  locateMe();

  if (document.fonts && document.fonts.load) {
    document.fonts.load(`9px 'Press Start 2P'`).then(redrawPlaces).catch(() => {});
  }

  const LS_KEY = 'pixel-nav:key';
  const LS_REPORTS = 'pixel-nav:reports';

  let gkey = (window.GMAP_KEY || localStorage.getItem(LS_KEY) || '').trim();

  fetch('api.env')
    .then((r) => {
      if (!r.ok) throw new Error('no env');
      return r.text();
    })
    .then((t) => {
      const m = t.match(/google-maps-api[ \t]*=[ \t]*([^ \t\r\n]+)/);
      if (m && !gkey) gkey = m[1];
    })
    .catch(() => {});

  const keyEl = q('.gmap-key');
  keyEl.value = localStorage.getItem(LS_KEY) || '';
  keyEl.addEventListener('change', () => {
    const v = keyEl.value.trim();
    localStorage.setItem(LS_KEY, v);
    gkey = v || (window.GMAP_KEY || '');
    if (gkey) loadGmaps();
    showToast(gkey ? 'KEY SAVED' : 'KEY CLEARED');
  });

  let gapiReady = null;
  let gapiLoading = false;

  function loadGmaps() {
    if (gapiReady || gapiLoading) return;
    if (!gkey) {
      showToast('ENTER A GMAPS KEY IN SETTINGS');
      return;
    }
    gapiLoading = true;
    const s = document.createElement('script');
    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(gkey) + '&libraries=places&v=weekly&callback=__ginit';
    s.async = true;
    document.body.appendChild(s);
  }

  window.__ginit = () => {
    gapiReady = window.google;
    gapiLoading = false;
  };

  window.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'SCRIPT' && gapiLoading) {
      gapiLoading = false;
      showToast('GOOGLE MAPS FAILED TO LOAD. CHECK KEY.');
    }
  }, true);

  const searchInput = q('.search-input');
  const searchResults = q('.search-results');
  let searchTimer = null;

  function doSearch(text) {
    searchResults.classList.add('hidden');
    if (!text) return;
    if (!gkey) {
      showToast('ENTER A GMAPS KEY IN SETTINGS');
      return;
    }
    loadGmaps();
    if (!gapiReady) {
      showToast('GMAPS LOADING...');
      return;
    }
    const svc = new google.maps.places.AutocompleteService();
    svc.getPlacePredictions({ input: text, language: 'en' }, (preds, status) => {
      if (status !== 'OK' || !preds) return;
      searchResults.innerHTML = '';
      preds.slice(0, 6).forEach((p) => {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'search-result';
        d.textContent = p.description;
        d.addEventListener('click', () => pickPlace(p));
        searchResults.appendChild(d);
      });
      searchResults.classList.remove('hidden');
    });
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const v = searchInput.value;
    searchTimer = setTimeout(() => doSearch(v), 350);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(searchTimer);
      doSearch(searchInput.value);
    }
  });

  let destMarker = null;

  function destIcon() {
    return L.divIcon({
      className: 'report-div',
      html: `<img src='${makePinDataUrl(16, 'rgb(0, 191, 255)')}' width='40' height='40' />`,
      iconSize: [40, 40],
      iconAnchor: [20, 36],
    });
  }

  function pickPlace(pred) {
    searchResults.classList.add('hidden');
    loadGmaps();
    if (!gapiReady) return;
    const svc = new google.maps.places.PlacesService(document.createElement('div'));
    svc.getDetails({ placeId: pred.place_id, fields: ['name', 'formatted_address', 'geometry', 'rating'] }, (place, status) => {
      if (status !== 'OK' || !place || !place.geometry) {
        showToast('PLACE NOT FOUND');
        return;
      }
      const latlng = [place.geometry.location.lat(), place.geometry.location.lng()];
      if (destMarker) map.removeLayer(destMarker);
      destMarker = L.marker(latlng, { icon: destIcon() }).addTo(map);
      map.flyTo(latlng, Math.max(map.getZoom(), 14), { duration: 1 });
      showPlaceCard(place, latlng);
    });
  }

  const placeCard = q('.place-card');
  const placeName = q('.place-name');
  const placeAddr = q('.place-addr');
  let currentDest = null;

  function showPlaceCard(place, latlng) {
    currentDest = { name: place.name, addr: place.formatted_address, latlng: latlng };
    placeName.textContent = place.name;
    placeAddr.textContent = place.formatted_address || '-';
    placeCard.classList.remove('hidden');
  }

  function clearPlace() {
    placeCard.classList.add('hidden');
    if (destMarker) {
      map.removeLayer(destMarker);
      destMarker = null;
    }
    currentDest = null;
  }

  q('.btn-close-place').addEventListener('click', clearPlace);
  q('.btn-go').addEventListener('click', buildRoute);

  function fmtDist(m) {
    return m >= 1000 ? (m / 1000).toFixed(1) + ' KM' : m + ' M';
  }
  function fmtMin(s) {
    return s >= 60 ? Math.round(s / 60) + ' MIN' : Math.round(s) + ' S';
  }

  function decodePolyline(str) {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coords = [];
    while (index < str.length) {
      let result = 0;
      let shift = 0;
      let b;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 31) << shift;
        shift += 5;
      } while (b >= 32);
      lat += (result & 1 ? ~(result >> 1) : result >> 1);
      result = 0;
      shift = 0;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 31) << shift;
        shift += 5;
      } while (b >= 32);
      lng += (result & 1 ? ~(result >> 1) : result >> 1);
      coords.push([lat / 1e5, lng / 1e5]);
    }
    return coords;
  }

  function routeColor(step) {
    const free = step.duration && step.duration.value;
    const traf = step.duration_in_traffic && step.duration_in_traffic.value;
    if (!free || !traf) return 'rgb(59, 130, 246)';
    const r = traf / free;
    if (r < 1.25) return 'rgb(43, 217, 127)';
    if (r < 1.5) return 'rgb(245, 197, 66)';
    if (r < 2) return 'rgb(245, 158, 11)';
    return 'rgb(229, 83, 60)';
  }

  function getOrigin() {
    if (hasPlayer) return new google.maps.LatLng(player.getLatLng().lat, player.getLatLng().lng);
    const c = map.getCenter();
    return new google.maps.LatLng(c.lat, c.lng);
  }

  let routeLayer = null;
  let routeLayers = [];
  let currentRoutes = null;
  let selectedRoute = 0;
  let routeDashTimer = null;
  let navActive = false;

  function buildRoute() {
    if (!currentDest) return;
    if (!gkey) {
      showToast('ENTER A GMAPS KEY IN SETTINGS');
      return;
    }
    loadGmaps();
    if (!gapiReady) {
      showToast('GMAPS LOADING...');
      return;
    }
    const svc = new google.maps.DirectionsService();
    svc.route({
      origin: getOrigin(),
      destination: new google.maps.LatLng(currentDest.latlng[0], currentDest.latlng[1]),
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: true,
      drivingOptions: { departureTime: new Date(), trafficModel: google.maps.TrafficModel.BEST_GUESS },
    }, (res, status) => {
      if (status !== 'OK' || !res.routes || !res.routes.length) {
        showToast('NO ROUTE FOUND');
        return;
      }
      currentRoutes = res.routes;
      selectedRoute = 0;
      drawRoutes();
      updateRouteCard();
    });
  }

  function drawRoutes() {
    if (routeDashTimer) {
      clearInterval(routeDashTimer);
      routeDashTimer = null;
    }
    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = L.layerGroup().addTo(map);
    routeLayers = [];
    currentRoutes.forEach((route, i) => {
      const active = i === selectedRoute;
      const group = L.layerGroup();
      const fills = [];
      const steps = route.legs[0].steps;
      steps.forEach((step) => {
        const pts = decodePolyline(step.polyline.points);
        const c = L.polyline(pts, { color: 'rgb(10, 14, 26)', weight: 8, opacity: active ? 0.9 : 0.4, lineJoin: 'miter', lineCap: 'butt' });
        const f = L.polyline(pts, { color: routeColor(step), weight: 5, opacity: active ? 1 : 0.3, lineJoin: 'miter', lineCap: 'butt' });
        if (active) f.setStyle({ dashArray: '16 10', lineCap: 'butt' });
        fills.push(f);
        group.addLayer(c);
        group.addLayer(f);
        if (active && currentRoutes.length > 1) {
          f.on('click', () => {
            selectedRoute = i;
            drawRoutes();
            updateRouteCard();
          });
        }
      });
      routeLayer.addLayer(group);
      routeLayers.push({ group: group, fills: fills });
    });
    animateRoute(selectedRoute);
  }

  function animateRoute(index) {
    if (routeDashTimer) {
      clearInterval(routeDashTimer);
      routeDashTimer = null;
    }
    const fills = routeLayers[index] ? routeLayers[index].fills : null;
    if (!fills || !fills.length) return;
    const paths = fills.map((f) => f._path);
    let off = 0;
    routeDashTimer = setInterval(() => {
      off -= 8;
      paths.forEach((p) => {
        if (p) p.style.strokeDashoffset = off;
      });
    }, 60);
  }

  function legTotals(route) {
    const leg = route.legs[0];
    let dist = 0;
    let dur = 0;
    let durT = 0;
    leg.steps.forEach((s) => {
      dist += s.distance.value;
      dur += s.duration.value;
      if (s.duration_in_traffic) durT += s.duration_in_traffic.value;
    });
    return { dist: dist, dur: dur, durT: durT || dur };
  }

  const routeCard = q('.route-card');
  const routeMeta = q('.route-meta');
  const btnAlts = q('.btn-alts');

  function updateRouteCard() {
    const t = legTotals(currentRoutes[selectedRoute]);
    const eta = new Date(Date.now() + t.durT * 1000);
    const hm = String(eta.getHours()).padStart(2, '0') + ':' + String(eta.getMinutes()).padStart(2, '0');
    let meta = fmtDist(t.dist) + ' / ' + fmtMin(t.durT) + ' / ETA ' + hm;
    if (t.durT > t.dur * 1.1) meta += ' (TRAFFIC +' + fmtMin(t.durT - t.dur) + ')';
    routeMeta.textContent = meta;
    if (currentRoutes.length > 1) {
      btnAlts.classList.remove('hidden');
      btnAlts.textContent = 'ALTS ' + (selectedRoute + 1) + '/' + currentRoutes.length;
    } else {
      btnAlts.classList.add('hidden');
    }
    if (!navActive) routeCard.classList.remove('hidden');
  }

  btnAlts.addEventListener('click', () => {
    if (!currentRoutes || currentRoutes.length < 2) return;
    selectedRoute = (selectedRoute + 1) % currentRoutes.length;
    drawRoutes();
    updateRouteCard();
  });

  function clearRoute() {
    stopNav();
    if (routeDashTimer) {
      clearInterval(routeDashTimer);
      routeDashTimer = null;
    }
    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = null;
    routeLayers = [];
    currentRoutes = null;
    routeCard.classList.add('hidden');
  }

  q('.btn-close-route').addEventListener('click', clearRoute);

  let carMarker = null;
  let navWatchId = null;
  let navTimer = null;
  let currentStepIndex = 0;
  let traveledDistance = 0;
  let lastNavPos = null;

  function makeCarMarker() {
    return L.marker([0, 0], {
      icon: L.divIcon({
        className: 'car-div',
        html: `<img src='${CAR}' width='48' height='48' />`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      }),
      zIndexOffset: 2000,
      interactive: false,
    });
  }

  function setCarHeading(deg) {
    if (!carMarker) return;
    const el = carMarker.getElement();
    if (!el) return;
    const img = el.querySelector('img');
    if (img) img.style.transform = 'rotate(' + Math.round(deg / 22.5) * 22.5 + 'deg)';
  }

  function distMeters(a, b) {
    return map.distance(L.latLng(a[0], a[1]), L.latLng(b[0], b[1]));
  }

  function bearing(a, b) {
    const toRad = Math.PI / 180;
    const lat1 = a[0] * toRad;
    const lat2 = b[0] * toRad;
    const dLng = (b[1] - a[1]) * toRad;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function startNav() {
    if (!currentRoutes || !currentRoutes[selectedRoute]) return;
    navActive = true;
    els.body.classList.add('navigating');
    routeCard.classList.add('hidden');
    placeCard.classList.add('hidden');
    navBanner.classList.remove('hidden');
    if (carMarker) map.removeLayer(carMarker);
    carMarker = makeCarMarker().addTo(map);
    const t = legTotals(currentRoutes[selectedRoute]);
    navMeta.textContent = fmtDist(t.dist) + ' / ' + fmtMin(t.durT);
    currentStepIndex = 0;
    traveledDistance = 0;
    lastNavPos = null;
    if (navigator.geolocation) {
      navWatchId = navigator.geolocation.watchPosition(onNavPos, null, { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 });
    }
    updateManeuver();
    navTimer = setInterval(checkOffRoute, 5000);
    showToast('NAVIGATION STARTED');
  }

  function stopNav() {
    navActive = false;
    els.body.classList.remove('navigating');
    navBanner.classList.add('hidden');
    if (navWatchId !== null) {
      navigator.geolocation.clearWatch(navWatchId);
      navWatchId = null;
    }
    if (navTimer) {
      clearInterval(navTimer);
      navTimer = null;
    }
    if (carMarker) {
      map.removeLayer(carMarker);
      carMarker = null;
    }
    traveledDistance = 0;
    currentStepIndex = 0;
    lastNavPos = null;
    if (currentRoutes && currentRoutes[selectedRoute]) routeCard.classList.remove('hidden');
  }

  function headingAlongRoute() {
    if (!currentRoutes || !currentRoutes[selectedRoute]) return 0;
    const steps = currentRoutes[selectedRoute].legs[0].steps;
    const step = steps[currentStepIndex] || steps[steps.length - 1];
    const pts = decodePolyline(step.polyline.points);
    if (!pts.length) return 0;
    return bearing(lastNavPos || pts[0], pts[pts.length - 1]);
  }

  function onNavPos(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const ll = [lat, lng];
    if (lastNavPos) traveledDistance += distMeters(lastNavPos, ll);
    lastNavPos = ll;
    if (carMarker) {
      carMarker.setLatLng(ll);
      setCarHeading(pos.coords.heading || headingAlongRoute());
    }
    updateStep();
    if (navActive) map.panTo(ll, { animate: false });
    updateHud(L.latLng(lat, lng));
    els.zoom.textContent = map.getZoom();
  }

  function updateStep() {
    if (!currentRoutes || !currentRoutes[selectedRoute]) return;
    const leg = currentRoutes[selectedRoute].legs[0];
    const steps = leg.steps;
    let cum = 0;
    let idx = 0;
    for (let i = 0; i < steps.length; i++) {
      cum += steps[i].distance.value;
      if (traveledDistance < cum) {
        idx = i;
        break;
      }
      idx = i;
    }
    if (idx !== currentStepIndex) {
      currentStepIndex = idx;
      updateManeuver();
    }
    const total = legTotals(currentRoutes[selectedRoute]).dist;
    const pct = Math.min(100, Math.round((traveledDistance / total) * 100));
    navBarFill.style.width = pct + '%';
    const remaining = total - traveledDistance;
    navStep.textContent = 'REMAIN ' + fmtDist(Math.max(0, remaining));
    if (traveledDistance >= total && total > 0) {
      navManeuver.textContent = 'ARRIVED';
      navBarFill.style.width = '100%';
    }
  }

  const navBanner = q('.nav-banner');
  const navManeuver = q('.nav-maneuver');
  const navMeta = q('.nav-meta');
  const navBarFill = q('.nav-bar-fill');
  const navStep = q('.nav-step');

  function maneuverText(m) {
    const names = {
      'turn-right': 'TURN RIGHT',
      'turn-left': 'TURN LEFT',
      'turn-sharp-right': 'SHARP RIGHT',
      'turn-sharp-left': 'SHARP LEFT',
      'turn-slight-right': 'SLIGHT RIGHT',
      'turn-slight-left': 'SLIGHT LEFT',
      'straight': 'STRAIGHT',
      'merge': 'MERGE',
      'fork-right': 'FORK RIGHT',
      'fork-left': 'FORK LEFT',
      'ramp-right': 'EXIT RIGHT',
      'ramp-left': 'EXIT LEFT',
      'roundabout-left': 'ROUNDABOUT LEFT',
      'roundabout-right': 'ROUNDABOUT RIGHT',
      'keep-right': 'KEEP RIGHT',
      'keep-left': 'KEEP LEFT',
      'destination': 'ARRIVE',
      'uturn-right': 'U-TURN',
      'uturn-left': 'U-TURN',
      'depart': 'DEPART',
    };
    return names[m] || 'CONTINUE';
  }

  function updateManeuver() {
    if (!currentRoutes || !currentRoutes[selectedRoute]) return;
    const steps = currentRoutes[selectedRoute].legs[0].steps;
    if (currentStepIndex >= steps.length) {
      navManeuver.textContent = 'ARRIVED';
      navBarFill.style.width = '100%';
      return;
    }
    navManeuver.textContent = maneuverText(steps[currentStepIndex].maneuver);
  }

  function routePoints(route) {
    const pts = [];
    route.legs[0].steps.forEach((s) => {
      decodePolyline(s.polyline.points).forEach((p) => pts.push(p));
    });
    return pts;
  }

  function checkOffRoute() {
    if (!navActive || !lastNavPos || !currentRoutes) return;
    const pts = routePoints(currentRoutes[selectedRoute]);
    const pos = L.latLng(lastNavPos[0], lastNavPos[1]);
    let best = Infinity;
    pts.forEach((p) => {
      const d = map.distance(pos, L.latLng(p[0], p[1]));
      if (d < best) best = d;
    });
    if (best > 120) {
      showToast('OFF ROUTE - RE-ROUTING');
      buildRoute();
    }
  }

  q('.btn-start-nav').addEventListener('click', startNav);
  q('.btn-stop-nav').addEventListener('click', stopNav);

  const REPORT_COLORS = {
    hazard: 'rgb(255, 77, 90)',
    accident: 'rgb(255, 140, 0)',
    police: 'rgb(59, 130, 246)',
    camera: 'rgb(168, 85, 247)',
    construction: 'rgb(245, 158, 11)',
  };
  const REPORT_LABEL = {
    hazard: 'HAZARD',
    accident: 'ACCIDENT',
    police: 'POLICE',
    camera: 'SPEED CAMERA',
    construction: 'ROAD WORK',
  };
  const REPORT_TTL = 60 * 60 * 1000;

  let reports = loadReports();
  let reportLayer = L.layerGroup().addTo(map);

  function loadReports() {
    try {
      return JSON.parse(localStorage.getItem(LS_REPORTS) || '[]');
    } catch (e) {
      return [];
    }
  }
  function saveReports() {
    localStorage.setItem(LS_REPORTS, JSON.stringify(reports));
  }

  function pruneReports() {
    const now = Date.now();
    reports = reports.filter((r) => now - r.t <= REPORT_TTL);
  }

  function renderReports() {
    reportLayer.clearLayers();
    pruneReports();
    reports.forEach((r) => {
      const icon = L.divIcon({
        className: 'report-div',
        html: `<img src='${makePinDataUrl(16, REPORT_COLORS[r.k] || 'rgb(255, 77, 90)')}' width='32' height='32' />`,
        iconSize: [32, 32],
        iconAnchor: [16, 29],
      });
      const m = L.marker([r.lat, r.lng], { icon: icon, zIndexOffset: 500 });
      m.bindPopup(`<div class='pixel-popup'><b>${REPORT_LABEL[r.k] || r.k}</b><span class='dim'>${r.v} CONFIRMED</span><br /><button class='pbtn pbtn-sm report-confirm'>CONFIRM</button></div>`);
      m.on('popupopen', (ev) => {
        const btn = ev.popup.getElement().querySelector('.report-confirm');
        if (btn) {
          btn.addEventListener('click', () => {
            r.v += 1;
            saveReports();
            renderReports();
          });
        }
      });
      reportLayer.addLayer(m);
    });
  }

  const reportMenu = q('.report-menu');
  let reportLatLng = null;

  map.on('contextmenu', (e) => {
    reportLatLng = e.latlng;
    reportMenu.classList.remove('hidden');
    reportMenu.style.left = Math.min(e.containerPoint.x, map.getSize().x - 170) + 'px';
    reportMenu.style.top = Math.min(e.containerPoint.y, map.getSize().y - 250) + 'px';
  });

  q('.report-cancel').addEventListener('click', () => reportMenu.classList.add('hidden'));

  document.querySelectorAll('.report-btn').forEach((b) => {
    b.addEventListener('click', () => {
      if (reportLatLng) {
        reports.push({ k: b.dataset.type, lat: reportLatLng.lat, lng: reportLatLng.lng, t: Date.now(), v: 1 });
        saveReports();
        renderReports();
        showToast((REPORT_LABEL[b.dataset.type] || 'REPORT') + ' ADDED');
      }
      reportMenu.classList.add('hidden');
    });
  });

  map.on('click', () => {
    reportMenu.classList.add('hidden');
  });

  renderReports();
})();
