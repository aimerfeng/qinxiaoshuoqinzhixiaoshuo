'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { getDashboard, type DashboardData, type ActivityItem } from '@/services/creator';

// ==================== 图标组件 ====================

const ViewsIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LikesIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const QuotesIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  </svg>
);

const WorksIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const CommentsIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const ChartIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ==================== 统计卡片组件 ====================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  iconBgClass: string;
  isLoading?: boolean;
}

function StatCard({ title, value, change, changeType = 'neutral', icon, iconBgClass, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className={`rounded-lg p-2.5 ${iconBgClass} opacity-50`}>{icon}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
          {change && (
            <p className={`mt-1 text-xs ${
              changeType === 'increase' ? 'text-accent-green' :
              changeType === 'decrease' ? 'text-accent-red' :
              'text-muted-foreground'
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${iconBgClass}`}>{icon}</div>
      </div>
    </div>
  );
}

// ==================== 趋势图表组件 ====================

interface TrendChartProps {
  data: ActivityItem[];
  isLoading?: boolean;
}

function TrendChart({ data, isLoading }: TrendChartProps) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-end justify-between gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1">
            <div
              className="animate-pulse rounded-t bg-muted"
              style={{ height: `${Math.random() * 60 + 20}%` }}
            />
          </div>
        ))}
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="flex h-32 items-end justify-between gap-1">
      {data.map((item, index) => {
        const height = (item.count / maxCount) * 100;
        const date = new Date(item.date);
        const dayName = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

        return (
          <div key={index} className="group flex flex-1 flex-col items-center">
            <div className="relative w-full">
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                {item.count} 次阅读
              </div>
              {/* Bar */}
              <div
                className="w-full rounded-t bg-gradient-to-t from-primary to-secondary transition-all group-hover:from-primary/80 group-hover:to-secondary/80"
                style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px' }}
              />
            </div>
            <span className="mt-1 text-xs text-muted-foreground">周{dayName}</span>
          </div>
        );
      })}
    </div>
  );
}

// ==================== 热门作品组件 ====================

interface TopWorksListProps {
  works: DashboardData['topPerformingWorks'];
  isLoading?: boolean;
}

function TopWorksList({ works, isLoading }: TopWorksListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (works.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <WorksIcon />
        <p className="mt-2 text-sm text-muted-foreground">暂无作品数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {works.slice(0, 5).map((work, index) => (
        <Link
          key={work.id}
          href={`/creator/works/${work.id}`}
          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
        >
          {/* Rank badge */}
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
            index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
            index === 1 ? 'bg-gray-400/20 text-gray-500' :
            index === 2 ? 'bg-orange-500/20 text-orange-600' :
            'bg-muted text-muted-foreground'
          }`}>
            {index + 1}
          </div>
          {/* Cover */}
          <div className="h-12 w-12 overflow-hidden rounded-lg bg-muted">
            {work.coverImage ? (
              <img src={work.coverImage} alt={work.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <WorksIcon />
              </div>
            )}
          </div>
          {/* Info */}
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-foreground">{work.title}</p>
            <p className="text-xs text-muted-foreground">
              {work.viewCount.toLocaleString()} 阅读 · {work.likeCount.toLocaleString()} 点赞
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ==================== 近期活动组件 ====================

interface RecentActivityProps {
  activity: ActivityItem[];
  isLoading?: boolean;
}

function RecentActivity({ activity, isLoading }: RecentActivityProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-muted p-4">
          <ClockIcon />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">暂无最近动态</p>
        <p className="text-xs text-muted-foreground">发布作品后，这里会显示读者的互动</p>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'view': return <ViewsIcon />;
      case 'like': return <LikesIcon />;
      case 'quote': return <QuotesIcon />;
      case 'comment': return <CommentsIcon />;
      default: return <ViewsIcon />;
    }
  };

  const getActivityText = (type: string, count: number) => {
    switch (type) {
      case 'view': return `${count} 次阅读`;
      case 'like': return `${count} 个点赞`;
      case 'quote': return `${count} 次引用`;
      case 'comment': return `${count} 条评论`;
      default: return `${count} 次互动`;
    }
  };

  const getActivityBgClass = (type: string) => {
    switch (type) {
      case 'view': return 'bg-primary/10 text-primary';
      case 'like': return 'bg-accent-pink/10 text-accent-pink';
      case 'quote': return 'bg-accent-green/10 text-accent-green';
      case 'comment': return 'bg-secondary/10 text-secondary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-3">
      {activity.map((item, index) => {
        const date = new Date(item.date);
        const formattedDate = `${date.getMonth() + 1}月${date.getDate()}日`;

        return (
          <div key={index} className="flex items-center gap-3 rounded-lg p-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getActivityBgClass(item.type)}`}>
              {getActivityIcon(item.type)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{getActivityText(item.type, item.count)}</p>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== 错误提示组件 ====================

interface ErrorMessageProps {
  message: string;
  onRetry: () => void;
}

function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-accent-red/20 bg-accent-red/5 p-8 text-center">
      <div className="rounded-full bg-accent-red/10 p-4">
        <svg className="h-8 w-8 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="mt-4 text-sm text-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        <RefreshIcon />
        重试
      </button>
    </div>
  );
}

// ==================== 主页面组件 ====================

/**
 * 创作者仪表板页面
 *
 * 任务 8.2.2: 仪表板页面 - 与仪表板 API 集成显示创作者统计数据
 *
 * 功能:
 * - 显示总作品数、总阅读量、总点赞数、总引用数
 * - 显示近7天统计数据和趋势图
 * - 显示热门作品排行
 * - 显示近期活动
 * - 快捷操作入口
 * - 加载状态和错误处理
 */
export default function CreatorDashboardPage() {
  const { user } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取仪表板数据
  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError('获取仪表板数据失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // 计算变化百分比
  const calculateChange = (recent: number, total: number): { text: string; type: 'increase' | 'decrease' | 'neutral' } => {
    if (total === 0 || recent === 0) return { text: '', type: 'neutral' };
    const percentage = ((recent / total) * 100).toFixed(1);
    return {
      text: `近7天 +${percentage}%`,
      type: 'increase',
    };
  };

  return (
    <div className="space-y-6">
      {/* 欢迎区域 */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-secondary/10 to-accent-pink/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              欢迎回来，{user?.displayName || user?.username || '创作者'}！
            </h1>
            <p className="mt-1 text-muted-foreground">
              今天是创作的好日子，让我们开始吧。
            </p>
          </div>
          <button
            onClick={fetchDashboard}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshIcon />
            刷新数据
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && !isLoading && (
        <ErrorMessage message={error} onRetry={fetchDashboard} />
      )}

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总阅读量"
          value={dashboardData?.totalReads.toLocaleString() ?? '0'}
          change={dashboardData ? calculateChange(dashboardData.recentStats.views, dashboardData.totalReads).text : ''}
          changeType={dashboardData ? calculateChange(dashboardData.recentStats.views, dashboardData.totalReads).type : 'neutral'}
          icon={<ViewsIcon />}
          iconBgClass="bg-primary/10 text-primary"
          isLoading={isLoading}
        />
        <StatCard
          title="获得点赞"
          value={dashboardData?.totalLikes.toLocaleString() ?? '0'}
          change={dashboardData ? calculateChange(dashboardData.recentStats.likes, dashboardData.totalLikes).text : ''}
          changeType={dashboardData ? calculateChange(dashboardData.recentStats.likes, dashboardData.totalLikes).type : 'neutral'}
          icon={<LikesIcon />}
          iconBgClass="bg-accent-pink/10 text-accent-pink"
          isLoading={isLoading}
        />
        <StatCard
          title="被引用次数"
          value={dashboardData?.totalQuotes.toLocaleString() ?? '0'}
          change={dashboardData ? calculateChange(dashboardData.recentStats.quotes, dashboardData.totalQuotes).text : ''}
          changeType={dashboardData ? calculateChange(dashboardData.recentStats.quotes, dashboardData.totalQuotes).type : 'neutral'}
          icon={<QuotesIcon />}
          iconBgClass="bg-accent-green/10 text-accent-green"
          isLoading={isLoading}
        />
        <StatCard
          title="作品数量"
          value={dashboardData?.totalWorks ?? 0}
          icon={<WorksIcon />}
          iconBgClass="bg-secondary/10 text-secondary"
          isLoading={isLoading}
        />
      </div>

      {/* 近7天统计和热门作品 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 近7天阅读趋势 */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">近7天阅读趋势</h2>
            {dashboardData && (
              <span className="text-sm text-muted-foreground">
                共 {dashboardData.recentStats.views.toLocaleString()} 次阅读
              </span>
            )}
          </div>
          <TrendChart
            data={dashboardData?.recentStats.viewsTrend ?? []}
            isLoading={isLoading}
          />
          {/* 近7天统计摘要 */}
          {dashboardData && !isLoading && (
            <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">{dashboardData.recentStats.views}</p>
                <p className="text-xs text-muted-foreground">阅读</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">{dashboardData.recentStats.likes}</p>
                <p className="text-xs text-muted-foreground">点赞</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">{dashboardData.recentStats.quotes}</p>
                <p className="text-xs text-muted-foreground">引用</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">{dashboardData.recentStats.comments}</p>
                <p className="text-xs text-muted-foreground">评论</p>
              </div>
            </div>
          )}
        </div>

        {/* 热门作品 */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">热门作品</h2>
            <Link href="/creator/works" className="text-sm text-primary hover:underline">
              查看全部
            </Link>
          </div>
          <TopWorksList
            works={dashboardData?.topPerformingWorks ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 新建作品 */}
        <Link
          href="/creator/works/new"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-card-hover"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white">
            <PlusIcon />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">新建作品</h3>
            <p className="text-sm text-muted-foreground">开始创作新的小说或漫画</p>
          </div>
          <ArrowRightIcon />
        </Link>

        {/* 作品管理 */}
        <Link
          href="/creator/works"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-card-hover"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-foreground">
            <WorksIcon />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">作品管理</h3>
            <p className="text-sm text-muted-foreground">管理已发布和草稿作品</p>
          </div>
          <ArrowRightIcon />
        </Link>

        {/* 数据分析 */}
        <Link
          href="/creator/analytics"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/50 hover:shadow-card-hover"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-foreground">
            <ChartIcon />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">数据分析</h3>
            <p className="text-sm text-muted-foreground">查看详细的作品数据</p>
          </div>
          <ArrowRightIcon />
        </Link>
      </div>

      {/* 近期活动 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">最近动态</h2>
          <Link href="/creator/activity" className="text-sm text-primary hover:underline">
            查看全部
          </Link>
        </div>
        <div className="mt-4">
          <RecentActivity
            activity={dashboardData?.recentActivity ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
