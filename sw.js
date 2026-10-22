/* =====================================================================
 * Service Worker：实时识谱练习 PWA
 * 策略：网络优先（保证开发迭代始终拿到新版），失败时回退缓存（离线可打开）。
 * 更新版本时递增 CACHE 名称即可清除旧缓存。
 * ===================================================================== */
const CACHE = "score-practice-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

/* 安装：预缓存核心资产 */
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* 激活：清理旧版本缓存 */
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 请求拦截：网络优先（强制绕过 HTTP 缓存），失败回退缓存；导航请求最终回退到 index.html */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const isDoc = e.request.mode === "navigate" ||
                new URL(e.request.url).pathname.endsWith("/index.html");
  // 页面文档不走浏览器 HTTP 缓存，避免拿到旧界面
  const req = isDoc ? new Request(e.request.url, { cache: "no-store" }) : e.request;
  e.respondWith(
    fetch(req)
      .then(resp => {
        // 同源 GET 成功响应 → 顺手更新缓存
        if (resp.ok && new URL(e.request.url).origin === self.location.origin) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true })
          .then(r => r || caches.match("./index.html"))
      )
  );
});
