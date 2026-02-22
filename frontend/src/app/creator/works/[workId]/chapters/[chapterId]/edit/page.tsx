'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import type { VditorEditorRef, EditorMode } from '@/components/creator/VditorEditor';
import { useOfflineDraft } from '@/services/offline-draft';

// 动态导入 VditorEditor（避免 SSR 问题）
const VditorEditor = dynamic(
  () => import('@/components/creator/VditorEditor'),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

// ==================== 类型定义 ====================

interface Chapter {
  id: string;
  workId: string;
  title: string;
  content: string;
  order: number;
  status: 'DRAFT' | 'PUBLISHED';
  wordCount: number;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Work {
  id: string;
  title: string;
  type: 'NOVEL' | 'MANGA';
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

// ==================== 图标组件 ====================

const ArrowLeftIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const SaveIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3v4h-4M7 14h10M7 18h10M7 10h4" />
  </svg>
);

const PublishIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const PreviewIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ==================== 骨架屏组件 ====================

function EditorSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-muted rounded-t-lg" />
      <div className="h-[500px] bg-muted/50 rounded-b-lg" />
    </div>
  );
}

// ==================== 保存状态指示器 ====================

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  isOnline?: boolean;
  lastSavedAt?: Date | null;
}

function SaveStatusIndicator({ status, isOnline = true, lastSavedAt }: SaveStatusIndicatorProps) {
  const statusConfig = {
    saved: { icon: <CheckIcon />, text: '已保存', color: 'text-green-600' },
    saving: { icon: <SpinnerIcon />, text: '保存中...', color: 'text-blue-600' },
    unsaved: { icon: null, text: isOnline ? '未保存' : '离线保存', color: isOnline ? 'text-yellow-600' : 'text-orange-600' },
    error: { icon: null, text: '保存失败', color: 'text-red-600' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          离线
        </span>
      )}
      <div className={`flex items-center gap-1.5 text-sm ${config.color}`}>
        {config.icon}
        <span>{config.text}</span>
      </div>
      {lastSavedAt && (
        <span className="text-xs text-muted-foreground">
          {new Date(lastSavedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}

// ==================== 主页面组件 ====================

export default function ChapterEditPage() {
  const params = useParams();
  const workId = params.workId as string;
  const chapterId = params.chapterId as string;

  const editorRef = useRef<VditorEditorRef>(null);

  // 状态
  const [work, setWork] = useState<Work | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('wysiwyg');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);

  // 章节标题
  const [title, setTitle] = useState('');
  const [titleDirty, setTitleDirty] = useState(false);

  // 离线草稿 Hook
  const {
    saveDraft: saveOfflineDraft,
    saveImmediately,
    loadLocalDraft,
    syncStatus,
    isOnline,
    isSaving,
    lastSavedAt,
  } = useOfflineDraft({
    workId,
    chapterId,
    debounceMs: 3000,
  });

  // 计算保存状态
  const saveStatus: SaveStatus = isSaving
    ? 'saving'
    : syncStatus === 'pending'
    ? 'unsaved'
    : 'saved';

  // 加载章节数据
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        // 先尝试加载本地草稿
        const localDraft = await loadLocalDraft();

        // 并行加载作品和章节信息
        const [workRes, chapterRes] = await Promise.all([
          api.get<{ data: Work }>(`/works/${workId}`),
          api.get<{ data: Chapter }>(`/works/${workId}/chapters/${chapterId}`),
        ]);

        setWork(workRes.data.data);
        
        // 如果有本地草稿且比服务器版本新，使用本地草稿
        const serverChapter = chapterRes.data.data;
        if (localDraft && new Date(localDraft.lastSavedAt) > new Date(serverChapter.updatedAt)) {
          setChapter({
            ...serverChapter,
            content: localDraft.content,
            title: localDraft.title,
          });
          setTitle(localDraft.title);
        } else {
          setChapter(serverChapter);
          setTitle(serverChapter.title);
        }
        
        if (serverChapter.scheduledAt) {
          setScheduledTime(new Date(serverChapter.scheduledAt).toISOString().slice(0, 16));
        }
      } catch (err) {
        console.error('Failed to load chapter:', err);
        
        // 如果网络错误，尝试使用本地草稿
        const localDraft = await loadLocalDraft();
        if (localDraft) {
          setChapter({
            id: chapterId,
            workId,
            title: localDraft.title,
            content: localDraft.content,
            order: 0,
            status: 'DRAFT',
            wordCount: localDraft.wordCount,
            publishedAt: null,
            scheduledAt: null,
            createdAt: '',
            updatedAt: localDraft.lastSavedAt.toISOString(),
          });
          setTitle(localDraft.title);
          setError('网络不可用，已加载本地草稿');
        } else {
          setError('加载章节失败，请稍后重试');
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [workId, chapterId, loadLocalDraft]);

  // 保存草稿（使用离线草稿服务）
  const saveDraft = useCallback(async (content: string) => {
    if (!chapter) return;
    await saveImmediately(content, titleDirty ? title : chapter.title);
    setTitleDirty(false);
  }, [chapter, title, titleDirty, saveImmediately]);

  // 手动保存
  const handleManualSave = useCallback(async () => {
    const content = editorRef.current?.getValue() || '';
    await saveDraft(content);
  }, [saveDraft]);

  // 自动保存回调（使用防抖）
  const handleAutoSave = useCallback((content: string) => {
    saveOfflineDraft(content, titleDirty ? title : chapter?.title || '');
  }, [saveOfflineDraft, title, titleDirty, chapter?.title]);

  // 内容变化回调
  const handleContentChange = useCallback(() => {
    // 内容变化时不需要手动设置状态，由 useOfflineDraft 管理
  }, []);

  // 标题变化
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setTitleDirty(true);
  };

  // 发布章节
  const handlePublish = async () => {
    if (!chapter) return;

    setIsPublishing(true);
    try {
      const content = editorRef.current?.getValue() || '';
      await api.patch(`/works/${workId}/chapters/${chapterId}`, {
        content,
        title,
        status: 'PUBLISHED',
        publishedAt: new Date().toISOString(),
      });
      
      // 更新本地状态
      setChapter(prev => prev ? { ...prev, status: 'PUBLISHED' } : null);
      
      // 显示成功提示
      alert('章节发布成功！');
    } catch (err) {
      console.error('Failed to publish chapter:', err);
      alert('发布失败，请稍后重试');
    } finally {
      setIsPublishing(false);
    }
  };

  // 定时发布
  const handleSchedulePublish = async () => {
    if (!chapter || !scheduledTime) return;

    setIsPublishing(true);
    try {
      const content = editorRef.current?.getValue() || '';
      await api.patch(`/works/${workId}/chapters/${chapterId}`, {
        content,
        title,
        scheduledAt: new Date(scheduledTime).toISOString(),
      });
      
      setChapter(prev => prev ? { ...prev, scheduledAt: scheduledTime } : null);
      setShowScheduleModal(false);
      
      alert(`章节已设置为 ${new Date(scheduledTime).toLocaleString('zh-CN')} 发布`);
    } catch (err) {
      console.error('Failed to schedule publish:', err);
      alert('设置定时发布失败，请稍后重试');
    } finally {
      setIsPublishing(false);
    }
  };

  // 图片上传处理
  const handleUploadIllustration = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<{ data: { url: string } }>('/creator/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return response.data.data.url;
  };

  // 预览章节
  const handlePreview = () => {
    // 在新标签页打开预览
    window.open(`/read/${workId}/${chapterId}?preview=true`, '_blank');
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
      // Ctrl/Cmd + Shift + P 发布
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        if (chapter?.status !== 'PUBLISHED') {
          handlePublish();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave, chapter?.status]);

  // 加载状态
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
        <EditorSkeleton />
      </div>
    );
  }

  // 错误状态
  if (error || !chapter || !work) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg text-muted-foreground">{error || '章节不存在'}</p>
        <Link
          href={`/creator/works/${workId}`}
          className="mt-4 text-primary hover:underline"
        >
          返回作品详情
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部导航栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/creator/works/${workId}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon />
            <span className="hidden sm:inline">返回</span>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div>
            <p className="text-sm text-muted-foreground">{work.title}</p>
            <p className="text-xs text-muted-foreground">第 {chapter.order} 章</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SaveStatusIndicator status={saveStatus} isOnline={isOnline} lastSavedAt={lastSavedAt} />
          
          {/* 预览按钮 */}
          <button
            onClick={handlePreview}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PreviewIcon />
            <span className="hidden sm:inline">预览</span>
          </button>

          {/* 保存按钮 */}
          <button
            onClick={handleManualSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <SaveIcon />
            <span className="hidden sm:inline">保存</span>
          </button>

          {/* 定时发布按钮 */}
          {chapter.status !== 'PUBLISHED' && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ClockIcon />
              <span className="hidden sm:inline">定时</span>
            </button>
          )}

          {/* 发布按钮 */}
          {chapter.status !== 'PUBLISHED' ? (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
            >
              {isPublishing ? <SpinnerIcon /> : <PublishIcon />}
              <span>发布</span>
            </button>
          ) : (
            <span className="rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              已发布
            </span>
          )}
        </div>
      </div>

      {/* 章节标题输入 */}
      <div>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="输入章节标题..."
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* 编辑器 */}
      <VditorEditor
        ref={editorRef}
        initialValue={chapter.content}
        mode={editorMode}
        height={600}
        placeholder="开始创作你的故事..."
        onChange={handleContentChange}
        onAutoSave={handleAutoSave}
        autoSaveDelay={3000}
        onModeChange={setEditorMode}
        onUploadIllustration={handleUploadIllustration}
        uploadUrl="/api/v1/creator/upload/image"
      />

      {/* 定时发布弹窗 */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowScheduleModal(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">定时发布</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              设置章节的发布时间，到时间后将自动发布。
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                发布时间
              </label>
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                取消
              </button>
              <button
                onClick={handleSchedulePublish}
                disabled={!scheduledTime || isPublishing}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPublishing ? <SpinnerIcon /> : <ClockIcon />}
                确认设置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 快捷键提示 */}
      <div className="text-xs text-muted-foreground text-center">
        快捷键：Ctrl+S 保存 | Ctrl+Shift+P 发布
      </div>
    </div>
  );
}
