/**
 * 离线草稿存储服务
 *
 * 需求6验收标准15: WHEN Editor 检测到网络断开 THEN System SHALL 切换到离线模式并使用 IndexedDB 本地保存草稿
 * 需求6验收标准9: WHILE Editor 处于编辑状态 THEN System SHALL 每30秒自动保存一次草稿（防抖机制）
 *
 * 功能：
 * - 使用 IndexedDB 存储草稿
 * - 支持离线编辑
 * - 网络恢复后自动同步
 * - 防抖自动保存（3秒）
 */

// ==================== 类型定义 ====================

export interface OfflineDraft {
  id: string; // 格式: workId:chapterId 或 'new:timestamp'
  workId: string | null;
  chapterId: string | null;
  title: string;
  content: string;
  cursorPosition: number;
  wordCount: number;
  lastSavedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
  serverVersion?: number; // 服务器版本号，用于冲突检测
}

export interface DraftConflict {
  localDraft: OfflineDraft;
  serverDraft: {
    content: string;
    title: string;
    updatedAt: Date;
  };
}

// ==================== IndexedDB 配置 ====================

const DB_NAME = 'project-anima-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

// ==================== IndexedDB 初始化 ====================

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB 不可用'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('无法打开数据库'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建草稿存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('workId', 'workId', { unique: false });
        store.createIndex('chapterId', 'chapterId', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('lastSavedAt', 'lastSavedAt', { unique: false });
      }
    };
  });

  return dbPromise;
}

// ==================== 草稿操作 ====================

/**
 * 生成草稿 ID
 */
export function generateDraftId(workId: string | null, chapterId: string | null): string {
  if (workId && chapterId) {
    return `${workId}:${chapterId}`;
  }
  return `new:${Date.now()}`;
}

/**
 * 保存草稿到 IndexedDB
 */
export async function saveDraftLocally(draft: Omit<OfflineDraft, 'id'>): Promise<OfflineDraft> {
  const db = await openDatabase();
  const id = generateDraftId(draft.workId, draft.chapterId);

  const fullDraft: OfflineDraft = {
    ...draft,
    id,
    lastSavedAt: new Date(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(fullDraft);

    request.onsuccess = () => resolve(fullDraft);
    request.onerror = () => reject(new Error('保存草稿失败'));
  });
}

/**
 * 获取草稿
 */
export async function getDraftLocally(
  workId: string | null,
  chapterId: string | null,
): Promise<OfflineDraft | null> {
  const db = await openDatabase();
  const id = generateDraftId(workId, chapterId);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error('获取草稿失败'));
  });
}

/**
 * 获取所有待同步的草稿
 */
export async function getPendingDrafts(): Promise<OfflineDraft[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('syncStatus');
    const request = index.getAll('pending');

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error('获取待同步草稿失败'));
  });
}

/**
 * 获取所有本地草稿
 */
export async function getAllLocalDrafts(): Promise<OfflineDraft[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const drafts = request.result || [];
      // 按最后保存时间排序
      drafts.sort((a, b) => new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime());
      resolve(drafts);
    };
    request.onerror = () => reject(new Error('获取草稿列表失败'));
  });
}

/**
 * 删除草稿
 */
export async function deleteDraftLocally(
  workId: string | null,
  chapterId: string | null,
): Promise<void> {
  const db = await openDatabase();
  const id = generateDraftId(workId, chapterId);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('删除草稿失败'));
  });
}

/**
 * 更新草稿同步状态
 */
export async function updateDraftSyncStatus(
  workId: string | null,
  chapterId: string | null,
  syncStatus: OfflineDraft['syncStatus'],
): Promise<void> {
  const draft = await getDraftLocally(workId, chapterId);
  if (draft) {
    draft.syncStatus = syncStatus;
    await saveDraftLocally(draft);
  }
}

/**
 * 清理已同步的旧草稿（保留最近 50 个）
 */
export async function cleanupOldDrafts(maxDrafts: number = 50): Promise<void> {
  const drafts = await getAllLocalDrafts();

  if (drafts.length <= maxDrafts) return;

  const db = await openDatabase();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  // 删除超出限制的旧草稿（优先删除已同步的）
  const syncedDrafts = drafts.filter((d) => d.syncStatus === 'synced');
  const toDelete = syncedDrafts.slice(maxDrafts);

  for (const draft of toDelete) {
    store.delete(draft.id);
  }
}

// ==================== 网络状态检测 ====================

/**
 * 检查是否在线
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * 监听网络状态变化
 */
export function onNetworkStatusChange(
  callback: (online: boolean) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ==================== 防抖自动保存 Hook ====================

import { useCallback, useRef, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface UseOfflineDraftOptions {
  workId: string | null;
  chapterId: string | null;
  /** 防抖延迟（毫秒），默认 3000 */
  debounceMs?: number;
  /** 服务器保存回调 */
  onServerSave?: (content: string, title: string) => Promise<void>;
  /** 冲突检测回调 */
  onConflict?: (conflict: DraftConflict) => void;
}

export interface UseOfflineDraftReturn {
  /** 保存草稿（会自动防抖） */
  saveDraft: (content: string, title: string, cursorPosition?: number) => void;
  /** 立即保存（不防抖） */
  saveImmediately: (content: string, title: string) => Promise<void>;
  /** 加载本地草稿 */
  loadLocalDraft: () => Promise<OfflineDraft | null>;
  /** 同步状态 */
  syncStatus: OfflineDraft['syncStatus'];
  /** 是否在线 */
  isOnline: boolean;
  /** 是否正在保存 */
  isSaving: boolean;
  /** 最后保存时间 */
  lastSavedAt: Date | null;
}

/**
 * 离线草稿 Hook
 *
 * 提供防抖自动保存、离线存储、网络恢复同步功能
 */
export function useOfflineDraft({
  workId,
  chapterId,
  debounceMs = 3000,
  onServerSave,
  onConflict: _onConflict,
}: UseOfflineDraftOptions): UseOfflineDraftReturn {
  const [syncStatus, setSyncStatus] = useState<OfflineDraft['syncStatus']>('synced');
  const [online, setOnline] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingContentRef = useRef<{ content: string; title: string } | null>(null);

  // 监听网络状态
  useEffect(() => {
    setOnline(isOnline());
    return onNetworkStatusChange(setOnline);
  }, []);

  // 网络恢复时同步
  useEffect(() => {
    if (online && syncStatus === 'pending') {
      syncPendingDrafts();
    }
  }, [online, syncStatus]);

  // 同步待处理的草稿
  const syncPendingDrafts = useCallback(async () => {
    if (!online) return;

    const pendingDrafts = await getPendingDrafts();
    for (const draft of pendingDrafts) {
      try {
        if (onServerSave) {
          await onServerSave(draft.content, draft.title);
        } else if (draft.workId && draft.chapterId) {
          await api.patch(`/works/${draft.workId}/chapters/${draft.chapterId}`, {
            content: draft.content,
            title: draft.title,
          });
        }
        await updateDraftSyncStatus(draft.workId, draft.chapterId, 'synced');
      } catch (error) {
        console.error('同步草稿失败:', error);
      }
    }

    setSyncStatus('synced');
  }, [online, onServerSave]);

  // 保存到本地和服务器
  const saveToLocalAndServer = useCallback(
    async (content: string, title: string, cursorPosition: number = 0) => {
      setIsSaving(true);

      try {
        // 计算字数
        const wordCount = calculateWordCount(content);

        // 先保存到本地
        const localDraft = await saveDraftLocally({
          workId,
          chapterId,
          title,
          content,
          cursorPosition,
          wordCount,
          syncStatus: online ? 'synced' : 'pending',
          lastSavedAt: new Date(),
        });

        setLastSavedAt(localDraft.lastSavedAt);

        // 如果在线，同步到服务器
        if (online) {
          try {
            if (onServerSave) {
              await onServerSave(content, title);
            } else if (workId && chapterId) {
              await api.patch(`/works/${workId}/chapters/${chapterId}`, {
                content,
                title,
              });
            }
            setSyncStatus('synced');
            await updateDraftSyncStatus(workId, chapterId, 'synced');
          } catch (error) {
            console.error('服务器保存失败，已保存到本地:', error);
            setSyncStatus('pending');
            await updateDraftSyncStatus(workId, chapterId, 'pending');
          }
        } else {
          setSyncStatus('pending');
        }
      } catch (error) {
        console.error('保存草稿失败:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [workId, chapterId, online, onServerSave],
  );

  // 防抖保存
  const saveDraft = useCallback(
    (content: string, title: string, cursorPosition?: number) => {
      pendingContentRef.current = { content, title };

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (pendingContentRef.current) {
          saveToLocalAndServer(
            pendingContentRef.current.content,
            pendingContentRef.current.title,
            cursorPosition,
          );
          pendingContentRef.current = null;
        }
      }, debounceMs);
    },
    [debounceMs, saveToLocalAndServer],
  );

  // 立即保存
  const saveImmediately = useCallback(
    async (content: string, title: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pendingContentRef.current = null;
      await saveToLocalAndServer(content, title);
    },
    [saveToLocalAndServer],
  );

  // 加载本地草稿
  const loadLocalDraft = useCallback(async () => {
    return getDraftLocally(workId, chapterId);
  }, [workId, chapterId]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    saveDraft,
    saveImmediately,
    loadLocalDraft,
    syncStatus,
    isOnline: online,
    isSaving,
    lastSavedAt,
  };
}

// ==================== 辅助函数 ====================

/**
 * 计算字数
 */
function calculateWordCount(content: string): number {
  const plainText = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/[#*_~`>-]/g, '')
    .trim();

  const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length;

  return chineseChars + englishWords;
}

export default {
  saveDraftLocally,
  getDraftLocally,
  getPendingDrafts,
  getAllLocalDrafts,
  deleteDraftLocally,
  updateDraftSyncStatus,
  cleanupOldDrafts,
  isOnline,
  onNetworkStatusChange,
  useOfflineDraft,
};
