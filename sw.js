// Offline support: the app shell is cached so it opens with no signal.
// Workout data is handled separately by Firestore's own offline cache.
// Bump VERSION whenever you change files, so phones pick up the update.
const VERSION = "twp-v59";
const SHELL = [
  "./", "index.html", "privacy.html", "css/styles.css",
  "js/app.js", "js/plan.js", "js/stats.js", "js/firebase.js", "js/library.js", "js/fun.js", "js/safety.js", "js/timer.js", "js/a11y.js", "js/icons.js", "js/tailor.js", "js/program.js", "js/stretch.js",
  "js/anatomy.js", "js/equipment.js", "js/muscles.js", "js/views/areas.js", "js/views/bodymap.js", "js/views/body.js", "js/views/crew.js", "js/views/feedback.js", "js/views/gyms.js", "js/views/progress.js", "js/views/questionnaire.js", "js/views/review.js", "js/views/settings.js", "js/views/stretch.js", "js/views/usage.js", "js/views/workout.js",
  "app-v41.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "apple-touch-icon.png", "icons/app-icon-180.png", "icons/app-icon-192.png", "icons/app-icon-512.png", "icons/favicon-32.png", "icons/favicon.svg", "favicon.ico", "icons/logo-oneline-dark.svg", "icons/logo-oneline-light.svg", "icons/logo-primary-dark.svg", "icons/logo-primary-light.svg",
  "fonts/atkinson-hyperlegible-latin-400-normal.woff2", "fonts/atkinson-hyperlegible-latin-700-normal.woff2", "fonts/lexend-latin-400-normal.woff2", "fonts/lexend-latin-700-normal.woff2", "fonts/opendyslexic-latin-400-normal.woff2", "fonts/opendyslexic-latin-700-normal.woff2"
];
const CDN = ["www.gstatic.com", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Serve from cache right away, refresh the cache in the background.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CDN.includes(url.hostname)) return; // never touch Firestore or auth traffic
  if (url.hostname === "www.gstatic.com" && !url.pathname.startsWith("/firebasejs/")) return;
  // Version checks and forced updates always go to the server.
  // Icons and the manifest always come straight from the server, so the phone's "Add to Home Screen" never gets a stale or failed copy.
  if (sameOrigin && /(apple-touch-icon|app-icon|icon-192|icon-512|favicon\.ico|\.webmanifest)/.test(url.pathname)) return;
  if (sameOrigin && (url.searchParams.has("check") || url.pathname.endsWith("/sw.js") || req.cache === "reload" || req.cache === "no-store")) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: sameOrigin });
    const network = fetch(req).then(res => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; }).catch(() => cached || Response.error());
    return cached || network;
  }));
});
