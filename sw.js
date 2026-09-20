'use strict';

// アプリ本体を更新したら、この番号を上げる（古いキャッシュが破棄される）
// Bump this number whenever the app files change; old caches are then discarded.
var CACHE = 'shikouroku-v1';

var ASSETS = [
  'memo.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ASSETS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){
        return Promise.all(keys.filter(function(k){ return k !== CACHE; })
          .map(function(k){ return caches.delete(k); }));
      })
      .then(function(){ return self.clients.claim(); })
  );
});

// キャッシュを先に返し（オフラインでも即起動）、裏で最新版を取りに行く。
// Answer from the cache first (instant start, works offline) and refresh in the background.
self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function(hit){
      var network = fetch(req).then(function(res){
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return null; });

      if (hit) {
        e.waitUntil(network);
        return hit;
      }
      return network.then(function(res){
        if (res) return res;
        if (req.mode === 'navigate') return caches.match('memo.html');
        return null;
      }).then(function(res){ return res || Response.error(); });
    })
  );
});
