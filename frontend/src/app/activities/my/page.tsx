'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  ChevronLeft,
  Gift,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Coins,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { activityService } from '@/services/activity';
import type {
  MyParticipationItem,
  Pagination,
  ParticipationStatus,
} from '@/types/activity';
import {
  PARTICIPATION_STATUS_NAMES,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_TYPE_ICONS,
} from '@/types/activity';

/**
 * 我的活动页面
 *
 * 需求16: 社区活动系统
 * 任务16.2.5: 我的活动列表
 *
 * 功能：
 * - Tab 导航: 全部 / 进行中 / 已完成 / 未完成
 * - 活动卡片列表（标题、类型、状态、日期）
 * - 用户参与状态徽章
 * - 进度指示器（迷你版）
 * - 奖励领取状态
 * - 空状态展示
 * - 分页
 * - 快捷操作（查看详情、领取奖励）
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */

type TabType = 'all' | 'joined' | 'completed' | 'failed';

interface TabConfig {
  key: TabType;
  label: string;
  icon: React.ReactNode;
  status?: ParticipationStatus;
}

const TABS: TabConfig[] = [
  { key: 'all', label: '全部', icon: <Calendar className="w-4 h-4" /> },
  { key: 'joined', label: '进行中', icon: <Clock className="w-4 h-4" />, status: 'JOINED' },
  { key: 'completed', label: '已完成', icon: <CheckCircle className="w-4 h-4" />, status: 'COMPLETED' },
  { key: 'failed', label: '未完成', icon: <XCircle className="w-4 h-4" />, status: 'FAILED' },
];

/**
 * 参与状态颜色配置
 */
const PARTICIPATION_STATUS_COLORS: Record<ParticipationStatus, { text: string; bg: string; border: string }> = {
  JOINED: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  COMPLETED: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
  },
  FAILED: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
  WITHDRAWN: {
    text: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    border: 'border-gray-200 dark:border-gray-800',
  },
};

/**
 * 格式化日期
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

/**
 * 计算进度百分比
 */
function calculateProgress(participation: MyParticipationItem): number {
  const { progress, activity } = participation;
  if (!progress) return 0;

  switch (activity.type) {
    case 'READING_CHALLENGE': {
      const readChapters = (progress.readChapters as number) || 0;
      const target = (progress.targetChapterCount as number) || 1;
      return Math.min((readChapters / target) * 100, 100);
    }
    case 'WRITING_CONTEST': {
      const totalLength = (progress.totalCommentLength as number) || 0;
      const minLength = (progress.minCommentLength as number) || 100;
      return Math.min((totalLength / minLength) * 100, 100);
    }
    case 'COMMUNITY_EVENT': {
      const quotedParagraphs = (progress.quotedParagraphs as string[]) || [];
      return quotedParagraphs.length > 0 ? 100 : 0;
    }
    default:
      return 0;
  }
}

/**
 * 迷你进度条组件
 */
function MiniProgressBar({ percentage, status }: { percentage: number; status: ParticipationStatus }) {
  const isCompleted = status === 'COMPLETED';
  const isFailed = status === 'FAILED';

  return (
    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`h-full rounded-full ${
          isCompleted
            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
            : isFailed
            ? 'bg-gradient-to-r from-red-400 to-rose-500'
            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
        }`}
      />
    </div>
  );
}

/**
 * 参与记录卡片组件
 */
function ParticipationCard({
  participation,
  onViewDetails,
  onClaimReward,
  isClaiming,
}: {
  participation: MyParticipationItem;
  onViewDetails: (activityId: string) => void;
  onClaimReward: (activityId: string) => void;
  isClaiming: boolean;
}) {
  const { activity, status, rewardClaimed } = participation;
  const typeColors = ACTIVITY_TYPE_COLORS[activity.type];
  const statusColors = PARTICIPATION_STATUS_COLORS[status];
  const progressPercentage = calculateProgress(participation);
  const canClaimReward = status === 'COMPLETED' && !rewardClaimed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      {/* 封面图片 */}
      <div className="relative h-28 overflow-hidden">
        {activity.coverImage ? (
          <img
            src={activity.coverImage}
            alt={activity.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-3xl opacity-50">
              {ACTIVITY_TYPE_ICONS[activity.type]}
            </span>
          </div>
        )}
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* 活动类型徽章 */}
        <div className="absolute top-2 left-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColors.bg} ${typeColors.text} ${typeColors.border} border backdrop-blur-sm`}
          >
            {activity.typeName}
          </span>
        </div>

        {/* 参与状态徽章 */}
        <div className="absolute top-2 right-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text} ${statusColors.border} border backdrop-blur-sm`}
          >
            {PARTICIPATION_STATUS_NAMES[status]}
          </span>
        </div>

        {/* 奖励金额 */}
        <div className="absolute bottom-2 right-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-xs font-medium backdrop-blur-sm">
            <Coins className="w-3 h-3" />
            <span>{activity.rewardPerPerson}</span>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {/* 标题 */}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
          {activity.title}
        </h3>

        {/* 时间范围 */}
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <Calendar className="w-3 h-3" />
          <span>
            {formatDate(activity.startTime)} - {formatDate(activity.endTime)}
          </span>
        </div>

        {/* 迷你进度条 */}
        {status === 'JOINED' && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>进度</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <MiniProgressBar percentage={progressPercentage} status={status} />
          </div>
        )}

        {/* 奖励领取状态 */}
        {status === 'COMPLETED' && (
          <div className="mb-3">
            {rewardClaimed ? (
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>奖励已领取</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Gift className="w-3.5 h-3.5" />
                <span>奖励待领取</span>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewDetails(activity.id)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>查看详情</span>
          </button>

          {canClaimReward && (
            <button
              onClick={() => onClaimReward(activity.id)}
              disabled={isClaiming}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isClaiming ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Gift className="w-3.5 h-3.5" />
              )}
              <span>{isClaiming ? '领取中...' : '领取奖励'}</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function MyActivitiesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // 当前 Tab
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // 参与记录数据
  const [participations, setParticipations] = useState<MyParticipationItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // 当前页码
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  /**
   * 加载参与记录
   */
  const loadParticipations = useCallback(async (tab: TabType, page: number) => {
    if (!isAuthenticated) {
      setParticipations([]);
      setPagination(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const tabConfig = TABS.find((t) => t.key === tab);
      const response = await activityService.getMyParticipations({
        page,
        pageSize,
        status: tabConfig?.status,
      });
      setParticipations(response.data.participations);
      setPagination(response.data.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load participations:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  /**
   * 查看活动详情
   */
  const handleViewDetails = (activityId: string) => {
    router.push(`/activities/${activityId}`);
  };

  /**
   * 领取奖励
   */
  const handleClaimReward = async (activityId: string) => {
    setClaimingId(activityId);
    try {
      const response = await activityService.claimReward(activityId);
      if (response.data.success) {
        // 刷新列表
        await loadParticipations(activeTab, currentPage);
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
    } finally {
      setClaimingId(null);
    }
  };

  /**
   * 切换 Tab
   */
  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setCurrentPage(1);
    loadParticipations(tab, 1);
  };

  /**
   * 刷新
   */
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadParticipations(activeTab, currentPage);
  };

  /**
   * 翻页
   */
  const handlePageChange = (page: number) => {
    if (page >= 1 && pagination && page <= pagination.totalPages) {
      loadParticipations(activeTab, page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 初始加载
  useEffect(() => {
    if (!authLoading) {
      loadParticipations(activeTab, 1);
    }
  }, [authLoading, loadParticipations, activeTab]);

  // 未登录时跳转
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/activities/my');
    }
  }, [authLoading, isAuthenticated, router]);

  // 等待认证状态
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/activities')}
              className="p-2 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                我的活动
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                查看您参与的所有活动
              </p>
            </div>
          </div>

          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            />
          </button>
        </motion.div>

        {/* Tab 导航 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-2 p-1.5 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                  text-sm font-medium transition-all duration-200 whitespace-nowrap
                  ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* 内容区域 */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </motion.div>
          ) : participations.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-4">
                {activeTab === 'all' && '🎯'}
                {activeTab === 'joined' && '⏳'}
                {activeTab === 'completed' && '🏆'}
                {activeTab === 'failed' && '😢'}
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {activeTab === 'all' && '您还没有参与任何活动'}
                {activeTab === 'joined' && '暂无进行中的活动'}
                {activeTab === 'completed' && '暂无已完成的活动'}
                {activeTab === 'failed' && '暂无未完成的活动'}
              </p>
              <button
                onClick={() => router.push('/activities')}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
              >
                浏览活动
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {participations.map((participation) => (
                <ParticipationCard
                  key={participation.id}
                  participation={participation}
                  onViewDetails={handleViewDetails}
                  onClaimReward={handleClaimReward}
                  isClaiming={claimingId === participation.activity.id}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 分页 */}
        {pagination && pagination.totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 mt-8"
          >
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-4 py-2 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30 text-sm font-medium text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              {currentPage} / {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= pagination.totalPages}
              className="px-4 py-2 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30 text-sm font-medium text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
            >
              下一页
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
