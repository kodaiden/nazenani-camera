/* Service Worker for なぜ？なに？カメラ
   - 静的ファイル（HTML/CSS/JS/アイコン）はキャッシュから返す
   - API呼び出し（/analyze）は常にネットワーク
*/
const CACHE = "nazenani-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.png",
];

// インストール時: 静的ファイルをキャッシュに先読み
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 有効化時: 古いキャッシュを掃除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// リクエストを捕まえる
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API呼び出しはキャッシュせずネットワーク直行
  if (url.pathname === "/analyze") {
    return; // デフォルト動作（ネットワーク）に任せる
  }

  // それ以外: キャッシュ優先、なければネットワーク
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        // 同一オリジンのGET成功のみキャッシュに追加
        if (res.ok && event.request.method === "GET" && url.origin === self.origin) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
        }
        return res;
      }).catch(() => {
        // オフラインで何もない場合
        return new Response("オフラインです", { status: 503 });
      });
    })
  );
});
