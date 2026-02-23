'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Users, Coins, Clock, ChevronRight, Sparkles } from 'lucide-react';
import type { ActivityListItem } from '@/types/activity';
import { ACTIVITY_TYPE_COLORS, ACTIVITY_STATUS_COLORS } from '@/types/activity';

/**
 * 增强版活动卡片组件
 *
 * 需求26: 限时活动前端
 * 任务26.2.2: 活动卡片组件
 *
 * 功能：
 * - 封面图片展示
 * - 实时倒计时显示
 * - 参与进度条
 * - 动画效果
 */

interface ActivityCardEnhancedProps {
  activity: ActivityListItem;
  onJoin?: (activityId: string) => void;
  onClick?: (activityId: string) => void;
  isJoining?: boolean;
  showCountdown?: boolean;
  className?: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

function useCountdown(endTime: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        isEnded: false,
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  return timeLeft;
}

export function ActivityCardEnhanced({
  activity,
  onJoin,
  onClick,
  isJoining = false,
  showCountdown = true,
  className = '',
}: ActivityCardEnhancedProps) {
  const typeColors = ACTIVITY_TYPE_COLORS[activity.type];
  const statusColors = ACTIVITY_STATUS_COLORS[activity.status];
  const countdown = useCountdown(activity.endTime);
  const isUpcoming = new Date(activity.startTime) > new Date();
  const canJoin = activity.status === 'ACTIVE' && !isUpcoming;
  const isFull = activity.maxParticipants !== null && activity.participantCount >= activity.maxParticipants;
  const participantProgress = activity.maxParticipants
    ? (activity.participantCount / activity.maxParticipants) * 100
    : 0;

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onJoin && canJoin && !isFull && !isJoining) {
      onJoin(activity.id);
    }
  };

  const handleCardClick = () => {
    if (onClick) onClick(activity.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      className={`
        relative overflow-hidden rounded-2xl
        bg-white/70 dark:bg-gray-900/70
        backdrop-blur-xl
        border border-white/30 dark:border-gray-700/30
        shadow-lg shadow-indigo-500/5
        hover:shadow-xl hover:shadow-indigo-500/10
        cursor-pointer transition-shadow duration-300
        ${className}
      `}
    >
      {/* 封面图片 */}
      <div className="relative h-40 overflow-hidden">
        {activity.coverImage ? (
          <img src={activity.coverImage} alt={activity.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* 徽章 */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeColors.bg} ${typeColors.text} backdrop-blur-sm`}>
            {activity.typeName}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text} backdrop-blur-sm`}>
            {activity.statusName}
          </span>
        </div>

        {/* 倒计时 */}
        {showCountdown && activity.status === 'ACTIVE' && !countdown.isEnded && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-sm">
              <Clock className="w-4 h-4 text-white/80" />
              <span className="text-xs text-white/80 mr-2">剩余</span>
              <div className="flex gap-1">
                {countdown.days > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-white/20 text-white text-xs font-mono">
                    {countdown.days}天
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-white/20 text-white text-xs font-mono">
                  {String(countdown.hours).padStart(2, '0')}
                </span>
                <span className="text-white/60">:</span>
                <span className="px-1.5 py-0.5 rounded bg-white/20 text-white text-xs font-mono">
                  {String(countdown.minutes).padStart(2, '0')}
                </span>
                <span className="text-white/60">:</span>
                <span className="px-1.5 py-0.5 rounded bg-white/20 text-white text-xs font-mono">
                  {String(countdown.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 奖励 */}
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-xs font-medium backdrop-blur-sm">
            <Coins className="w-3.5 h-3.5" />
            <span>{activity.rewardPerPerson}</span>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5 line-clamp-1">
          {activity.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {activity.description}
        </p>

        {/* 信息行 */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(activity.startTime)} - {formatDate(activity.endTime)}</span>
          </div>
        </div>

        {/* 参与进度 */}
        {activity.maxParticipants && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                参与人数
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                {activity.participantCount} / {activity.maxParticipants}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${participantProgress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              />
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          {isUpcoming && (
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>即将开始</span>
            </div>
          )}
          {activity.status === 'ENDED' && (
            <div className="text-xs text-gray-400 dark:text-gray-500">活动已结束</div>
          )}
          {canJoin && !isFull && (
            <>
              <div />
              <button
                onClick={handleJoinClick}
                disabled={isJoining}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 transition-all"
              >
                {isJoining ? '参与中...' : '立即参与'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {isFull && <span className="text-xs text-gray-400 dark:text-gray-500">名额已满</span>}
        </div>
      </div>

      {/* 创建者 */}
      <div className="px-4 pb-4 pt-0">
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          {activity.creator.avatar ? (
            <img src={activity.creator.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs">
              {(activity.creator.nickname || activity.creator.username).charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {activity.creator.nickname || activity.creator.username}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default ActivityCardEnhanced;
