/* CampusNav service worker: offline-first app shell. Bump VERSION when files change. */
const VERSION = "campusnav-v2-2";
const SHELL = ["./", "index.html", "styles.css", "app.js", "campusData.js", "timetableData.js", "mapdata.js", "routing.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

/* New versions wait until the user taps "Reload" in the app, so a running session is never swapped mid-use. */
self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL))));
self.addEventListener("message", e => { if (e.data === "skip-waiting") self.skipWaiting(); });
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  /* stale-while-revalidate: instant from cache, refresh in the background */
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok && new URL(e.request.url).origin === location.origin) cache.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
