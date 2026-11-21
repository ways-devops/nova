// Минимальный service worker: кэширует оболочку и показывает /offline без сети.
// Данные CRM НЕ кэшируются — все операции подтверждает сервер.
const CACHE = "nova-shell-v1";
const SHELL = ["/offline", "/icons/icon-192.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Навигация: сеть, при ошибке — страница «нет соединения»
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  // Статика иконок — из кэша
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
  }
});
