'use client';

import { useEffect, useState, useCallback } from 'react';
import { BookOpen, Filter, Loader2, Bell, Trash2, MoreHorizontal } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuthStore } from '@/store/auth';
import { readingListService } from '@/services/reading-list';
import type {
  ReadingListItem,
  ReadingListStatus,
  ReadingListResponse,
} from '@/types/reading-list';
import { readingListStatusNames, readingListStatusIcons } from '@/types/reading-list';

const statusTabs: { value: ReadingListStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'READING', label: '在读' },
  { value: 'WANT_TO_READ', label: '想读' },
  { value: 'COMPLETED', label: '已读完' },
  { value: 'ON_HOLD', label: '暂停' },
  { value: 'DROPPED', label: '弃坑' },
];

/**
 * 阅读列表页面
 *
 * 需求 12.2.1: 阅读列表页面
 * 需求 12.2.2: 想读/在读/已读分类
 * 需求 12.2.3: 更新标记显示
 */
export default function ReadingListPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [data, setData] = useState<ReadingListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReadingListStatus | 'all'>('all');
  const [showUpdatesOnly, setShowUpdatesOnly] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // 加载数据
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await readingListService.getList({
        status: activeTab === 'all' ? undefined : activeTab,
        hasUpdate: showUpdatesOnly ? true : undefined,
        limit: 50,
      });
      setData(response);
    } catch (error) {
      console.error('Failed to load reading list:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, showUpdatesOnly]);

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/reading-list');
    }
  }, [authLoading, isAuthenticated, router]);

  // 加载数据
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // 更新状态
  const handleUpdateStatus = async (itemId: string, status: ReadingListStatus) => {
    try {
      await readingListService.updateItem(itemId, { status });
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // 移除
  const handleRemove = async (itemId: string) => {
    if (!confirm('确定要从阅读列表中移除吗？')) return;
    try {
      await readingListService.removeFromList(itemId);
      loadData();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  // 批量清除更新标记
  const handleClearUpdates = async () => {
    const itemsWithUpdates = data?.items.filter((item) => item.hasUpdate) || [];
    if (itemsWithUpdates.length === 0) return;

    try {
      await readingListService.batchUpdate(
        itemsWithUpdates.map((item) => item.id),
        { markAsRead: true },
      );
      loadData();
    } catch (error) {
      console.error('Failed to clear updates:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const updateCount = data?.items.filter((item) => item.hasUpdate).length || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
              <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                我的书架
              </h1>
              <p className="text-sm text-gray-500">
                共 {data?.total || 0} 本书
              </p>
            </div>
          </div>

          {updateCount > 0 && (
            <button
              onClick={handleClearUpdates}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            >
              <Bell className="w-4 h-4" />
              {updateCount} 本有更新
            </button>
          )}
        </div>

        {/* 状态标签 */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {statusTabs.map((tab) => {
            const count = tab.value === 'all'
              ? data?.total || 0
              : data?.statusCounts[tab.value] || 0;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`
                  px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors
                  ${activeTab === tab.value
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                  }
                `}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {/* 过滤器 */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showUpdatesOnly}
              onChange={(e) => setShowUpdatesOnly(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            只看有更新
          </label>
        </div>

        {/* 列表 */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : !data?.items.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <BookOpen className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">书架空空如也</p>
              <p className="text-sm mt-1">去发现一些好书吧</p>
              <Link
                href="/"
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                去发现
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.items.map((item) => (
                <ReadingListItemCard
                  key={item.id}
                  item={item}
                  onUpdateStatus={handleUpdateStatus}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/**
 * 阅读列表项卡片
 */
function ReadingListItemCard({
  item,
  onUpdateStatus,
  onRemove,
}: {
  item: ReadingListItem;
  onUpdateStatus: (itemId: string, status: ReadingListStatus) => void;
  onRemove: (itemId: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const timeAgo = item.lastReadAt
    ? formatDistanceToNow(new Date(item.lastReadAt), { addSuffix: true, locale: zhCN })
    : null;

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* 封面 */}
      <Link href={`/works/${item.workId}`} className="flex-shrink-0">
        <div className="relative w-16 h-24 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
          {item.work?.coverImage ? (
            <Image
              src={item.work.coverImage}
              alt={item.work.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <BookOpen className="w-8 h-8" />
            </div>
          )}
          {item.hasUpdate && (
            <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full" />
          )}
        </div>
      </Link>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/works/${item.workId}`}
              className="font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1"
            >
              {item.work?.title || '未知作品'}
              {item.hasUpdate && (
                <span className="ml-2 text-xs text-red-500">有更新</span>
              )}
            </Link>
            <p className="text-sm text-gray-500 mt-0.5">
              {item.work?.author?.displayName || item.work?.author?.username || '未知作者'}
            </p>
          </div>

          {/* 状态标签 */}
          <span className="flex-shrink-0 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {readingListStatusIcons[item.status]} {readingListStatusNames[item.status]}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          {timeAgo && <span>上次阅读 {timeAgo}</span>}
          {item.rating && (
            <span className="flex items-center gap-1">
              {'⭐'.repeat(item.rating)}
            </span>
          )}
        </div>

        {item.note && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
            备注：{item.note}
          </p>
        )}
      </div>

      {/* 操作菜单 */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
              {Object.entries(readingListStatusNames).map(([status, name]) => (
                <button
                  key={status}
                  onClick={() => {
                    onUpdateStatus(item.id, status as ReadingListStatus);
                    setShowMenu(false);
                  }}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                    ${item.status === status ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}
                  `}
                >
                  {readingListStatusIcons[status as ReadingListStatus]} {name}
                </button>
              ))}
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => {
                  onRemove(item.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                移除
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
