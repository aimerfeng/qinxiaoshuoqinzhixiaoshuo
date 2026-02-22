/**
 * 离线存储服务 - IndexedDB 封装
 *
 * 需求 11.2.1: IndexedDB 存储封装
 * 需求 11.2.2: 离线阅读支持
 */

const DB_NAME = 'anima-offline';
const DB_VERSION = 1;

// 存储对象名称
const STORES = {
  CHAPTERS: 'chapters',
  READING_PROGRESS: 'reading_progress',
  SETTINGS: 'settings',
  CACHE_META: 'cache_meta',
} as const;

interface CachedChapter {
  id: string;
  workId: string;
  title: string;
  content: string;
  orderIndex: number;
  cachedAt: number;
  size: number;
}

interface CachedProgress {
  chapterId: string;
  paragraphIndex: number;
  scrollPosition: number;
  readPercentage: number;
  updatedAt: number;
  synced: boolean;
}

interface CacheMeta {
  key: string;
  size: number;
  cachedAt: number;
  lastAccessed: number;
}

let db: IDBDatabase | null = null;

/**
 * 打开数据库连接
 */
async function openDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // 章节存储
      if (!database.objectStoreNames.contains(STORES.CHAPTERS)) {
        const chaptersStore = database.createObjectStore(STORES.CHAPTERS, { keyPath: 'id' });
        chaptersStore.createIndex('workId', 'workId', { unique: false });
        chaptersStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      // 阅读进度存储
      if (!database.objectStoreNames.contains(STORES.READING_PROGRESS)) {
        const progressStore = database.createObjectStore(STORES.READING_PROGRESS, { keyPath: 'chapterId' });
        progressStore.createIndex('synced', 'synced', { unique: false });
        progressStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 设置存储
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      // 缓存元数据
      if (!database.objectStoreNames.contains(STORES.CACHE_META)) {
        const metaStore = database.createObjectStore(STORES.CACHE_META, { keyPath: 'key' });
        metaStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        metaStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
      }
    };
  });
}

/**
 * 离线存储服务
 */
export const offlineStorage = {
  /**
   * 保存章节到离线存储
   */
  async saveChapter(chapter: Omit<CachedChapter, 'cachedAt' | 'size'>): Promise<void> {
    const database = await openDB();
    const size = new Blob([chapter.content]).size;
    
    const data: CachedChapter = {
      ...chapter,
      cachedAt: Date.now(),
      size,
    };

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.CHAPTERS, STORES.CACHE_META], 'readwrite');
      
      transaction.objectStore(STORES.CHAPTERS).put(data);
      transaction.objectStore(STORES.CACHE_META).put({
        key: `chapter:${chapter.id}`,
        size,
        cachedAt: Date.now(),
        lastAccessed: Date.now(),
      } as CacheMeta);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  /**
   * 获取离线章节
   */
  async getChapter(chapterId: string): Promise<CachedChapter | null> {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.CHAPTERS, STORES.CACHE_META], 'readwrite');
      const request = transaction.objectStore(STORES.CHAPTERS).get(chapterId);

      request.onsuccess = () => {
        const chapter = request.result as CachedChapter | undefined;
        if (chapter) {
          // 更新最后访问时间
          transaction.objectStore(STORES.CACHE_META).put({
            key: `chapter:${chapterId}`,
            size: chapter.size,
            cachedAt: chapter.cachedAt,
            lastAccessed: Date.now(),
          } as CacheMeta);
        }
        resolve(chapter || null);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 获取作品的所有离线章节
   */
  async getWorkChapters(workId: string): Promise<CachedChapter[]> {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.CHAPTERS, 'readonly');
      const index = transaction.objectStore(STORES.CHAPTERS).index('workId');
      const request = index.getAll(workId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 删除离线章节
   */
  async deleteChapter(chapterId: string): Promise<void> {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.CHAPTERS, STORES.CACHE_META], 'readwrite');
      
      transaction.objectStore(STORES.CHAPTERS).delete(chapterId);
      transaction.objectStore(STORES.CACHE_META).delete(`chapter:${chapterId}`);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },


  /**
   * 保存阅读进度
   */
  async saveProgress(progress: Omit<CachedProgress, 'updatedAt' | 'synced'>): Promise<void> {
    const database = await openDB();
    
    const data: CachedProgress = {
      ...progress,
      updatedAt: Date.now(),
      synced: false,
    };

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.READING_PROGRESS, 'readwrite');
      transaction.objectStore(STORES.READING_PROGRESS).put(data);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  /**
   * 获取阅读进度
   */
  async getProgress(chapterId: string): Promise<CachedProgress | null> {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.READING_PROGRESS, 'readonly');
      const request = transaction.objectStore(STORES.READING_PROGRESS).get(chapterId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 获取未同步的进度
   */
  async getUnsyncedProgress(): Promise<CachedProgress[]> {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.READING_PROGRESS, 'readonly');
      const index = transaction.objectStore(STORES.READING_PROGRESS).index('synced');
      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 标记进度为已同步
   */
  async markProgressSynced(chapterIds: string[]): Promise<void> {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.READING_PROGRESS, 'readwrite');
      const store = transaction.objectStore(STORES.READING_PROGRESS);

      chapterIds.forEach((chapterId) => {
        const request = store.get(chapterId);
        request.onsuccess = () => {
          const progress = request.result as CachedProgress | undefined;
          if (progress) {
            store.put({ ...progress, synced: true });
          }
        };
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  /**
   * 保存设置
   */
  async saveSetting(key: string, value: unknown): Promise<void> {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.SETTINGS, 'readwrite');
      transaction.objectStore(STORES.SETTINGS).put({ key, value });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  /**
   * 获取设置
   */
  async getSetting<T>(key: string): Promise<T | null> {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.SETTINGS, 'readonly');
      const request = transaction.objectStore(STORES.SETTINGS).get(key);

      request.onsuccess = () => {
        const result = request.result as { key: string; value: T } | undefined;
        resolve(result?.value ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 获取缓存总大小
   */
  async getCacheSize(): Promise<number> {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.CACHE_META, 'readonly');
      const request = transaction.objectStore(STORES.CACHE_META).getAll();

      request.onsuccess = () => {
        const metas = request.result as CacheMeta[];
        const totalSize = metas.reduce((sum, meta) => sum + meta.size, 0);
        resolve(totalSize);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * 清理旧缓存（LRU 策略）
   * @param maxSize 最大缓存大小（字节）
   */
  async cleanupCache(maxSize: number = 100 * 1024 * 1024): Promise<number> {
    const database = await openDB();
    const currentSize = await this.getCacheSize();

    if (currentSize <= maxSize) return 0;

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.CHAPTERS, STORES.CACHE_META], 'readwrite');
      const metaStore = transaction.objectStore(STORES.CACHE_META);
      const chaptersStore = transaction.objectStore(STORES.CHAPTERS);
      
      const index = metaStore.index('lastAccessed');
      const request = index.openCursor();
      
      let freedSize = 0;
      const targetFree = currentSize - maxSize;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && freedSize < targetFree) {
          const meta = cursor.value as CacheMeta;
          
          if (meta.key.startsWith('chapter:')) {
            const chapterId = meta.key.replace('chapter:', '');
            chaptersStore.delete(chapterId);
            metaStore.delete(meta.key);
            freedSize += meta.size;
          }
          
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve(freedSize);
      transaction.onerror = () => reject(transaction.error);
    });
  },

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        [STORES.CHAPTERS, STORES.READING_PROGRESS, STORES.CACHE_META],
        'readwrite'
      );

      transaction.objectStore(STORES.CHAPTERS).clear();
      transaction.objectStore(STORES.READING_PROGRESS).clear();
      transaction.objectStore(STORES.CACHE_META).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },
};

export default offlineStorage;
