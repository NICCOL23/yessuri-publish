/* Only public offline help and app icons are stored. Never cache pages or API data. */
'use strict';
const CACHE = 'yessuri-pwa-v2';
const ROOT = new URL('./', self.location.href);
const OFFLINE = new URL('offline.html', ROOT).href;
const ASSETS = ['offline.html', 'assets/icons/favicon-192.png', 'assets/icons/favicon-512.png'].map(p => new URL(p, ROOT).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  // Do not skip waiting: never replace a worker while a form is being completed.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('yessuri-pwa-') && k !== CACHE).map(k => caches.delete(k)))));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  if (['data.js', 'app.js', 'find.js'].some(file => url.pathname === new URL(file, ROOT).pathname)) {
    event.respondWith(fetch(event.request, {cache: 'no-store'}));
    return;
  }
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request, {cache: 'no-store'}).catch(() => caches.open(CACHE).then(cache => cache.match(OFFLINE))));
});
