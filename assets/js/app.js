// Reno Outdoor Adventure — app.js

const RENO = [39.5296, -119.8138];
const RADIUS_M = 120 * 1609.34;
const LEAFLET_CDN = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const LEAFLET_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// ── Data ──────────────────────────────────────────────────────
async function loadLocations() {
  const r = await fetch('data/locations.json');
  return (await r.json()).locations;
}

async function loadTrips() {
  const r = await fetch('data/trips.json');
  return (await r.json()).trips;
}

// ── Map helpers ───────────────────────────────────────────────
function baseMap(id, zoom = 8) {
  const map = L.map(id).setView(RENO, zoom);
  L.tileLayer(LEAFLET_CDN, { attribution: LEAFLET_ATTR }).addTo(map);

  // Reno home marker
  L.marker(RENO, {
    icon: L.divIcon({
      className: '',
      html: '<div class="reno-dot">Reno</div>',
      iconSize: [46, 20],
      iconAnchor: [23, 10]
    })
  }).addTo(map).bindPopup('<strong>Reno, NV</strong><br>Your home base');

  // 120-mile radius circle
  L.circle(RENO, {
    radius: RADIUS_M,
    color: '#c9933a',
    fillColor: '#c9933a',
    fillOpacity: 0.045,
    weight: 2,
    dashArray: '8 6'
  }).addTo(map);

  return map;
}

function diffColor(d) {
  return d === 'easy' ? '#2d6530' : d === 'moderate' ? '#c9933a' : '#c0392b';
}

function markerIcon(difficulty) {
  const c = diffColor(difficulty);
  return L.divIcon({
    className: '',
    html: `<div style="width:13px;height:13px;border-radius:50%;background:${c};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
    iconSize: [13, 13],
    iconAnchor: [6, 6]
  });
}

function addLegend(map) {
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'map-legend');
    div.innerHTML = `
      <div class="legend-item"><div class="legend-dot" style="background:#2d6530"></div> Easy</div>
      <div class="legend-item"><div class="legend-dot" style="background:#c9933a"></div> Moderate</div>
      <div class="legend-item"><div class="legend-dot" style="background:white;border:2px solid #c9933a;width:16px;height:6px;border-radius:0"></div> 120-mi range</div>
    `;
    return div;
  };
  legend.addTo(map);
}

function placeMarkers(map, locations, onClick) {
  locations.forEach(loc => {
    const m = L.marker(loc.coords, { icon: markerIcon(loc.difficulty) }).addTo(map);
    m.bindPopup(`
      <strong>${loc.name}</strong><br>
      <span style="color:#666;font-size:0.82em">${loc.county} County &bull; ${loc.distance_mi} mi from Reno</span><br>
      <span style="margin-top:4px;display:inline-block;padding:2px 7px;border-radius:3px;font-size:0.72em;font-weight:600;
        background:${loc.difficulty==='easy'?'#d4edda':loc.difficulty==='moderate'?'#fff3cd':'#f8d7da'};
        color:${loc.difficulty==='easy'?'#155724':loc.difficulty==='moderate'?'#7a5a00':'#721c24'}">
        ${loc.difficulty}
      </span>
    `);
    if (onClick) m.on('click', () => onClick(loc));
  });
}

// ── Renderers ─────────────────────────────────────────────────
function fmtDate(s) {
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '...' : s;
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

const GOLD_LABELS = { none: 'No color', trace: 'Trace color', flakes: 'Flakes', nugget: 'Nugget!' };

function renderLocationCard(loc) {
  const tags = (loc.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  const visited = loc.visited ? '<span class="visited-badge">Visited</span>' : '';
  return `
    <div class="card">
      <div class="card-img-placeholder">No photo yet</div>
      <div class="card-body">
        <div class="card-title">${loc.name}${visited}</div>
        <div class="card-meta">
          <span>${loc.distance_mi} mi from Reno</span>
          <span>${loc.county} County</span>
        </div>
        <span class="badge badge-${loc.difficulty}">${loc.difficulty}</span>
        <span class="tag" style="margin-left:0.4rem">${loc.water_type}</span>
        <p class="card-notes" style="margin-top:0.75rem">${loc.gold_history}</p>
        <div class="card-tags">${tags}</div>
      </div>
      <div class="card-footer">${loc.access_note}</div>
    </div>
  `;
}

function renderTripCard(trip) {
  const stars = '★'.repeat(trip.rating || 0) + '☆'.repeat(5 - (trip.rating || 0));
  const goldLabel = GOLD_LABELS[trip.gold_found] || '';
  const goldClass = (trip.gold_found && trip.gold_found !== 'none') ? 'gold' : '';
  const thumb = trip.photos && trip.photos.length
    ? `<img class="card-img" src="${trip.photos[0]}" alt="${trip.location}" loading="lazy">`
    : `<div class="card-img-placeholder">No photo</div>`;

  return `
    <a href="trip.html?id=${encodeURIComponent(trip.id)}" style="text-decoration:none;color:inherit">
      <div class="card">
        ${thumb}
        <div class="card-body">
          <div class="card-title">${trip.location}</div>
          <div class="card-meta">
            <span>${fmtDate(trip.date)}</span>
            <span>${trip.trail_miles} mi</span>
            <span>+${trip.elevation_gain} ft</span>
          </div>
          <span class="stars">${stars}</span>
          ${goldLabel ? `<span class="tag ${goldClass}" style="margin-left:0.4rem">${goldLabel}</span>` : ''}
          <p class="card-notes" style="margin-top:0.65rem">${truncate(trip.notes, 130)}</p>
        </div>
        <div class="card-footer">${trip.conditions || ''}</div>
      </div>
    </a>
  `;
}

// ── Active nav ────────────────────────────────────────────────
function markNav() {
  const file = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === file || (file === '' && a.getAttribute('href') === 'index.html'));
  });
}

// ── Page: Home ────────────────────────────────────────────────
async function initHome() {
  const [locations, trips] = await Promise.all([loadLocations(), loadTrips()]);

  // Stats
  const totalMiles = trips.reduce((s, t) => s + (t.trail_miles || 0), 0);
  const visitedCount = trips.length;
  document.getElementById('stat-trips').innerHTML = `<span class="stat-value">${visitedCount}</span><span class="stat-label">Trips Taken</span>`;
  document.getElementById('stat-miles').innerHTML = `<span class="stat-value">${totalMiles.toFixed(1)}</span><span class="stat-label">Miles Hiked</span>`;
  document.getElementById('stat-locations').innerHTML = `<span class="stat-value">${locations.length}</span><span class="stat-label">Known Locations</span>`;

  // Map
  const map = baseMap('main-map', 8);
  placeMarkers(map, locations);
  addLegend(map);

  // Recent trips
  const recent = [...trips].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const grid = document.getElementById('recent-trips-grid');
  grid.innerHTML = recent.length
    ? recent.map(renderTripCard).join('')
    : `<div class="empty-state" style="grid-column:1/-1">
        <h3>No trips logged yet</h3>
        <p>After your first adventure, add an entry to <code>data/trips.json</code> and commit your photos.</p>
        <p style="margin-top:0.5rem"><a href="guide.html#adding-trips">How to log a trip &rarr;</a></p>
       </div>`;
}

// ── Page: Locations ───────────────────────────────────────────
async function initLocations() {
  const locations = await loadLocations();
  const map = baseMap('locations-map', 8);
  addLegend(map);

  let filtered = [...locations];

  function render() {
    document.getElementById('locations-grid').innerHTML = filtered.map(renderLocationCard).join('');
    // Re-draw markers (remove all markers first)
    map.eachLayer(l => { if (l instanceof L.Marker) map.removeLayer(l); });
    // Re-add Reno marker
    L.marker(RENO, { icon: L.divIcon({ className:'', html:'<div class="reno-dot">Reno</div>', iconSize:[46,20], iconAnchor:[23,10] }) })
      .addTo(map).bindPopup('<strong>Reno, NV</strong><br>Home base');
    placeMarkers(map, filtered, loc => {
      document.getElementById(loc.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // Assign IDs to cards after render
  function renderAndTag() {
    render();
    document.querySelectorAll('#locations-grid .card').forEach((card, i) => {
      if (filtered[i]) card.id = filtered[i].id;
    });
  }

  renderAndTag();

  document.getElementById('filter-difficulty').addEventListener('change', e => {
    const v = e.target.value;
    filtered = v ? locations.filter(l => l.difficulty === v) : [...locations];
    renderAndTag();
  });

  document.getElementById('filter-distance').addEventListener('change', e => {
    const max = parseInt(e.target.value) || 999;
    filtered = locations.filter(l => l.distance_mi <= max);
    renderAndTag();
  });

  document.getElementById('filter-water').addEventListener('change', e => {
    const v = e.target.value;
    filtered = v ? locations.filter(l => l.water_type.includes(v)) : [...locations];
    renderAndTag();
  });
}

// ── Page: Trips ───────────────────────────────────────────────
async function initTrips() {
  const trips = await loadTrips();
  const sorted = [...trips].sort((a, b) => b.date.localeCompare(a.date));
  const grid = document.getElementById('trips-grid');
  grid.innerHTML = sorted.length
    ? sorted.map(renderTripCard).join('')
    : `<div class="empty-state" style="grid-column:1/-1">
        <h3>No trips logged yet</h3>
        <p>After your first outing, add a trip entry to <code>data/trips.json</code> and upload your photos.</p>
        <p style="margin-top:0.5rem"><a href="guide.html#adding-trips">See the trip logging guide &rarr;</a></p>
       </div>`;
}

// ── Page: Trip Detail ─────────────────────────────────────────
async function initTripDetail() {
  const id = getParam('id');
  if (!id) { window.location.href = 'trips.html'; return; }

  const [trips, locations] = await Promise.all([loadTrips(), loadLocations()]);
  const trip = trips.find(t => t.id === id);

  const content = document.getElementById('trip-content');

  if (!trip) {
    content.innerHTML = '<div class="empty-state"><h3>Trip not found</h3><p><a href="trips.html">Back to trip log</a></p></div>';
    return;
  }

  document.title = `${trip.location} — Reno Outdoor Adventure`;

  const loc = locations.find(l => l.id === trip.location_id);
  const stars = '★'.repeat(trip.rating || 0) + '☆'.repeat(5 - (trip.rating || 0));
  const goldLabel = GOLD_LABELS[trip.gold_found] || 'Not recorded';
  const tags = (trip.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  const distMi = trip.distance_from_reno || (loc && loc.distance_mi) || '?';

  const photos = trip.photos && trip.photos.length
    ? `<div class="section-header"><h2>Photos</h2></div>
       <div class="photo-gallery">
         ${trip.photos.map(p => `<img src="${p}" alt="Trip photo" loading="lazy" onclick="openLightbox(this.src)">`).join('')}
       </div>`
    : '';

  const miniMap = trip.coords
    ? `<div class="section-header" style="margin-top:1rem"><h2>Location</h2></div>
       <div class="map-container" style="margin:0"><div id="trip-map"></div></div>`
    : '';

  content.innerHTML = `
    <div class="trip-detail-header">
      <h1 style="font-size:1.5rem;color:var(--forest)">${trip.location}</h1>
      <div style="color:var(--text-muted);margin:0.4rem 0 0.6rem">${fmtDate(trip.date)}</div>
      <span class="stars">${stars}</span>
      <span class="tag ${trip.gold_found !== 'none' ? 'gold' : ''}" style="margin-left:0.5rem">${goldLabel}</span>
      <div class="trip-detail-stats">
        <div class="trip-stat"><span class="value">${trip.trail_miles}</span><span class="label">Miles</span></div>
        <div class="trip-stat"><span class="value">+${trip.elevation_gain}</span><span class="label">Elev Gain</span></div>
        <div class="trip-stat"><span class="value">${trip.duration_hours}h</span><span class="label">Duration</span></div>
        <div class="trip-stat"><span class="value">${distMi} mi</span><span class="label">From Reno</span></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:1.5rem;align-items:start" class="detail-grid">
      <div>
        ${photos}
        <div class="section-header" style="margin-top:${trip.photos && trip.photos.length ? '1.5rem' : '0'}"><h2>Field Notes</h2></div>
        <div style="background:var(--card);border-radius:var(--radius);padding:1.2rem;box-shadow:var(--shadow);white-space:pre-wrap;line-height:1.7;font-size:0.92rem">${trip.notes || 'No notes recorded.'}</div>
      </div>
      <div>
        <div class="section-header"><h2>Summary</h2></div>
        <div style="background:var(--card);border-radius:var(--radius);padding:1.1rem 1.2rem;box-shadow:var(--shadow);font-size:0.88rem;line-height:2">
          <div><strong>Conditions:</strong> ${trip.conditions || 'Not recorded'}</div>
          <div><strong>Gold found:</strong> ${goldLabel}</div>
          <div><strong>Will return:</strong> ${trip.will_return === true ? 'Yes' : trip.will_return === false ? 'No' : 'TBD'}</div>
          ${tags ? `<div style="margin-top:0.5rem">${tags}</div>` : ''}
        </div>
        ${miniMap}
      </div>
    </div>
  `;

  if (trip.coords) {
    const m = L.map('trip-map').setView(trip.coords, 13);
    L.tileLayer(LEAFLET_CDN, { attribution: LEAFLET_ATTR }).addTo(m);
    L.marker(trip.coords).addTo(m).bindPopup(trip.location).openPopup();
  }

  // Responsive: stack on mobile
  const style = document.createElement('style');
  style.textContent = '@media(max-width:680px){.detail-grid{grid-template-columns:1fr!important}}';
  document.head.appendChild(style);
}

// ── Lightbox ──────────────────────────────────────────────────
function openLightbox(src) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `<img src="${src}" alt="Photo">`;
  lb.addEventListener('click', () => lb.remove());
  document.body.appendChild(lb);
}
window.openLightbox = openLightbox;

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  markNav();
  const page = document.body.dataset.page;
  if (page === 'home')        initHome();
  if (page === 'locations')   initLocations();
  if (page === 'trips')       initTrips();
  if (page === 'trip-detail') initTripDetail();
});
