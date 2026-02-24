'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import {
  ArrowLeft,
  Flame,
  GitBranch,
  Coins,
  Settings,
  Plus,
  Loader2,
  Share2,
  BookOpen,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { UserAvatar } from '@/components/user/UserAvatar';
import { libraryService } from '@/services/library.service';
import { useAuthStore } from '@/store/auth';

// Lazy load heavy components to avoid undefined import issues
import dynamic from 'next/dynamic';
const BranchList = dynamic(() => import('@/components/library/BranchList'), { ssr: false });
const BranchCreator = dynamic(() => import('@/components/library/BranchCreator'), { ssr: false });
const RevenueSettings = dynamic(() => import('@/components/library/RevenueSettings'), { ssr: false });
import { cn } from '@/utils/cn';
import type { LibraryDetail, LibraryBranch, UpdateLibrarySettingsDto } from '@/types/library';
import { LIBRARY_TYPE_NAMES } from '@/types/library';

/**
 * 格式化数字
 */
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

/**
 * 格式化金额（分转元）
 */
function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * 小说库详情页面
 *
 * 需求1.1: 显示小说库信息
 * 需求2.2: 显示分支列表
 *
 * 功能:
 * - 显示库信息（标题、描述、封面、拥有者、统计数据）
 * - 显示 BranchList 组件，支持 Tab 切换
 * - 库拥有者可访问设置面板
 * - 支持创建新分支
 */
export default function LibraryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const libraryId = params.id as string;

  // 状态
  const [library, setLibrary] = useState<LibraryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI 状态
  const [showSettings, setShowSettings] = useState(false);
  const [showBranchCreator, setShowBranchCreator] = useState(false);

  // 是否是库拥有者
  const isOwner = user?.id === library?.owner.id;

  /**
   * 加载库详情
   */
  const loadLibrary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await libraryService.getLibraryById(libraryId);
      setLibrary(data);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [libraryId]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  /**
   * 保存设置
   */
  const handleSaveSettings = useCallback(
    async (settings: UpdateLibrarySettingsDto) => {
      await libraryService.updateLibrarySettings(libraryId, settings);
      // 重新加载库信息
      const data = await libraryService.getLibraryById(libraryId);
      setLibrary(data);
    },
    [libraryId]
  );

  /**
   * 分支创建成功
   */
  const handleBranchCreated = useCallback((branch: LibraryBranch) => {
    setShowBranchCreator(false);
    // 跳转到分支详情页
    router.push(`/branches/${branch.id}`);
  }, [router]);

  /**
   * 返回上一页
   */
  const handleBack = () => {
    router.back();
  };

  /**
   * 分享
   */
  const handleShare = async () => {
    if (navigator.share && library) {
      try {
        await navigator.share({
          title: library.title,
          text: library.description || `查看小说库：${library.title}`,
          url: window.location.href,
        });
      } catch {
        // 用户取消分享
      }
    } else {
      // 复制链接
      await navigator.clipboard.writeText(window.location.href);
      // TODO: 显示提示
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-purple-50/30 dark:from-gray-900 dark:to-gray-900">
        <Header />
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !library) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-purple-50/30 dark:from-gray-900 dark:to-gray-900">
        <Header />
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-red-500 mb-4">{error || '小说库不存在'}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-purple-50/30 dark:from-gray-900 dark:to-gray-900">
      <Header />

      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100/50 dark:border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">返回</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="分享"
            >
              <Share2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            {isOwner && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  'p-2 rounded-full transition-colors',
                  showSettings
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
                )}
                aria-label="设置"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 库信息卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'relative overflow-hidden rounded-2xl mb-6',
            'bg-white/70 dark:bg-gray-900/70',
            'backdrop-blur-xl',
            'border border-white/30 dark:border-gray-700/30',
            'shadow-lg shadow-indigo-500/5'
          )}
        >
          {/* 封面背景 */}
          <div className="relative h-48 overflow-hidden">
            {library.coverImage ? (
              <Image
                src={library.coverImage}
                alt={library.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600" />
            )}
            {/* 渐变遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* 库类型徽章 */}
            <div className="absolute top-4 right-4">
              <span
                className={cn(
                  'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium',
                  'backdrop-blur-sm',
                  library.libraryType === 'ORIGINAL'
                    ? 'bg-indigo-500/80 text-white'
                    : 'bg-emerald-500/80 text-white'
                )}
              >
                {LIBRARY_TYPE_NAMES[library.libraryType]}
              </span>
            </div>

            {/* 标题和拥有者 */}
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-2xl font-bold text-white mb-2 line-clamp-2">
                {library.title}
              </h1>
              <div className="flex items-center gap-2">
                <UserAvatar
                  avatar={library.owner.avatar}
                  username={library.owner.username}
                  displayName={library.owner.displayName}
                  size="sm"
                />
                <span className="text-sm text-white/90">
                  {library.owner.displayName || library.owner.username}
                </span>
              </div>
            </div>
          </div>

          {/* 统计数据 */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col items-center py-4">
              <div className="flex items-center gap-1.5 text-orange-500 mb-1">
                <Flame className="w-5 h-5" />
                <span className="text-lg font-bold">{formatNumber(library.stats.hotScore)}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">热度</span>
            </div>
            <div className="flex flex-col items-center py-4">
              <div className="flex items-center gap-1.5 text-purple-500 mb-1">
                <GitBranch className="w-5 h-5" />
                <span className="text-lg font-bold">{formatNumber(library.stats.branchCount)}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">分支</span>
            </div>
            <div className="flex flex-col items-center py-4">
              <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                <Coins className="w-5 h-5" />
                <span className="text-lg font-bold">¥{formatAmount(library.stats.totalTipAmount)}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">打赏</span>
            </div>
          </div>

          {/* 描述 */}
          {library.description && (
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {library.description}
              </p>
            </div>
          )}

          {/* 原作信息 */}
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
              <BookOpen className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">原作</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {library.work.title}
              </p>
            </div>
            <button
              onClick={async () => {
                // 获取作品详情，跳转到第一章
                try {
                  const response = await fetch(`http://localhost:3001/api/v1/works/${library.workId}`);
                  const data = await response.json();
                  if (data.success && data.data.chapters?.length > 0) {
                    const firstChapter = data.data.chapters[0];
                    router.push(`/read/${library.workId}/${firstChapter.id}`);
                  } else {
                    alert('该作品暂无章节');
                  }
                } catch (err) {
                  console.error('Failed to get work details:', err);
                  alert('获取作品信息失败');
                }
              }}
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
            >
              查看原作
            </button>
          </div>
        </motion.div>

        {/* 设置面板（仅库拥有者可见） */}
        <AnimatePresence>
          {showSettings && isOwner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <RevenueSettings
                library={{
                  id: library.id,
                  ownerCutPercent: library.settings.ownerCutPercent,
                  uploadFeeType: library.settings.uploadFeeType,
                  uploadFeeRate: library.settings.uploadFeeRate,
                }}
                onSave={handleSaveSettings}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 创建分支按钮 */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowBranchCreator(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full',
              'bg-gradient-to-r from-indigo-500 to-purple-500 text-white',
              'font-medium text-sm',
              'shadow-md shadow-indigo-500/25',
              'hover:from-indigo-600 hover:to-purple-600',
              'transition-all duration-200'
            )}
          >
            <Plus className="w-4 h-4" />
            创建分支
          </button>
        </div>

        {/* 分支列表 */}
        <BranchList libraryId={libraryId} />
      </main>

      {/* 分支创建器弹窗 */}
      <AnimatePresence>
        {showBranchCreator && (
          <BranchCreator
            libraryId={libraryId}
            onSuccess={handleBranchCreated}
            onCancel={() => setShowBranchCreator(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
