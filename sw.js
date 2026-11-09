// Hors ligne : on sert le réseau en priorité (contenu toujours à jour), et le cache si pas de connexion.
const CACHE = "rsp-v29";
const FILES = ["./", "index.html", "css/style.css", "js/config.js", "js/data.js", "js/var.js", "js/app.js", "js/sync.js", "manifest.webmanifest", "icons/icon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== "rsp-state").map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && new URL(e.request.url).origin === location.origin) {
        const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});

// Rappel quotidien (synchro périodique : Chrome Android, appli installée). L'appli range son état dans le cache « rsp-state ».
const ymd = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
async function remind(){
  const c = await caches.open("rsp-state"), r = await c.match("state"); if (!r) return;
  const s = await r.json(), now = new Date(), k = ymd(now);
  if (s.notified === k || now.getHours() < (s.hour || 18)) return;
  if (((s.days || {})[k] || 0) >= s.goal) return;
  const due = Object.entries(s.due || {}).filter(([d]) => d <= k).reduce((a, [, n]) => a + n, 0);
  await self.registration.showNotification("Révisions SP", {
    body: due ? due + " question" + (due > 1 ? "s" : "") + " à revoir aujourd'hui." : "Objectif du jour : " + s.goal + " réponses. Ta série t'attend !",
    icon: "icons/icon.svg", tag: "rsp-rappel"
  });
  s.notified = k; await c.put("state", new Response(JSON.stringify(s)));
}
self.addEventListener("periodicsync", e => { if (e.tag === "rsp-rappel") e.waitUntil(remind()); });
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => ws.length ? ws[0].focus() : clients.openWindow("./")));
});
