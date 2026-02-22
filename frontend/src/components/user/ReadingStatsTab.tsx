'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { userService } from '@/services/user';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import type { ReadingStats, CategoryStat } from '@/types/user';
import type { ApiError } from '@/types';

/**
 * ReadingStatsTab 组件属性
 */
export interface ReadingStatsTabProps {
  /** 用户 ID */
  userId: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 格式化阅读时长
 */
function formatReadingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours} 小时 ${remainingMinutes} 分钟` : `${hours} 小时`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days} 天 ${remainingHours} 小时` : `${days} 天`;
}

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
 * 阅读统计 Tab 组件
 *
 * 需求17: 用户个人中心
 * 任务17.2.7: 阅读统计展示
 *
 * 功能:
 * - 显示总阅读时长、章节数、作品数
 * - 显示阅读连续天数（当前/最长）
 * - 显示喜爱的分类/类型
 * - 显示周/月阅读进度图表
 * - 加载骨架屏
 * - 空状态展示
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function ReadingStatsTab({ userId, className }: ReadingStatsTabProps) {
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载阅读统计
  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await userService.getUserReadingStats(userId);
      setStats(response.data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || '加载阅读统计失败');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // 加载状态
  if (isLoading) {
    return <ReadingStatsSkeleton className={className} />;
  }

  // 错误状态
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="text-5xl mb-4">😢</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">加载失败</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadStats} variant="outline">
          重试
        </Button>
      </div>
    );
  }

  // 空状态
  if (!stats || (stats.totalReadTime === 0 && stats.totalChaptersRead === 0)) {
    return <EmptyState className={className} />;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 核心统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon="⏱️"
          label="总阅读时长"
          value={formatReadingTime(stats.totalReadTime)}
          gradient="from-blue-500 to-cyan-500"
          delay={0}
        />
        <StatCard
          icon="📖"
          label="阅读章节"
          value={formatNumber(stats.totalChaptersRead)}
          gradient="from-purple-500 to-pink-500"
          delay={0.1}
        />
        <StatCard
          icon="📚"
          label="阅读作品"
          value={formatNumber(stats.totalWorksRead)}
          gradient="from-orange-500 to-red-500"
          delay={0.2}
        />
        <StatCard
          icon="🔥"
          label="连续阅读"
          value={`${stats.currentStreak} 天`}
          subValue={stats.longestStreak > stats.currentStreak ? `最长 ${stats.longestStreak} 天` : undefined}
          gradient="from-green-500 to-emerald-500"
          delay={0.3}
        />
      </div>

      {/* 阅读趋势图表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>阅读趋势</span>
        </h3>
        <ReadingChart weeklyData={stats.weeklyReadTime} monthlyData={stats.monthlyReadTime} />
      </motion.div>

      {/* 喜爱的分类 */}
      {stats.favoriteCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <span>❤️</span>
            <span>喜爱的类型</span>
          </h3>
          <FavoriteCategories categories={stats.favoriteCategories} />
        </motion.div>
      )}
    </div>
  );
}

/**
 * 统计卡片组件
 */
function StatCard({
  icon,
  label,
  value,
  subValue,
  gradient,
  delay,
}: {
  icon: string;
  label: string;
  value: string;
  subValue?: string;
  gradient: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm"
    >
      {/* 背景渐变装饰 */}
      <div
        className={cn(
          'absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br opacity-20 blur-xl',
          gradient
        )}
      />
      
      <div className="relative">
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-lg font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {subValue && (
          <div className="text-xs text-muted-foreground/70 mt-1">{subValue}</div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * 阅读趋势图表组件
 */
function ReadingChart({
  weeklyData,
  monthlyData,
}: {
  weeklyData: number[];
  monthlyData: number[];
}) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const data = viewMode === 'week' ? weeklyData : monthlyData;
  const maxValue = Math.max(...data, 1);

  // 生成日期标签
  const getLabels = () => {
    if (viewMode === 'week') {
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      const today = new Date().getDay();
      return Array.from({ length: 7 }, (_, i) => {
        const dayIndex = (today - 6 + i + 7) % 7;
        return days[dayIndex];
      });
    } else {
      // 月视图显示日期
      return Array.from({ length: monthlyData.length }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (monthlyData.length - 1 - i));
        return date.getDate().toString();
      });
    }
  };

  const labels = getLabels();

  return (
    <div>
      {/* 视图切换 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('week')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
            viewMode === 'week'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          本周
        </button>
        <button
          onClick={() => setViewMode('month')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
            viewMode === 'month'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          本月
        </button>
      </div>

      {/* 柱状图 */}
      <div className="flex items-end gap-1 h-32">
        {data.map((value, index) => {
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const isToday = viewMode === 'week' && index === data.length - 1;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div className="relative w-full flex justify-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 4)}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className={cn(
                    'w-full max-w-8 rounded-t-lg',
                    isToday
                      ? 'bg-gradient-to-t from-primary to-secondary'
                      : 'bg-gradient-to-t from-primary/40 to-primary/60'
                  )}
                  style={{ minHeight: '4px' }}
                />
                {/* 数值提示 */}
                {value > 0 && (
                  <div className="absolute -top-5 text-2xs text-muted-foreground">
                    {value}分
                  </div>
                )}
              </div>
              <span className={cn(
                'text-2xs',
                isToday ? 'text-primary font-medium' : 'text-muted-foreground'
              )}>
                {viewMode === 'week' ? labels[index] : (index % 5 === 0 || index === data.length - 1 ? labels[index] : '')}
              </span>
            </div>
          );
        })}
      </div>

      {/* 统计摘要 */}
      <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs text-muted-foreground">
        <span>
          {viewMode === 'week' ? '本周' : '本月'}总计: {formatReadingTime(data.reduce((a, b) => a + b, 0))}
        </span>
        <span>
          日均: {formatReadingTime(Math.round(data.reduce((a, b) => a + b, 0) / data.length))}
        </span>
      </div>
    </div>
  );
}

/**
 * 喜爱的分类组件
 */
function FavoriteCategories({ categories }: { categories: CategoryStat[] }) {
  const colors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-orange-500 to-red-500',
    'from-green-500 to-emerald-500',
    'from-yellow-500 to-orange-500',
  ];

  return (
    <div className="space-y-3">
      {categories.slice(0, 5).map((category, index) => (
        <div key={category.category} className="space-y-1.5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-foreground font-medium">{category.category}</span>
            <span className="text-muted-foreground text-xs">
              {category.count} 本 · {category.percentage}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${category.percentage}%` }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn('h-full rounded-full bg-gradient-to-r', colors[index % colors.length])}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 空状态组件
 */
function EmptyState({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)}>
      <div className="text-6xl mb-4">📊</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">暂无阅读记录</h3>
      <p className="text-sm text-muted-foreground max-w-xs text-center">
        开始阅读作品后，这里会显示你的阅读统计数据
      </p>
    </div>
  );
}

/**
 * 骨架屏组件
 */
function ReadingStatsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* 统计卡片骨架 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card/80 p-4 animate-pulse"
          >
            <div className="h-8 w-8 bg-muted rounded mb-2" />
            <div className="h-5 w-16 bg-muted rounded mb-1" />
            <div className="h-3 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* 图表骨架 */}
      <div className="rounded-2xl border border-border bg-card/80 p-4 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="flex items-end gap-1 h-32">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full max-w-8 bg-muted rounded-t-lg"
                style={{ height: `${Math.random() * 60 + 20}%` }}
              />
              <div className="h-3 w-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* 分类骨架 */}
      <div className="rounded-2xl border border-border bg-card/80 p-4 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
              <div className="h-2 w-full bg-muted rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReadingStatsTab;
