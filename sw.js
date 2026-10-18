// Babak notebook: opens at once (also offline) from this device; a newer version is fetched from the web page in the background.
const VERSION = "66c5c6059ada";
const CACHE = "babak-web-" + VERSION;
const SHELL = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("babak-web-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // Google sign-in and Drive always go straight to Google
  const scope = new URL(self.registration.scope);
  const rel = url.pathname.slice(scope.pathname.length);
  if (rel === "gconfig.json") return; // always fresh
  if (e.request.mode === "navigate" || rel === "" || rel === "index.html") {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match("./");
      const net = fetch(e.request, { cache: "no-cache" }).then((r) => { if (r.ok && r.type === "basic") c.put("./", r.clone()); return r; });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
