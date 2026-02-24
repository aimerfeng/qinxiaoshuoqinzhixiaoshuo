'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import {
  ArrowLeft,
  GitBranch,
  Eye,
  Heart,
  Coins,
  Flame,
  Share2,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Edit3,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { UserAvatar } from '@/components/user/UserAvatar';
import { SuggestionSidebar } from '@/components/library/SuggestionSidebar';
import { libraryService } from '@/services/library.service';
import { getChapterContent, getChapterList } from '@/services/reader';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/utils/cn';
import type { CreateSuggestionDto } from '@/types/library';
import type { Paragraph } from '@/types/reader';
import { BRANCH_TYPE_NAMES, DERIVATIVE_TYPE_NAMES } from '@/types/library';

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
 * 分支阅读页面
 *
 * 需求2.3: 显示分支创作者信息和分支点位置
 * 需求4.5: 支持翻页阅读器界面
 * 需求5.1: 支持段落选择和创建修订建议
 * 需求6.1: 支持打赏功能
 *
 * 功能:
 * - 显示分支内容（章节和段落）
 * - 显示分支点信息（从哪个章节/段落分叉）
 * - 支持段落选择创建修订建议（打开 SuggestionSidebar）
 * - 支持打赏分支创作者
 * - 显示分支统计数据（点赞、阅读量、打赏、热度）
 * - 显示创作者信息
 */
export default function BranchReadingPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const branchId = params.id as string;
  const contentRef = useRef<HTMLDivElement>(null);

  // 状态
  const [selectedParagraph, setSelectedParagraph] = useState<{
    id: string;
    content: string;
    anchorId: string;
  } | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(100);
  const [tipMessage, setTipMessage] = useState('');
  const [isTipping, setIsTipping] = useState(false);
  const [showForkInfo, setShowForkInfo] = useState(true);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);

  // 获取分支详情
  const {
    data: branch,
    isLoading: isBranchLoading,
    error: branchError,
    refetch: refetchBranch,
  } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => libraryService.getBranchById(branchId),
    staleTime: 5 * 60 * 1000,
  });

  // 获取章节列表
  const { data: chapterList, isLoading: isChapterListLoading } = useQuery({
    queryKey: ['chapters', branch?.workId],
    queryFn: () => getChapterList(branch!.workId),
    enabled: !!branch?.workId,
    staleTime: 5 * 60 * 1000,
  });

  // 设置默认章节
  useEffect(() => {
    if (chapterList?.chapters && chapterList.chapters.length > 0 && !currentChapterId) {
      setCurrentChapterId(chapterList.chapters[0].id);
    }
  }, [chapterList, currentChapterId]);

  // 获取当前章节内容
  const {
    data: chapterContent,
    isLoading: isContentLoading,
  } = useQuery({
    queryKey: ['chapterContent', branch?.workId, currentChapterId],
    queryFn: () => getChapterContent(branch!.workId, currentChapterId!),
    enabled: !!branch?.workId && !!currentChapterId,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * 处理段落点击 - 打开建议侧边栏
   */
  const handleParagraphClick = useCallback(
    (paragraph: Paragraph) => {
      if (!isAuthenticated) {
        // TODO: 提示登录
        return;
      }
      setSelectedParagraph({
        id: paragraph.id,
        content: paragraph.content,
        anchorId: paragraph.anchorId,
      });
    },
    [isAuthenticated]
  );

  /**
   * 关闭建议侧边栏
   */
  const handleCloseSidebar = useCallback(() => {
    setSelectedParagraph(null);
  }, []);

  /**
   * 提交修订建议
   */
  const handleSubmitSuggestion = useCallback(
    async (suggestion: CreateSuggestionDto) => {
      if (!selectedParagraph) return;
      await libraryService.createSuggestion(selectedParagraph.id, suggestion);
      setSelectedParagraph(null);
    },
    [selectedParagraph]
  );

  /**
   * 打赏分支
   */
  const handleTip = useCallback(async () => {
    if (!branch || !isAuthenticated) return;

    setIsTipping(true);
    try {
      await libraryService.tipBranch(branchId, {
        amount: tipAmount,
        message: tipMessage || undefined,
      });
      setShowTipModal(false);
      setTipAmount(100);
      setTipMessage('');
      // 刷新分支数据
      refetchBranch();
    } catch (err: any) {
      // TODO: 显示错误提示
      console.error('打赏失败:', err);
    } finally {
      setIsTipping(false);
    }
  }, [branch, branchId, isAuthenticated, tipAmount, tipMessage, refetchBranch]);

  /**
   * 切换章节
   */
  const handleChapterChange = useCallback((chapterId: string) => {
    setCurrentChapterId(chapterId);
    // 滚动到顶部
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
    if (navigator.share && branch) {
      try {
        await navigator.share({
          title: branch.title,
          text: branch.description || `查看分支：${branch.title}`,
          url: window.location.href,
        });
      } catch {
        // 用户取消分享
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  // 加载状态
  if (isBranchLoading) {
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
  if (branchError || !branch) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-purple-50/30 dark:from-gray-900 dark:to-gray-900">
        <Header />
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-red-500 mb-4">
            {branchError instanceof Error ? branchError.message : '分支不存在'}
          </p>
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

  const currentChapter = chapterList?.chapters.find((c) => c.id === currentChapterId);

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
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 分支信息卡片 */}
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
          <div className="relative h-40 overflow-hidden">
            {branch.coverImage ? (
              <Image
                src={branch.coverImage}
                alt={branch.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* 分支类型徽章 */}
            <div className="absolute top-4 right-4 flex gap-2">
              <span
                className={cn(
                  'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium',
                  'backdrop-blur-sm',
                  branch.branchType === 'MAIN'
                    ? 'bg-indigo-500/80 text-white'
                    : branch.branchType === 'DERIVATIVE'
                    ? 'bg-purple-500/80 text-white'
                    : 'bg-pink-500/80 text-white'
                )}
              >
                <GitBranch className="w-4 h-4 mr-1" />
                {BRANCH_TYPE_NAMES[branch.branchType]}
              </span>
              {branch.derivativeType && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm bg-amber-500/80 text-white">
                  {DERIVATIVE_TYPE_NAMES[branch.derivativeType]}
                </span>
              )}
            </div>

            {/* 标题和创作者 */}
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-xl font-bold text-white mb-2 line-clamp-2">
                {branch.title}
              </h1>
              <div className="flex items-center gap-2">
                <UserAvatar
                  avatar={branch.creator.avatar}
                  username={branch.creator.username}
                  displayName={branch.creator.displayName}
                  size="sm"
                />
                <span className="text-sm text-white/90">
                  {branch.creator.displayName || branch.creator.username}
                </span>
              </div>
            </div>
          </div>

          {/* 统计数据 */}
          <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col items-center py-3">
              <div className="flex items-center gap-1 text-orange-500 mb-0.5">
                <Flame className="w-4 h-4" />
                <span className="text-sm font-bold">{formatNumber(branch.stats.hotScore)}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">热度</span>
            </div>
            <div className="flex flex-col items-center py-3">
              <div className="flex items-center gap-1 text-pink-500 mb-0.5">
                <Heart className="w-4 h-4" />
                <span className="text-sm font-bold">{formatNumber(branch.stats.likeCount)}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">点赞</span>
            </div>
            <div className="flex flex-col items-center py-3">
              <div className="flex items-center gap-1 text-blue-500 mb-0.5">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-bold">{formatNumber(branch.stats.viewCount)}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">阅读</span>
            </div>
            <div className="flex flex-col items-center py-3">
              <div className="flex items-center gap-1 text-amber-500 mb-0.5">
                <Coins className="w-4 h-4" />
                <span className="text-sm font-bold">¥{formatAmount(branch.stats.tipAmount)}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">打赏</span>
            </div>
          </div>

          {/* 分支点信息 - 需求2.3 */}
          {(branch.forkPoint.chapterId || branch.forkPoint.paragraphId) && (
            <div className="border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setShowForkInfo(!showForkInfo)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                    <GitBranch className="w-4 h-4 text-purple-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    分支点信息
                  </span>
                </div>
                {showForkInfo ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <AnimatePresence>
                {showForkInfo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {branch.forkPoint.chapterTitle && (
                        <div className="flex items-start gap-2">
                          <BookOpen className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">分叉章节</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {branch.forkPoint.chapterTitle}
                            </p>
                          </div>
                        </div>
                      )}
                      {branch.forkPoint.paragraphContent && (
                        <div className="flex items-start gap-2">
                          <Edit3 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">分叉段落</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 italic">
                              "{branch.forkPoint.paragraphContent}"
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* 描述 */}
          {branch.description && (
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {branch.description}
              </p>
            </div>
          )}
        </motion.div>

        {/* 打赏按钮 */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowTipModal(true)}
            disabled={!isAuthenticated || branch.creator.id === user?.id}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-full',
              'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
              'font-medium text-sm',
              'shadow-md shadow-amber-500/25',
              'hover:from-amber-600 hover:to-orange-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200'
            )}
          >
            <Coins className="w-4 h-4" />
            打赏创作者
          </button>
        </div>

        {/* 章节选择器 */}
        {chapterList && chapterList.chapters.length > 0 && (
          <div className="mb-4">
            <select
              value={currentChapterId || ''}
              onChange={(e) => handleChapterChange(e.target.value)}
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'bg-white/70 dark:bg-gray-800/70',
                'border border-gray-200 dark:border-gray-700',
                'text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
                'transition-colors'
              )}
            >
              {chapterList.chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 内容区域 */}
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'rounded-2xl overflow-hidden',
            'bg-white/70 dark:bg-gray-900/70',
            'backdrop-blur-xl',
            'border border-white/30 dark:border-gray-700/30',
            'shadow-lg shadow-indigo-500/5'
          )}
        >
          {/* 章节标题 */}
          {currentChapter && (
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentChapter.title}
              </h2>
            </div>
          )}

          {/* 段落内容 */}
          <div className="p-6">
            {isContentLoading || isChapterListLoading ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">加载内容中...</p>
              </div>
            ) : chapterContent?.paragraphs && chapterContent.paragraphs.length > 0 ? (
              <div className="space-y-4">
                {chapterContent.paragraphs.map((paragraph) => (
                  <ParagraphBlock
                    key={paragraph.id}
                    paragraph={paragraph}
                    onClick={() => handleParagraphClick(paragraph)}
                    isAuthenticated={isAuthenticated}
                  />
                ))}
              </div>
            ) : chapterContent?.content ? (
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {chapterContent.content}
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">暂无内容</p>
              </div>
            )}
          </div>

          {/* 章节导航 */}
          {chapterContent && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between">
              <button
                onClick={() =>
                  chapterContent.prevChapter &&
                  handleChapterChange(chapterContent.prevChapter.id)
                }
                disabled={!chapterContent.prevChapter}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'transition-colors',
                  chapterContent.prevChapter
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                )}
              >
                上一章
              </button>
              <button
                onClick={() =>
                  chapterContent.nextChapter &&
                  handleChapterChange(chapterContent.nextChapter.id)
                }
                disabled={!chapterContent.nextChapter}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'transition-colors',
                  chapterContent.nextChapter
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                )}
              >
                下一章
              </button>
            </div>
          )}
        </motion.div>
      </main>

      {/* 修订建议侧边栏 - 需求5.1 */}
      <AnimatePresence>
        {selectedParagraph && (
          <SuggestionSidebar
            paragraph={selectedParagraph}
            branchId={branchId}
            onClose={handleCloseSidebar}
            onSubmit={handleSubmitSuggestion}
          />
        )}
      </AnimatePresence>

      {/* 打赏弹窗 - 需求6.1 */}
      <AnimatePresence>
        {showTipModal && (
          <TipModal
            creatorName={branch.creator.displayName || branch.creator.username}
            amount={tipAmount}
            message={tipMessage}
            isTipping={isTipping}
            onAmountChange={setTipAmount}
            onMessageChange={setTipMessage}
            onConfirm={handleTip}
            onClose={() => setShowTipModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


/**
 * 段落块组件
 * 支持点击选择创建修订建议
 */
interface ParagraphBlockProps {
  paragraph: Paragraph;
  onClick: () => void;
  isAuthenticated: boolean;
}

function ParagraphBlock({ paragraph, onClick, isAuthenticated }: ParagraphBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      data-anchor-id={paragraph.anchorId}
      className={cn(
        'relative group rounded-lg transition-all duration-200',
        isAuthenticated && 'cursor-pointer',
        isHovered && isAuthenticated && 'bg-indigo-50/50 dark:bg-indigo-900/20'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isAuthenticated ? onClick : undefined}
    >
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed py-2 px-3">
        {paragraph.content}
      </p>

      {/* 悬浮提示 */}
      {isAuthenticated && isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full',
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
            'bg-indigo-500 text-white text-xs font-medium',
            'shadow-lg shadow-indigo-500/25',
            'whitespace-nowrap'
          )}
        >
          <Edit3 className="w-3 h-3" />
          提交建议
        </motion.div>
      )}

      {/* 锚点标记 */}
      <span className="absolute left-0 top-2 -translate-x-full pr-2 text-xs text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
        #{paragraph.anchorId}
      </span>
    </div>
  );
}

/**
 * 打赏弹窗组件
 */
interface TipModalProps {
  creatorName: string;
  amount: number;
  message: string;
  isTipping: boolean;
  onAmountChange: (amount: number) => void;
  onMessageChange: (message: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const TIP_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];

function TipModal({
  creatorName,
  amount,
  message,
  isTipping,
  onAmountChange,
  onMessageChange,
  onConfirm,
  onClose,
}: TipModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-md rounded-2xl overflow-hidden',
          'bg-white dark:bg-gray-900',
          'shadow-2xl'
        )}
      >
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            打赏 {creatorName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            感谢创作者的精彩内容
          </p>
        </div>

        {/* 金额选择 */}
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            选择金额
          </label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {TIP_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => onAmountChange(amt)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium',
                  'border transition-all duration-200',
                  amount === amt
                    ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                ¥{(amt / 100).toFixed(amt % 100 === 0 ? 0 : 2)}
              </button>
            ))}
          </div>

          {/* 自定义金额 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              自定义金额（分）
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => onAmountChange(Math.max(1, parseInt(e.target.value) || 0))}
              min={1}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl',
                'bg-white dark:bg-gray-800',
                'border border-gray-200 dark:border-gray-700',
                'text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                'transition-colors'
              )}
            />
          </div>

          {/* 留言 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              留言（可选）
            </label>
            <textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="写点什么鼓励创作者..."
              rows={3}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl resize-none',
                'bg-white dark:bg-gray-800',
                'border border-gray-200 dark:border-gray-700',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                'transition-colors'
              )}
            />
          </div>

          {/* 金额显示 */}
          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 mb-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">打赏金额</span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
              ¥{(amount / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-700 dark:text-gray-300 font-medium',
              'hover:bg-gray-50 dark:hover:bg-gray-800',
              'transition-colors'
            )}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={isTipping || amount <= 0}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
              'bg-gradient-to-r from-amber-500 to-orange-500',
              'text-white font-medium',
              'hover:from-amber-600 hover:to-orange-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all'
            )}
          >
            {isTipping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Coins className="w-4 h-4" />
                确认打赏
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
