'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  ChevronLeft,
  Calendar,
  Users,
  Coins,
  Clock,
  Trophy,
  CheckCircle,
  XCircle,
  Gift,
  Target,
  BookOpen,
  MessageSquare,
  Quote,
  AlertCircle,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { activityService } from '@/services/activity';
import type {
  ActivityDetail,
  ActivityProgress as ActivityProgressType,
} from '@/types/activity';
import {
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_STATUS_COLORS,
} from '@/types/activity';
import { ActivityProgress } from '@/components/activity';

/**
 * 活动详情页面
 *
 * 需求16: 社区活动系统
 * 任务16.2.2: 活动详情页面
 */

/**
 * 格式化日期时间
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

/**
 * 计算倒计时
 */
function getCountdown(targetTime: string): { text: string; isUrgent: boolean } {
  const now = new Date();
  const target = new Date(targetTime);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return { text: '已结束', isUrgent: false };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return { text: `${days}天${hours}小时`, isUrgent: days <= 1 };
  if (hours > 0) return { text: `${hours}小时${minutes}分钟`, isUrgent: true };
  return { text: `${minutes}分钟`, isUrgent: true };
}

/**
 * 检查活动是否即将开始
 */
function isUpcoming(startTime: string): boolean {
  return new Date(startTime) > new Date();
}

/**
 * 获取活动类型图标
 */
function getActivityTypeIcon(type: string) {
  switch (type) {
    case 'READING_CHALLENGE':
      return <BookOpen className="w-5 h-5" />;
    case 'WRITING_CONTEST':
      return <MessageSquare className="w-5 h-5" />;
    case 'COMMUNITY_EVENT':
      return <Quote className="w-5 h-5" />;
    default:
      return <Trophy className="w-5 h-5" />;
  }
}

export default function ActivityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // 活动详情
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [progress, setProgress] = useState<ActivityProgressType | null>(null);

  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载活动详情
   */
  const loadActivityDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await activityService.getActivityDetail(activityId);
      setActivity(response.data);

      // 如果用户已参与，加载进度
      if (response.data.currentUserParticipation) {
        try {
          const progressResponse = await activityService.getActivityProgress(activityId);
          setProgress(progressResponse.data);
        } catch {
          // 进度加载失败不影响主页面
        }
      }
    } catch (err) {
      console.error('Failed to load activity detail:', err);
      setError('加载活动详情失败');
    } finally {
      setIsLoading(false);
    }
  }, [activityId]);

  /**
   * 参与活动
   */
  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/activities/${activityId}`);
      return;
    }

    setIsJoining(true);
    try {
      const response = await activityService.joinActivity(activityId);
      if (response.data.success) {
        await loadActivityDetail();
      }
    } catch (err) {
      console.error('Failed to join activity:', err);
    } finally {
      setIsJoining(false);
    }
  };

  /**
   * 退出活动
   */
  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      const response = await activityService.leaveActivity(activityId);
      if (response.data.success) {
        await loadActivityDetail();
        setProgress(null);
      }
    } catch (err) {
      console.error('Failed to leave activity:', err);
    } finally {
      setIsLeaving(false);
    }
  };

  /**
   * 领取奖励
   */
  const handleClaimReward = async () => {
    setIsClaiming(true);
    try {
      const response = await activityService.claimReward(activityId);
      if (response.data.success) {
        await loadActivityDetail();
      }
    } catch (err) {
      console.error('Failed to claim reward:', err);
    } finally {
      setIsClaiming(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadActivityDetail();
  }, [loadActivityDetail]);

  // 计算状态
  const upcoming = activity ? isUpcoming(activity.startTime) : false;
  const canJoin = activity?.status === 'ACTIVE' && !upcoming;
  const isFull = activity?.maxParticipants !== null && 
    activity && activity.participantCount >= (activity.maxParticipants || 0);
  const hasJoined = !!activity?.currentUserParticipation;
  const participation = activity?.currentUserParticipation;
  const canClaim = participation?.status === 'COMPLETED' && !participation?.rewardClaimed;
  const countdown = activity ? getCountdown(activity.endTime) : null;

  // 加载中
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // 错误状态
  if (error || !activity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>返回</span>
          </button>
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{error || '活动不存在'}</p>
            <button
              onClick={() => router.push('/activities')}
              className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium"
            >
              返回活动中心
            </button>
          </div>
        </div>
      </div>
    );
  }

  const typeColors = ACTIVITY_TYPE_COLORS[activity.type];
  const statusColors = ACTIVITY_STATUS_COLORS[activity.status];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pb-20">
      {/* 头部封面 */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        {activity.coverImage ? (
          <img
            src={activity.coverImage}
            alt={activity.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-8xl opacity-30">🎉</span>
          </div>
        )}
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* 返回按钮 */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-black/50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        {/* 状态徽章 */}
        <div className="absolute top-4 right-4 flex gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${typeColors.bg} ${typeColors.text} backdrop-blur-sm`}>
            {activity.typeName}
          </span>
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text} backdrop-blur-sm`}>
            {activity.statusName}
          </span>
        </div>

        {/* 标题区域 */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-bold text-white mb-2"
          >
            {activity.title}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            {activity.creator.avatar ? (
              <img
                src={activity.creator.avatar}
                alt={activity.creator.nickname || activity.creator.username}
                className="w-8 h-8 rounded-full object-cover border-2 border-white/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-medium border-2 border-white/30">
                {(activity.creator.nickname || activity.creator.username).charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-white/80 text-sm">
              {activity.creator.nickname || activity.creator.username}
            </span>
          </motion.div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-4xl mx-auto px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧主内容 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 活动描述 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                {getActivityTypeIcon(activity.type)}
                活动介绍
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                {activity.description}
              </p>
            </motion.div>

            {/* 活动规则 */}
            {activity.rules && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" />
                  活动规则
                </h2>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  {activity.rules.targetChapterCount && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      <span>阅读目标: {activity.rules.targetChapterCount} 章</span>
                    </div>
                  )}
                  {activity.rules.minCommentLength && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      <span>最小评论字数: {activity.rules.minCommentLength} 字</span>
                    </div>
                  )}
                  {activity.rules.customRules && (
                    <p className="mt-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">
                      {activity.rules.customRules}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* 用户进度（已参与时显示） */}
            <AnimatePresence>
              {hasJoined && participation && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.4 }}
                >
                  <ActivityProgress
                    activityType={activity.type}
                    rules={progress?.activityRules || activity.rules}
                    progress={progress?.progress || participation.progress}
                    status={participation.status}
                    endTime={activity.endTime}
                    rewardClaimed={participation.rewardClaimed}
                    rewardAmount={activity.rewardPerPerson}
                    showDetails={true}
                  />

                  {/* 领取奖励按钮 */}
                  {canClaim && (
                    <motion.button
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClaimReward}
                      disabled={isClaiming}
                      className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all"
                    >
                      {isClaiming ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Gift className="w-5 h-5" />
                          领取奖励 ({activity.rewardPerPerson} 零芥子)
                        </>
                      )}
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 右侧信息栏 */}
          <div className="space-y-6">
            {/* 活动信息卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg"
            >
              {/* 倒计时 */}
              {activity.status === 'ACTIVE' && countdown && (
                <div className={`mb-4 p-4 rounded-xl ${
                  countdown.isUrgent
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className={`w-4 h-4 ${countdown.isUrgent ? 'text-red-500' : 'text-indigo-500'}`} />
                    <span className={`text-xs font-medium ${countdown.isUrgent ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {upcoming ? '距离开始' : '距离结束'}
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${countdown.isUrgent ? 'text-red-700 dark:text-red-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
                    {upcoming ? getCountdown(activity.startTime).text : countdown.text}
                  </p>
                </div>
              )}

              {/* 时间信息 */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">开始时间</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(activity.startTime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">结束时间</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(activity.endTime)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 参与人数 */}
              <div className="flex items-center gap-3 text-sm mb-4">
                <Users className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-gray-500 dark:text-gray-400">参与人数</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {activity.participantCount}
                      {activity.maxParticipants && ` / ${activity.maxParticipants}`}
                    </p>
                    {isFull && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs">
                        已满
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 奖励信息 */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <span className="font-medium text-amber-700 dark:text-amber-300">奖励信息</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-amber-600 dark:text-amber-400">
                    单人奖励: <span className="font-bold">{activity.rewardPerPerson}</span> 零芥子
                  </p>
                  <p className="text-amber-600/80 dark:text-amber-400/80">
                    总奖池: {activity.totalPool} 零芥子
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 操作按钮 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              {/* 未参与 - 显示参与按钮 */}
              {!hasJoined && canJoin && !isFull && (
                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium flex items-center justify-center gap-2 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25"
                >
                  {isJoining ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      立即参与
                    </>
                  )}
                </button>
              )}

              {/* 未登录提示 */}
              {!isAuthenticated && canJoin && !isFull && (
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  参与活动需要先登录
                </p>
              )}

              {/* 已参与 - 显示退出按钮 */}
              {hasJoined && participation?.status === 'JOINED' && activity.status === 'ACTIVE' && (
                <button
                  onClick={handleLeave}
                  disabled={isLeaving}
                  className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-all"
                >
                  {isLeaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="w-5 h-5" />
                      退出活动
                    </>
                  )}
                </button>
              )}

              {/* 名额已满 */}
              {!hasJoined && isFull && (
                <div className="w-full py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5" />
                  名额已满
                </div>
              )}

              {/* 即将开始 */}
              {upcoming && (
                <div className="w-full py-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5" />
                  活动即将开始
                </div>
              )}

              {/* 已结束 */}
              {activity.status === 'ENDED' && (
                <div className="w-full py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  活动已结束
                </div>
              )}

              {/* 已取消 */}
              {activity.status === 'CANCELLED' && (
                <div className="w-full py-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5" />
                  活动已取消
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
