const CACHE = 'sisel-v1';
const ASSETS = [
  '/sisel-gwanri/',
  '/sisel-gwanri/index.html'
];

// 설치 - 앱 파일 캐시
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 활성화 - 이전 캐시 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 요청 처리
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // data.json은 항상 네트워크 우선 (최신 데이터)
  if(url.pathname.includes('data.json')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // GitHub API는 네트워크 우선
  if(url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{}', {headers: {'Content-Type': 'application/json'}}))
    );
    return;
  }

  // 앱 파일은 캐시 우선 (오프라인 지원)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        // 성공하면 캐시에 저장
        if(res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
