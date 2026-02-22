'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  ChevronLeft,
  Sparkles,
  Clock,
  CheckCircle,
  User,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { activityService } from '@/services/activity';
import { ActivityCard } from '@/components/activity';
import type {
  ActivityListItem,
  MyParticipationItem,
  Pagination,
  ActivityStatus,
} from '@/types/activity';

/**
 * 活动中心页面
 *
 * 需求16: 社区活动系统
 * 任务16.2.1: 活动中心页面
 *
 * 功能：
 * - 页面头部标题 "活动中心"
 * - Tab 导航: 进行中 / 即将开始 / 已结束 / 我的活动
 * - 活动卡片网格/列表
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */

type TabType = 'active' | 'upcoming' | 'ended' | 'my';

interface TabConfig {
  key: TabType;
  label: string;
  icon: React.ReactNode;
  status?: ActivityStatus;
}

const TABS: TabConfig[] = [
  { key: 'active', label: '进行中', icon: <Sparkles className="w-4 h-4" />, status: 'ACTIVE' },
  { key: 'upcoming', label: '即将开始', icon: <Clock className="w-4 h-4" /> },
  { key: 'ended', label: '已结束', icon: <CheckCircle className="w-4 h-4" />, status: 'ENDED' },
  { key: 'my', label: '我的活动', icon: <User className="w-4 h-4" /> },
];

export default function ActivitiesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // 当前 Tab
  const [activeTab, setActiveTab] = useState<TabType>('active');

  // 活动列表数据
  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [myParticipations, setMyParticipations] = useState<MyParticipationItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 当前页码
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  /**
   * 加载活动列表
   */
  const loadActivities = useCallback(async (tab: TabType, page: number) => {
    setIsLoading(true);
    try {
      if (tab === 'my') {
        // 加载我的参与记录
        if (!isAuthenticated) {
          setMyParticipations([]);
          setPagination(null);
          return;
        }
        const response = await activityService.getMyParticipations({
          page,
          pageSize,
        });
        setMyParticipations(response.data.participations);
        setPagination(response.data.pagination);
        setActivities([]);
      } else {
        // 加载活动列表
        let status: ActivityStatus | undefined;
        let sortBy: 'startTime' | 'createdAt' = 'createdAt';

        if (tab === 'active') {
          status = 'ACTIVE';
          sortBy = 'startTime';
        } else if (tab === 'ended') {
          status = 'ENDED';
        } else if (tab === 'upcoming') {
          // 即将开始：获取 ACTIVE 状态但开始时间在未来的活动
          status = 'ACTIVE';
          sortBy = 'startTime';
        }

        const response = await activityService.getActivityList({
          page,
          pageSize,
          status,
          sortBy,
          sortOrder: tab === 'ended' ? 'desc' : 'asc',
        });

        let filteredActivities = response.data.activities;

        // 对于"即将开始"和"进行中"，需要根据开始时间过滤
        if (tab === 'upcoming') {
          const now = new Date();
          filteredActivities = filteredActivities.filter(
            (a) => new Date(a.startTime) > now
          );
        } else if (tab === 'active') {
          const now = new Date();
          filteredActivities = filteredActivities.filter(
            (a) => new Date(a.startTime) <= now
          );
        }

        setActivities(filteredActivities);
        setPagination(response.data.pagination);
        setMyParticipations([]);
      }
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  /**
   * 参与活动
   */
  const handleJoinActivity = async (activityId: string) => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/activities`);
      return;
    }

    setIsJoining(activityId);
    try {
      const response = await activityService.joinActivity(activityId);
      if (response.data.success) {
        // 刷新当前列表
        await loadActivities(activeTab, currentPage);
      }
    } catch (error) {
      console.error('Failed to join activity:', error);
    } finally {
      setIsJoining(null);
    }
  };

  /**
   * 点击活动卡片
   */
  const handleActivityClick = (activityId: string) => {
    router.push(`/activities/${activityId}`);
  };

  /**
   * 切换 Tab
   */
  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setCurrentPage(1);
    loadActivities(tab, 1);
  };

  /**
   * 刷新
   */
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadActivities(activeTab, currentPage);
  };

  /**
   * 翻页
   */
  const handlePageChange = (page: number) => {
    if (page >= 1 && pagination && page <= pagination.totalPages) {
      loadActivities(activeTab, page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 初始加载
  useEffect(() => {
    loadActivities(activeTab, 1);
  }, [loadActivities, activeTab]);

  // 检查登录状态（仅对"我的活动"Tab）
  useEffect(() => {
    if (activeTab === 'my' && !authLoading && !isAuthenticated) {
      // 可以选择跳转登录或显示提示
    }
  }, [activeTab, authLoading, isAuthenticated]);

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
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                活动中心
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                参与社区活动，赢取零芥子奖励
              </p>
            </div>
          </div>

          {/* 刷新按钮 */}
          <div className="flex items-center gap-2">
            {/* 我的活动入口 */}
            {isAuthenticated && (
              <button
                onClick={() => router.push('/activities/my')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:from-indigo-500/20 hover:to-purple-500/20 dark:hover:from-indigo-500/30 dark:hover:to-purple-500/30 transition-all"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">我的活动</span>
              </button>
            )}
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
          </div>
        </motion.div>

        {/* Tab 导航 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-2 p-1.5 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                  text-sm font-medium transition-all duration-200
                  ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }
                `}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
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
          ) : activeTab === 'my' ? (
            // 我的活动列表
            <motion.div
              key="my-activities"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {!isAuthenticated ? (
                <div className="text-center py-20">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    请先登录查看您的活动
                  </p>
                  <button
                    onClick={() => router.push('/auth/login?redirect=/activities')}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                  >
                    立即登录
                  </button>
                </div>
              ) : myParticipations.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">🎯</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    您还没有参与任何活动
                  </p>
                  <button
                    onClick={() => handleTabChange('active')}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                  >
                    浏览活动
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myParticipations.map((participation) => (
                    <ActivityCard
                      key={participation.id}
                      activity={{
                        ...participation.activity,
                        createdAt: participation.createdAt,
                      }}
                      onClick={handleActivityClick}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            // 活动列表
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {activities.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">
                    {activeTab === 'active' && '🎉'}
                    {activeTab === 'upcoming' && '⏰'}
                    {activeTab === 'ended' && '📋'}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    {activeTab === 'active' && '暂无进行中的活动'}
                    {activeTab === 'upcoming' && '暂无即将开始的活动'}
                    {activeTab === 'ended' && '暂无已结束的活动'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onJoin={handleJoinActivity}
                      onClick={handleActivityClick}
                      isJoining={isJoining === activity.id}
                    />
                  ))}
                </div>
              )}
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
