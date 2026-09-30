// Robot Workshop â€” service worker (offline cache for the installed web app).
//
// NETWORK FIRST: when the phone is online it always fetches the newest files
// (so a new build shows up on the next open) and keeps a copy; when offline
// it plays from that copy.
//
// VERSION is stamped automatically by publish.ps1 on every publish. A new
// version makes the phone install this worker fresh and throw away old copies.
//
// This game imports the shared series engine from ../../core/, which sits
// outside this folder. Requests from the game page still pass through this
// worker, so the engine files are cached too.
const VERSION = '20260930-221827';
const CACHE = 'robot-workshop-' + VERSION;

// The page itself + manifest + icons, so the app opens offline straight away.
const CORE = ['./', './index.html', './manifest.webmanifest', './styles/app.css',
  './assets/branding/pwa/icon-192.png', './assets/branding/pwa/icon-512.png'];
// Every code file (game + shared engine) â€” filled in by publish.ps1 so the whole
// game's code is saved on the very first visit. Art is cached the first time the
// game loads it. (Empty when run locally.)
const PRECACHE = ['./app.js', './styles/app.css', './assets/img_opt/studio/studio_logo_banx_gamex_dark.webp', './assets/img_opt/brand/brand_02_splash_key_art.webp', './assets/img_opt/brand/brand_03_title_logo.webp', './assets/img_opt/brand/brand_07_credits_series_mark.webp', './assets/img_opt/brand/brand_06_ngplus_key_art.webp', './assets/img_opt/ui/ui_icon_28.webp', './assets/img_opt/ui/ui_icon_07_workshop.webp', './assets/img_opt/ui/ui_icon_20.webp', './assets/img_opt/ui/ui_icon_09_records.webp', './assets/img_opt/ui/ui_icon_25.webp', './assets/img_opt/ui/ui_icon_19.webp', './assets/img_opt/ui/ui_icon_26.webp', './assets/img_opt/ui/ui_icon_27.webp', './assets/img_opt/ui/ui_icon_21.webp', './assets/img_opt/ui/ui_icon_22.webp', './assets/img_opt/ui/ui_icon_29.webp', './assets/img_opt/ui/ui_icon_30.webp', './assets/img_opt/env/env_01_floor_clean.webp', './assets/img_opt/env/env_05_wall_corner.webp', './assets/img_opt/env/env_04_wall_straight.webp', './assets/img_opt/env/env_06_door.webp', './assets/img_opt/env/env_07_window.webp', './assets/img_opt/env/env_08_expansion_boundary.webp', './assets/img_opt/ui/ui_icon_16.webp', './assets/img_opt/facilities/facility_02_engineering_desk.webp', './assets/img_opt/facilities/facility_04_programming_station.webp', './assets/img_opt/facilities/facility_06_parts_rack.webp', './assets/img_opt/facilities/facility_01_basic_workbench.webp', './assets/img_opt/facilities/facility_05_assembly_bay.webp', './assets/img_opt/facilities/facility_15_prototype_pedestal.webp', './assets/img_opt/facilities/facility_12_staff_break_table.webp', './assets/img_opt/facilities/facility_14_storage_crates.webp', './assets/img_opt/staff/staff_engineer_01.webp', './assets/img_opt/staff/staff_programmer_01.webp', './assets/img_opt/staff/staff_mechanic_01.webp', './assets/img_opt/badges/badge_role_01_engineer.webp', './assets/img_opt/badges/badge_role_03_programmer.webp', './assets/img_opt/badges/badge_role_04_mechanic.webp', './assets/img_opt/props/prop_07.webp', './assets/img_opt/props/prop_10.webp', './assets/img_opt/props/prop_01.webp', './assets/img_opt/props/prop_04.webp', './assets/img_opt/props/prop_03.webp', './assets/img_opt/props/prop_02.webp', './assets/img_opt/props/prop_06.webp', './assets/img_opt/props/prop_11.webp', './assets/img_opt/props/prop_09.webp', './assets/img_opt/props/prop_12.webp', './assets/img_opt/status/status_staff_01_happy.webp', './assets/img_opt/status/status_staff_02_tired.webp', './assets/img_opt/status/status_staff_03_inspired.webp', './assets/img_opt/status/status_staff_04_stressed.webp', './assets/img_opt/status/status_staff_05_breakthrough.webp', './assets/img_opt/vfx/vfx_01.webp', './assets/img_opt/vfx/vfx_02.webp', './assets/img_opt/vfx/vfx_04.webp', './assets/img_opt/vfx/vfx_05.webp', './assets/img_opt/vfx/vfx_08.webp', './assets/img_opt/vfx/vfx_09.webp', './assets/img_opt/ui/ui_icon_01_money.webp', './assets/img_opt/ui/ui_icon_02_premium.webp', './assets/img_opt/ui/ui_icon_03_reputation.webp', './assets/img_opt/ui/ui_icon_05_staff.webp', './assets/img_opt/ui/ui_icon_11.webp', './assets/img_opt/ui/ui_icon_04_research.webp', './assets/img_opt/ui/ui_icon_08_competition.webp', './assets/img_opt/events/event_art_01.webp'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // One file failing must not block the rest.
      .then((c) => Promise.allSettled(CORE.concat(PRECACHE).map((u) =>
        c.add(new Request(u, { cache: 'reload' })))))
      .catch(() => { /* offline during install: runtime caching will fill in */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('robot-workshop-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
