'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ChapterPreview } from '@/components/creator';

// ==================== 类型定义 ====================

interface Chapter {
  id: string;
  workId: string;
  title: string;
  content: string;
  order: number;
  status: 'DRAFT' | 'PUBLISHED';
  wordCount: number;
}

interface Work {
  id: string;
  title: string;
  type: 'NOVEL' | 'MANGA';
}

type ThemeMode = 'light' | 'dark' | 'sepia';
type FontFamily = 'sans' | 'serif' | 'display';

// ==================== 图标组件 ====================

const ArrowLeftIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// ==================== 主页面组件 ====================

export default function ChapterPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const workId = params.workId as string;
  const chapterId = params.chapterId as string;

  // 状态
  const [work, setWork] = useState<Work | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // 预览设置
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState<FontFamily>('serif');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [paragraphSpacing, setParagraphSpacing] = useState(1.5);

  // 是否从编辑器跳转
  const isFromEditor = searchParams.get('preview') === 'true';

  // 加载数据
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [workRes, chapterRes] = await Promise.all([
          api.get<{ data: Work }>(`/works/${workId}`),
          api.get<{ data: Chapter }>(`/works/${workId}/chapters/${chapterId}`),
        ]);

        setWork(workRes.data.data);
        setChapter(chapterRes.data.data);
      } catch (err) {
        console.error('Failed to load chapter:', err);
        setError('加载章节失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [workId, chapterId]);

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="h-12 w-full rounded bg-muted" />
            <div className="h-[600px] rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !chapter || !work) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">{error || '章节不存在'}</p>
          <Link
            href={`/creator/works/${workId}`}
            className="mt-4 inline-block text-primary hover:underline"
          >
            返回作品详情
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部工具栏 */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={isFromEditor ? `/creator/works/${workId}/chapters/${chapterId}/edit` : `/creator/works/${workId}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeftIcon />
                <span className="hidden sm:inline">{isFromEditor ? '返回编辑' : '返回'}</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div>
                <p className="text-sm font-medium text-foreground">{work.title}</p>
                <p className="text-xs text-muted-foreground">第 {chapter.order} 章 · 预览模式</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 设置按钮 */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  showSettings
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <SettingsIcon />
                <span className="hidden sm:inline">设置</span>
              </button>

              {/* 编辑按钮 */}
              <Link
                href={`/creator/works/${workId}/chapters/${chapterId}/edit`}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                <EditIcon />
                <span className="hidden sm:inline">编辑</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {/* 字体大小 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  字体大小
                </label>
                <input
                  type="range"
                  min="14"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{fontSize}px</span>
              </div>

              {/* 行高 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  行高
                </label>
                <input
                  type="range"
                  min="1.4"
                  max="2.4"
                  step="0.1"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{lineHeight}</span>
              </div>

              {/* 段落间距 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  段落间距
                </label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.5"
                  value={paragraphSpacing}
                  onChange={(e) => setParagraphSpacing(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{paragraphSpacing}em</span>
              </div>

              {/* 字体 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  字体
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                >
                  <option value="serif">宋体</option>
                  <option value="sans">黑体</option>
                  <option value="display">艺术体</option>
                </select>
              </div>

              {/* 主题 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  主题
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as ThemeMode)}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                >
                  <option value="light">明亮</option>
                  <option value="dark">暗黑</option>
                  <option value="sepia">护眼</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 预览内容 */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ChapterPreview
          content={chapter.content}
          title={chapter.title}
          showTitle={true}
          fontSize={fontSize}
          lineHeight={lineHeight}
          fontFamily={fontFamily}
          paragraphSpacing={paragraphSpacing}
          theme={theme}
        />

        {/* 章节信息 */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>字数：{chapter.wordCount.toLocaleString()} 字</p>
          <p className="mt-1">
            状态：
            <span className={chapter.status === 'PUBLISHED' ? 'text-green-600' : 'text-yellow-600'}>
              {chapter.status === 'PUBLISHED' ? '已发布' : '草稿'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
