// Service Worker。ビルド時に、版とキャッシュ対象の一覧を埋めて、dist/sw.js として出力する。
// アプリ本体（HTML・JS・CSS・アイコン）だけをキャッシュして、オフラインでも起動できるようにする。
// 利用者の MIDI と .sf2 は、URL で取得するものではないので、ここには入らない。
const CACHE = 'mmo-ac1d4f224a0d';
const PRECACHE = [
  "./",
  "./index.html",
  "./apple-touch-icon.png",
  "./assets/m0-BoJedd3D.js",
  "./assets/main-B8jR3eE5.css",
  "./assets/main-BRUhCERj.js",
  "./assets/opfs-worker-C8SwMHp6.js",
  "./assets/spessasynth_processor.min-CDgYhvzD.js",
  "./assets/spessasynth_processor.min-Do8nRWPC.js",
  "./assets/tick-timer-worker-BAz2KTID.js",
  "./assets/timer-worker-DFuXDLkp.js",
  "./favicon-32.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./manifest.webmanifest"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // HTTP キャッシュを通さず、必ず最新を取る
      await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 古い版のキャッシュを消す
      for (const key of await caches.keys()) {
        if (key.startsWith('mmo-') && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // ignoreVary: 配信側が Vary: Origin を付けると、crossorigin 属性つきの読み込み（JS・CSS）が、照合に外れるため
      const hit = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
      if (hit) return hit;

      if (request.mode === 'navigate') {
        // キャッシュにないページ（M0 の検証ページなど）は、まずネットワークから。
        // つながらないとき（オフライン）だけ、本体を返す。
        try {
          return await fetch(request);
        } catch (error) {
          const index = await cache.match('./index.html', { ignoreVary: true });
          if (index) return index;
          throw error;
        }
      }
      return fetch(request);
    })(),
  );
});
