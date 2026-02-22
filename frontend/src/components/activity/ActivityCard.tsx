'use client';

import { motion } from 'motion/react';
import { Calendar, Users, Coins, Clock, ChevronRight } from 'lucide-react';
import type { ActivityListItem } from '@/types/activity';
import {
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_STATUS_COLORS,
} from '@/types/activity';

/**
 * 活动卡片组件
 *
 * 需求16: 社区活动系统
 * 任务16.2.1: 活动中心页面
 *
 * 功能：
 * - 封面图片、标题、描述
 * - 活动类型徽章
 * - 时间范围（开始 - 结束）
 * - 参与人数 / 最大参与人数
 * - 奖励金额显示
 * - 参与按钮 / 状态指示器
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */

interface ActivityCardProps {
  activity: ActivityListItem;
  onJoin?: (activityId: string) => void;
  onClick?: (activityId: string) => void;
  isJoining?: boolean;
  className?: string;
}

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
 * 计算剩余时间
 */
function getRemainingTime(endTime: string): string {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return '已结束';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `剩余 ${days} 天`;
  if (hours > 0) return `剩余 ${hours} 小时`;
  return '即将结束';
}

/**
 * 检查活动是否即将开始
 */
function isUpcoming(startTime: string): boolean {
  return new Date(startTime) > new Date();
}

export function ActivityCard({
  activity,
  onJoin,
  onClick,
  isJoining = false,
  className = '',
}: ActivityCardProps) {
  const typeColors = ACTIVITY_TYPE_COLORS[activity.type];
  const statusColors = ACTIVITY_STATUS_COLORS[activity.status];
  const upcoming = isUpcoming(activity.startTime);
  const canJoin = activity.status === 'ACTIVE' && !upcoming;
  const isFull = activity.maxParticipants !== null && activity.participantCount >= activity.maxParticipants;

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onJoin && canJoin && !isFull && !isJoining) {
      onJoin(activity.id);
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(activity.id);
    }
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
        cursor-pointer
        transition-shadow duration-300
        ${className}
      `}
    >
      {/* 封面图片 */}
      <div className="relative h-36 overflow-hidden">
        {activity.coverImage ? (
          <img
            src={activity.coverImage}
            alt={activity.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-4xl opacity-50">🎉</span>
          </div>
        )}
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* 活动类型徽章 */}
        <div className="absolute top-3 left-3">
          <span
            className={`
              inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
              ${typeColors.bg} ${typeColors.text} ${typeColors.border}
              border backdrop-blur-sm
            `}
          >
            {activity.typeName}
          </span>
        </div>

        {/* 状态徽章 */}
        <div className="absolute top-3 right-3">
          <span
            className={`
              inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
              ${statusColors.bg} ${statusColors.text}
              backdrop-blur-sm
            `}
          >
            {activity.statusName}
          </span>
        </div>

        {/* 奖励金额 */}
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-xs font-medium backdrop-blur-sm">
            <Coins className="w-3.5 h-3.5" />
            <span>{activity.rewardPerPerson}</span>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {/* 标题 */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5 line-clamp-1">
          {activity.title}
        </h3>

        {/* 描述 */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {activity.description}
        </p>

        {/* 信息行 */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
          {/* 时间范围 */}
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {formatDate(activity.startTime)} - {formatDate(activity.endTime)}
            </span>
          </div>

          {/* 参与人数 */}
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>
              {activity.participantCount}
              {activity.maxParticipants && `/${activity.maxParticipants}`}
            </span>
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="flex items-center justify-between">
          {/* 剩余时间 */}
          {activity.status === 'ACTIVE' && (
            <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{getRemainingTime(activity.endTime)}</span>
            </div>
          )}

          {upcoming && (
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>即将开始</span>
            </div>
          )}

          {activity.status === 'ENDED' && (
            <div className="text-xs text-gray-400 dark:text-gray-500">
              活动已结束
            </div>
          )}

          {/* 参与按钮 */}
          {canJoin && !isFull && (
            <button
              onClick={handleJoinClick}
              disabled={isJoining}
              className="
                flex items-center gap-1 px-3 py-1.5 rounded-lg
                bg-gradient-to-r from-indigo-500 to-purple-500
                text-white text-xs font-medium
                hover:from-indigo-600 hover:to-purple-600
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              "
            >
              {isJoining ? '参与中...' : '立即参与'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {isFull && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              名额已满
            </span>
          )}
        </div>
      </div>

      {/* 创建者信息 */}
      <div className="px-4 pb-4 pt-0">
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          {activity.creator.avatar ? (
            <img
              src={activity.creator.avatar}
              alt={activity.creator.nickname || activity.creator.username}
              className="w-5 h-5 rounded-full object-cover"
            />
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

export default ActivityCard;
