'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

// ==================== 类型定义 ====================

interface ChapterStat {
  chapterId: string;
  title: string;
  orderIndex: number;
  viewCount: number;
  completionRate: number;
  wordCount: number;
}

interface TopQuotedParagraph {
  paragraphId: string;
  anchorId: string;
  content: string;
  quoteCount: number;
  chapterTitle: string;
}

interface DateStat {
  date: string;
  count: number;
}

interface ReaderActivity {
  hour: number;
  count: number;
}

interface WorkStats {
  workId: string;
  title: string;
  totalViews: number;
  totalLikes: number;
  totalQuotes: number;
  totalComments: number;
  chapterStats: ChapterStat[];
  viewsTrend: {
    daily: DateStat[];
    weekly: DateStat[];
    monthly: DateStat[];
  };
  topQuotedParagraphs: TopQuotedParagraph[];
  readerActivity: ReaderActivity[];
  statsRange: {
    startDate: string;
    endDate: string;
  };
}

type TrendPeriod = 'daily' | 'weekly' | 'monthly';

// ==================== 图标组件 ====================

const ArrowLeftIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

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

const CommentsIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

// ==================== 辅助函数 ====================

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// ==================== 统计卡片组件 ====================

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{formatNumber(value)}</p>
        </div>
        <div className={`rounded-full p-3 ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ==================== 简易柱状图组件 ====================

interface BarChartProps {
  data: DateStat[];
  height?: number;
}

function BarChart({ data, height = 200 }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="flex items-end justify-between gap-1" style={{ height }}>
      {data.map((item, index) => {
        const barHeight = (item.count / maxValue) * 100;
        return (
          <div key={index} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-gradient-to-t from-primary to-secondary transition-all hover:opacity-80"
              style={{ height: `${Math.max(barHeight, 2)}%` }}
              title={`${item.count} 次阅读`}
            />
            <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ==================== 活跃时段图表组件 ====================

interface ActivityChartProps {
  data: ReaderActivity[];
}

function ActivityChart({ data }: ActivityChartProps) {
  const maxValue = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="flex items-end justify-between gap-0.5" style={{ height: 120 }}>
      {data.map((item) => {
        const barHeight = (item.count / maxValue) * 100;
        const isActive = item.hour >= 20 || item.hour <= 2; // 晚8点到凌晨2点
        return (
          <div key={item.hour} className="flex flex-1 flex-col items-center">
            <div
              className={`w-full rounded-t transition-all hover:opacity-80 ${
                isActive ? 'bg-gradient-to-t from-secondary to-pink-400' : 'bg-primary/60'
              }`}
              style={{ height: `${Math.max(barHeight, 2)}%` }}
              title={`${item.hour}:00 - ${item.count} 次`}
            />
            {item.hour % 4 === 0 && (
              <span className="mt-1 text-xs text-muted-foreground">{item.hour}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==================== 章节完成率表格组件 ====================

interface ChapterTableProps {
  chapters: ChapterStat[];
}

function ChapterTable({ chapters }: ChapterTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="py-3 text-left text-sm font-medium text-muted-foreground">章节</th>
            <th className="py-3 text-right text-sm font-medium text-muted-foreground">阅读量</th>
            <th className="py-3 text-right text-sm font-medium text-muted-foreground">完成率</th>
            <th className="py-3 text-right text-sm font-medium text-muted-foreground">字数</th>
          </tr>
        </thead>
        <tbody>
          {chapters.map((chapter) => (
            <tr key={chapter.chapterId} className="border-b border-border/50 hover:bg-muted/50">
              <td className="py-3">
                <span className="text-sm text-foreground">
                  第{chapter.orderIndex}章 {chapter.title}
                </span>
              </td>
              <td className="py-3 text-right">
                <span className="text-sm text-foreground">{formatNumber(chapter.viewCount)}</span>
              </td>
              <td className="py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                      style={{ width: `${chapter.completionRate}%` }}
                    />
                  </div>
                  <span className="text-sm text-foreground">{chapter.completionRate}%</span>
                </div>
              </td>
              <td className="py-3 text-right">
                <span className="text-sm text-muted-foreground">{formatNumber(chapter.wordCount)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== 热门引用段落组件 ====================

interface TopQuotesProps {
  paragraphs: TopQuotedParagraph[];
}

function TopQuotes({ paragraphs }: TopQuotesProps) {
  if (paragraphs.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        暂无被引用的段落
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paragraphs.map((p, index) => (
        <div key={p.paragraphId} className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-foreground line-clamp-2">{p.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                来自《{p.chapterTitle}》
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1">
              <span className="text-sm font-medium text-primary">#{index + 1}</span>
              <span className="text-xs text-primary">{p.quoteCount} 次引用</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== 主页面组件 ====================

export default function WorkStatsPage() {
  const params = useParams();
  const workId = params.workId as string;

  const [stats, setStats] = useState<WorkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('daily');

  // 加载统计数据
  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get<{ data: WorkStats }>(`/creator/works/${workId}/stats`);
        setStats(response.data.data);
      } catch (err) {
        console.error('Failed to load stats:', err);
        setError('加载统计数据失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [workId]);

  // 加载状态
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  // 错误状态
  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg text-muted-foreground">{error || '数据不存在'}</p>
        <Link
          href={`/creator/works/${workId}`}
          className="mt-4 text-primary hover:underline"
        >
          返回作品详情
        </Link>
      </div>
    );
  }

  const trendData = stats.viewsTrend[trendPeriod];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Link
          href={`/creator/works/${workId}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{stats.title}</h1>
          <p className="text-sm text-muted-foreground">
            数据统计 · {stats.statsRange.startDate} 至 {stats.statsRange.endDate}
          </p>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="总阅读量"
          value={stats.totalViews}
          icon={<ViewsIcon />}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          title="总点赞数"
          value={stats.totalLikes}
          icon={<LikesIcon />}
          color="bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"
        />
        <StatCard
          title="总引用数"
          value={stats.totalQuotes}
          icon={<QuotesIcon />}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
        <StatCard
          title="总评论数"
          value={stats.totalComments}
          icon={<CommentsIcon />}
          color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
      </div>

      {/* 阅读趋势图表 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">阅读趋势</h2>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as TrendPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTrendPeriod(period)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  trendPeriod === period
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {period === 'daily' ? '日' : period === 'weekly' ? '周' : '月'}
              </button>
            ))}
          </div>
        </div>
        <BarChart data={trendData} height={200} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 读者活跃时段 */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-6 text-lg font-semibold text-foreground">读者活跃时段</h2>
          <ActivityChart data={stats.readerActivity} />
          <p className="mt-4 text-xs text-muted-foreground text-center">
            高亮区域为深夜活跃时段（20:00 - 02:00）
          </p>
        </div>

        {/* 热门引用段落 */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-6 text-lg font-semibold text-foreground">热门引用段落</h2>
          <TopQuotes paragraphs={stats.topQuotedParagraphs.slice(0, 5)} />
        </div>
      </div>

      {/* 章节数据表格 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-6 text-lg font-semibold text-foreground">章节数据</h2>
        <ChapterTable chapters={stats.chapterStats} />
      </div>
    </div>
  );
}
