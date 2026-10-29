// Babak notebook: opens at once (also offline) from this device; a newer version is fetched from the web page in the background.
const VERSION = "0e0c9009c015";
const CACHE = "babak-web-" + VERSION;
const SHELL = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("babak-web-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === "POST" && url.origin === location.origin && url.pathname.endsWith("/share-target")) {
    // a file or text shared from another app: keep it for the page, then open the notebook
    e.respondWith((async () => {
      const scope = self.registration.scope;
      try {
        const fd = await e.request.formData(), c = await caches.open("babak-share"), meta = { title: fd.get("title") || "", text: fd.get("text") || "", url: fd.get("url") || "", files: [] };
        let i = 0;
        for (const f of fd.getAll("files")) {
          if (!f || typeof f === "string" || !f.size) continue;
          const key = scope + "__share/" + (i++);
          await c.put(key, new Response(f, { headers: { "content-type": f.type || "application/octet-stream" } }));
          meta.files.push({ key, name: f.name || ("file-" + i), type: f.type || "" });
        }
        await c.put("meta", new Response(JSON.stringify(meta), { headers: { "content-type": "application/json" } }));
      } catch (err) {}
      return Response.redirect(scope + "?share=1", 303);
    })());
    return;
  }
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
