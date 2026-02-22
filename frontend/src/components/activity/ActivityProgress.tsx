'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  MessageSquare,
  Quote,
  Trophy,
  Clock,
  CheckCircle,
  Star,
  Sparkles,
  Target,
} from 'lucide-react';
import type {
  ActivityRules,
  ActivityType,
  ParticipationStatus,
} from '@/types/activity';

/**
 * 活动进度展示组件
 *
 * 需求16: 社区活动系统
 * 任务16.2.4: 活动进度展示
 *
 * 功能：
 * - 可视化进度条/指示器
 * - 当前进度 vs 目标展示
 * - 完成百分比动画进度条
 * - 里程碑标记
 * - 剩余时间显示
 * - 不同活动类型的适配可视化
 * - 完成状态庆祝动画
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */

// ==================== 类型定义 ====================

interface ActivityProgressProps {
  /** 活动类型 */
  activityType: ActivityType;
  /** 活动规则 */
  rules: ActivityRules | null;
  /** 进度数据 */
  progress: Record<string, unknown> | null;
  /** 参与状态 */
  status: ParticipationStatus;
  /** 活动结束时间 */
  endTime?: string;
  /** 是否已领取奖励 */
  rewardClaimed?: boolean;
  /** 奖励金额 */
  rewardAmount?: number;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 自定义类名 */
  className?: string;
}

interface MilestoneMarker {
  percentage: number;
  label: string;
  reached: boolean;
}

// ==================== 工具函数 ====================

/**
 * 计算剩余时间
 */
function getTimeRemaining(endTime: string): {
  text: string;
  isUrgent: boolean;
  percentage: number;
} {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return { text: '已结束', isUrgent: false, percentage: 100 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  // 计算时间进度百分比（假设活动最长30天）
  const maxDuration = 30 * 24 * 60 * 60 * 1000;
  const percentage = Math.max(0, Math.min(100, ((maxDuration - diff) / maxDuration) * 100));

  if (days > 7) {
    return { text: `${days}天`, isUrgent: false, percentage };
  }
  if (days > 0) {
    return { text: `${days}天${hours}小时`, isUrgent: days <= 1, percentage };
  }
  if (hours > 0) {
    return { text: `${hours}小时${minutes}分钟`, isUrgent: true, percentage };
  }
  return { text: `${minutes}分钟`, isUrgent: true, percentage };
}

/**
 * 获取活动类型图标
 */
function getActivityIcon(type: ActivityType) {
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

/**
 * 获取活动类型颜色
 */
function getActivityColors(type: ActivityType) {
  switch (type) {
    case 'READING_CHALLENGE':
      return {
        gradient: 'from-blue-500 to-cyan-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
      };
    case 'WRITING_CONTEST':
      return {
        gradient: 'from-purple-500 to-pink-500',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
      };
    case 'COMMUNITY_EVENT':
      return {
        gradient: 'from-amber-500 to-orange-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
      };
    default:
      return {
        gradient: 'from-indigo-500 to-purple-500',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800',
      };
  }
}

// ==================== 子组件 ====================

/**
 * 进度条组件
 */
function ProgressBar({
  percentage,
  gradient,
  showPercentage = true,
  milestones = [],
  animated = true,
}: {
  percentage: number;
  gradient: string;
  showPercentage?: boolean;
  milestones?: MilestoneMarker[];
  animated?: boolean;
}) {
  return (
    <div className="relative">
      {/* 进度条背景 */}
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        {/* 进度条填充 */}
        <motion.div
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${gradient} rounded-full relative`}
        >
          {/* 光泽效果 */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
          {/* 动态光效 */}
          {percentage < 100 && (
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
          )}
        </motion.div>
      </div>

      {/* 里程碑标记 */}
      {milestones.length > 0 && (
        <div className="absolute inset-0 flex items-center">
          {milestones.map((milestone, index) => (
            <div
              key={index}
              className="absolute transform -translate-x-1/2"
              style={{ left: `${milestone.percentage}%` }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className={`w-4 h-4 rounded-full border-2 ${
                  milestone.reached
                    ? 'bg-amber-400 border-amber-500'
                    : 'bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500'
                }`}
              >
                {milestone.reached && (
                  <Star className="w-2 h-2 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                )}
              </motion.div>
            </div>
          ))}
        </div>
      )}

      {/* 百分比显示 */}
      {showPercentage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute -top-6 right-0 text-sm font-medium text-gray-600 dark:text-gray-400"
        >
          {Math.round(percentage)}%
        </motion.div>
      )}
    </div>
  );
}

/**
 * 完成庆祝动画
 */
function CompletionCelebration({ rewardAmount }: { rewardAmount?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 overflow-hidden"
    >
      {/* 背景粒子效果 */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 50, x: Math.random() * 100 }}
            animate={{
              opacity: [0, 1, 0],
              y: [-20, -80],
              x: Math.random() * 200 - 50,
            }}
            transition={{
              duration: 2,
              delay: i * 0.15,
              repeat: Infinity,
              repeatDelay: 1,
            }}
            className="absolute bottom-0"
            style={{ left: `${(i / 12) * 100}%` }}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
          </motion.div>
        ))}
      </div>

      {/* 内容 */}
      <div className="relative text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-4"
        >
          <Trophy className="w-8 h-8 text-white" />
        </motion.div>

        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-bold text-amber-700 dark:text-amber-300 mb-2"
        >
          🎉 恭喜完成！
        </motion.h3>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-amber-600 dark:text-amber-400"
        >
          你已成功完成活动目标
        </motion.p>

        {rewardAmount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium"
          >
            <Star className="w-4 h-4" />
            <span>可领取 {rewardAmount} 零芥子</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ==================== 阅读打卡进度 ====================

function ReadingChallengeProgress({
  progress,
  rules,
  colors,
  showDetails,
}: {
  progress: Record<string, unknown>;
  rules: ActivityRules;
  colors: ReturnType<typeof getActivityColors>;
  showDetails: boolean;
}) {
  const readChapters = (progress.readChapters as number) || 0;
  const target = rules.targetChapterCount || 0;
  const percentage = target > 0 ? Math.min((readChapters / target) * 100, 100) : 0;

  // 生成里程碑（25%, 50%, 75%, 100%）
  const milestones: MilestoneMarker[] = [
    { percentage: 25, label: '25%', reached: percentage >= 25 },
    { percentage: 50, label: '50%', reached: percentage >= 50 },
    { percentage: 75, label: '75%', reached: percentage >= 75 },
    { percentage: 100, label: '完成', reached: percentage >= 100 },
  ];

  return (
    <div className="space-y-4">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <BookOpen className={`w-4 h-4 ${colors.text}`} />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">阅读进度</span>
        </div>
        <span className={`text-lg font-bold ${colors.text}`}>
          {readChapters} / {target} 章
        </span>
      </div>

      {/* 进度条 */}
      <div className="pt-6">
        <ProgressBar
          percentage={percentage}
          gradient={colors.gradient}
          milestones={showDetails ? milestones : []}
        />
      </div>

      {/* 里程碑说明 */}
      {showDetails && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          {milestones.map((m, i) => (
            <span
              key={i}
              className={m.reached ? colors.text : ''}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}

      {/* 详细统计 */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="grid grid-cols-2 gap-3 pt-2"
        >
          <div className={`p-3 rounded-xl ${colors.bg} ${colors.border} border`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">已读章节</p>
            <p className={`text-xl font-bold ${colors.text}`}>{readChapters}</p>
          </div>
          <div className={`p-3 rounded-xl ${colors.bg} ${colors.border} border`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">剩余章节</p>
            <p className={`text-xl font-bold ${colors.text}`}>{Math.max(0, target - readChapters)}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ==================== 评论征集进度 ====================

function WritingContestProgress({
  progress,
  rules,
  colors,
  showDetails,
}: {
  progress: Record<string, unknown>;
  rules: ActivityRules;
  colors: ReturnType<typeof getActivityColors>;
  showDetails: boolean;
}) {
  const commentCount = (progress.commentCount as number) || 0;
  const totalLength = (progress.totalCommentLength as number) || 0;
  const minLength = rules.minCommentLength || 0;

  // 评论数量进度（假设目标是1条有效评论）
  const hasValidComment = totalLength >= minLength;
  const percentage = hasValidComment ? 100 : Math.min((totalLength / minLength) * 100, 99);

  return (
    <div className="space-y-4">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <MessageSquare className={`w-4 h-4 ${colors.text}`} />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">评论进度</span>
        </div>
        {hasValidComment ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
            <CheckCircle className="w-4 h-4" />
            已达标
          </span>
        ) : (
          <span className={`text-sm ${colors.text}`}>
            还需 {minLength - totalLength} 字
          </span>
        )}
      </div>

      {/* 进度条 */}
      <div className="pt-2">
        <ProgressBar
          percentage={percentage}
          gradient={colors.gradient}
          showPercentage={!hasValidComment}
        />
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-xl ${colors.bg} ${colors.border} border`}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">评论数量</p>
          <p className={`text-xl font-bold ${colors.text}`}>{commentCount} 条</p>
        </div>
        <div className={`p-3 rounded-xl ${colors.bg} ${colors.border} border`}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">总字数</p>
          <p className={`text-xl font-bold ${colors.text}`}>{totalLength} 字</p>
        </div>
      </div>

      {/* 要求说明 */}
      {showDetails && (
        <div className={`p-3 rounded-xl ${colors.bg} ${colors.border} border text-sm`}>
          <div className="flex items-center gap-2 mb-1">
            <Target className={`w-4 h-4 ${colors.text}`} />
            <span className={`font-medium ${colors.text}`}>完成要求</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            发布至少 {minLength} 字的有效评论
          </p>
        </div>
      )}
    </div>
  );
}

// ==================== 引用挑战进度 ====================

function CommunityEventProgress({
  progress,
  colors,
  showDetails,
}: {
  progress: Record<string, unknown>;
  colors: ReturnType<typeof getActivityColors>;
  showDetails: boolean;
}) {
  const quotedParagraphs = (progress.quotedParagraphs as string[]) || [];
  const quoteCount = quotedParagraphs.length;
  const hasQuoted = quoteCount > 0;
  const percentage = hasQuoted ? 100 : 0;

  return (
    <div className="space-y-4">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Quote className={`w-4 h-4 ${colors.text}`} />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">引用进度</span>
        </div>
        {hasQuoted ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
            <CheckCircle className="w-4 h-4" />
            已完成
          </span>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            待引用
          </span>
        )}
      </div>

      {/* 进度条 */}
      <div className="pt-2">
        <ProgressBar
          percentage={percentage}
          gradient={colors.gradient}
          showPercentage={false}
        />
      </div>

      {/* 引用统计 */}
      <div className={`p-4 rounded-xl ${colors.bg} ${colors.border} border`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">已引用段落</p>
            <p className={`text-2xl font-bold ${colors.text}`}>{quoteCount} 个</p>
          </div>
          {hasQuoted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"
            >
              <CheckCircle className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </div>
      </div>

      {/* 引用列表 */}
      {showDetails && quoteCount > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">引用记录</p>
          <div className="space-y-1">
            {quotedParagraphs.slice(0, 5).map((id, index) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <div className={`w-2 h-2 rounded-full ${colors.gradient.replace('from-', 'bg-').split(' ')[0]}`} />
                <span className="truncate">段落 #{id.slice(-8)}</span>
              </motion.div>
            ))}
            {quoteCount > 5 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 pl-4">
                还有 {quoteCount - 5} 条引用...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 主组件 ====================

export function ActivityProgress({
  activityType,
  rules,
  progress,
  status,
  endTime,
  rewardClaimed = false,
  rewardAmount,
  showDetails = true,
  className = '',
}: ActivityProgressProps) {
  const colors = useMemo(() => getActivityColors(activityType), [activityType]);
  const timeRemaining = useMemo(
    () => (endTime ? getTimeRemaining(endTime) : null),
    [endTime]
  );

  const isCompleted = status === 'COMPLETED';
  const isFailed = status === 'FAILED';

  // 无进度数据时的空状态
  if (!progress || !rules) {
    return (
      <div className={`p-6 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg ${className}`}>
        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {getActivityIcon(activityType)}
          </div>
          <p className="text-gray-500 dark:text-gray-400">暂无进度数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 shadow-lg overflow-hidden ${className}`}>
      {/* 完成庆祝动画 */}
      <AnimatePresence>
        {isCompleted && !rewardClaimed && (
          <CompletionCelebration rewardAmount={rewardAmount} />
        )}
      </AnimatePresence>

      {/* 已领取奖励状态 */}
      {isCompleted && rewardClaimed && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">活动已完成，奖励已领取</span>
          </div>
        </div>
      )}

      {/* 失败状态 */}
      {isFailed && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Clock className="w-5 h-5" />
            <span className="font-medium">活动已结束，未能完成目标</span>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="p-6">
        {/* 剩余时间（进行中时显示） */}
        {status === 'JOINED' && timeRemaining && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-3 rounded-xl flex items-center justify-between ${
              timeRemaining.isUrgent
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${timeRemaining.isUrgent ? 'text-red-500' : 'text-gray-500'}`} />
              <span className={`text-sm ${timeRemaining.isUrgent ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                剩余时间
              </span>
            </div>
            <span className={`font-bold ${timeRemaining.isUrgent ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>
              {timeRemaining.text}
            </span>
          </motion.div>
        )}

        {/* 根据活动类型渲染不同的进度展示 */}
        {activityType === 'READING_CHALLENGE' && (
          <ReadingChallengeProgress
            progress={progress}
            rules={rules}
            colors={colors}
            showDetails={showDetails}
          />
        )}

        {activityType === 'WRITING_CONTEST' && (
          <WritingContestProgress
            progress={progress}
            rules={rules}
            colors={colors}
            showDetails={showDetails}
          />
        )}

        {activityType === 'COMMUNITY_EVENT' && (
          <CommunityEventProgress
            progress={progress}
            colors={colors}
            showDetails={showDetails}
          />
        )}

        {activityType === 'SPECIAL_EVENT' && (
          <div className="text-center py-4">
            <div className={`w-12 h-12 mx-auto mb-3 rounded-full ${colors.bg} flex items-center justify-center`}>
              <Trophy className={`w-6 h-6 ${colors.text}`} />
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              官方活动进度由系统自动追踪
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityProgress;
