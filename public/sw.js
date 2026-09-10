/**
 * Service worker for "add to home screen" (PRD §14).
 *
 * Deliberately conservative about what it stores. This app holds balances,
 * transactions and amounts owed, on a phone that may be handed to someone
 * else. A cached authenticated page would survive sign-out and could be
 * served to the next user, so nothing that depends on who is signed in is
 * ever written to a cache: only immutable build output and the installable
 * shell. Offline *logging* is explicitly phase 2 (PRD §15) — this worker
 * makes the app installable and gives it a real offline page, nothing more.
 */
const VERSION = "v1";
const CACHE = `pft-shell-${VERSION}`;

const SHELL = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

/**
 * The single source of truth for what may be cached. Exposed on `self` so the
 * test suite can exercise the file that actually ships.
 */
function chooseStrategy(url, mode) {
  const { pathname, origin } = new URL(url);

  // Anything that depends on who is signed in: never cached.
  if (mode === "navigate") return "network-only";
  if (pathname.startsWith("/auth/")) return "network-only";

  // Same-origin only. Supabase (or any other origin) is all user data.
  if (typeof self.location !== "undefined" && origin !== self.location.origin) return "network-only";

  // Immutable, content-hashed build output — no user data by construction.
  if (pathname.startsWith("/_next/static/")) return "cache-first";

  if (SHELL.includes(pathname)) return "cache-first";
  if (pathname.startsWith("/icons/")) return "cache-first";

  return "network-only";
}

self.chooseStrategy = chooseStrategy;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
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

  // A navigation that fails offline gets the offline page rather than the
  // browser's error, but is never served from cache while the network works.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  if (chooseStrategy(request.url, request.mode) !== "cache-first") return;

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
