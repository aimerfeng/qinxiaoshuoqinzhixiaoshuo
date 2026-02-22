/**
 * Service Worker for Project Anima
 *
 * 需求11: 离线与本地存储
 * - 11.1.2 静态资源缓存策略
 * - 11.1.3 章节内容缓存
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `anima-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `anima-dynamic-${CACHE_VERSION}`;
const CHAPTER_CACHE = `anima-chapters-${CACHE_VERSION}`;

// 预缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
];

// 需要缓存的 API 路径模式
const CACHEABLE_API_PATTERNS = [
  /\/api\/v1\/chapters\/[^/]+$/,  // 章节内容
  /\/api\/v1\/works\/[^/]+$/,     // 作品详情
];

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('anima-') && 
                     name !== STATIC_CACHE && 
                     name !== DYNAMIC_CACHE &&
                     name !== CHAPTER_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 请求拦截
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') return;

  // 跳过 chrome-extension 等非 http(s) 请求
  if (!url.protocol.startsWith('http')) return;

  // API 请求处理
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 静态资源处理
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // 页面请求 - Network First
  event.respondWith(handlePageRequest(request));
});

/**
 * 处理 API 请求 - Network First with Cache Fallback
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(url.pathname));

  try {
    const response = await fetch(request);
    
    // 缓存可缓存的 API 响应
    if (response.ok && isCacheable) {
      const cache = await caches.open(CHAPTER_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // 网络失败时尝试从缓存获取
    if (isCacheable) {
      const cached = await caches.match(request);
      if (cached) {
        console.log('[SW] Serving cached API response:', url.pathname);
        return cached;
      }
    }
    
    // 返回离线响应
    return new Response(
      JSON.stringify({ error: 'offline', message: '网络不可用' }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * 处理静态资源请求 - Cache First
 */
async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Static asset fetch failed:', request.url);
    return new Response('', { status: 404 });
  }
}

/**
 * 处理页面请求 - Network First with Offline Fallback
 */
async function handlePageRequest(request) {
  try {
    const response = await fetch(request);
    
    // 缓存成功的页面响应
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // 尝试从缓存获取
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // 返回离线页面
    const offlinePage = await caches.match('/offline');
    if (offlinePage) {
      return offlinePage;
    }
    
    return new Response('离线状态', { status: 503 });
  }
}

/**
 * 判断是否为静态资源
 */
function isStaticAsset(pathname) {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', 
    '.ico', '.woff', '.woff2', '.ttf', '.eot'
  ];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

// 监听来自页面的消息
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'CACHE_CHAPTER':
      cacheChapter(payload);
      break;
    case 'CLEAR_CHAPTER_CACHE':
      clearChapterCache(payload);
      break;
    case 'GET_CACHE_SIZE':
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      });
      break;
  }
});

/**
 * 缓存章节内容
 */
async function cacheChapter({ chapterId, content }) {
  const cache = await caches.open(CHAPTER_CACHE);
  const url = `/api/v1/chapters/${chapterId}`;
  const response = new Response(JSON.stringify(content), {
    headers: { 'Content-Type': 'application/json' }
  });
  await cache.put(url, response);
  console.log('[SW] Cached chapter:', chapterId);
}

/**
 * 清理章节缓存
 */
async function clearChapterCache({ chapterId }) {
  const cache = await caches.open(CHAPTER_CACHE);
  if (chapterId) {
    await cache.delete(`/api/v1/chapters/${chapterId}`);
    console.log('[SW] Cleared chapter cache:', chapterId);
  } else {
    // 清理所有章节缓存
    const keys = await cache.keys();
    await Promise.all(keys.map((key) => cache.delete(key)));
    console.log('[SW] Cleared all chapter cache');
  }
}

/**
 * 获取缓存大小
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const name of cacheNames) {
    if (!name.startsWith('anima-')) continue;
    
    const cache = await caches.open(name);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.clone().blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}
