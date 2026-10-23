// Service worker: lets the app open offline and be installed on a phone's home screen.
// The page and config are network-first (updates show up right away); libraries, fonts and
// avatars are served from cache and refreshed in the background. AI, cloud-save and photo
// requests are never touched. Bump CACHE when the shell file list changes.
const CACHE = "mc-v2";
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js";
const SHELL = ["./", "index.html", "config.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", SUPABASE_JS];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function networkFirst(req, fallback) {
  const c = await caches.open(CACHE);
  try {
    // revalidate with the server every time, so a freshly uploaded index.html shows up on the next open
    const res = await fetch(req.url, { cache: "no-cache", credentials: "same-origin" });
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch {
    return (await c.match(req, { ignoreSearch: true })) || (fallback && (await c.match(fallback))) || Response.error();
  }
}
async function staleWhileRevalidate(e) {
  const c = await caches.open(CACHE), hit = await c.match(e.request);
  const net = fetch(e.request).then(res => { if (res.ok || res.type === "opaque") c.put(e.request, res.clone()); return res; }).catch(() => hit);
  if (hit) { e.waitUntil(net); return hit; }
  return net;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/config.js")) e.respondWith(networkFirst(req, "index.html"));
    else e.respondWith(staleWhileRevalidate(e));
    return;
  }
  if (/^(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|api\.dicebear\.com)$/.test(url.hostname)) e.respondWith(staleWhileRevalidate(e));
});
