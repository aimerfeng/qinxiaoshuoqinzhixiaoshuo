'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, User, Clock, Eye, Heart, Quote, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import Header from '@/components/layout/Header';
import { worksService } from '@/services/works';
import type { WorkDetailResponse, WorkStatus } from '@/types/works';

// 状态显示映射
const statusMap: Record<WorkStatus, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'bg-gray-100 text-gray-600' },
  PUBLISHED: { label: '连载中', color: 'bg-blue-100 text-blue-600' },
  COMPLETED: { label: '已完结', color: 'bg-green-100 text-green-600' },
  HIATUS: { label: '暂停更新', color: 'bg-yellow-100 text-yellow-600' },
  ABANDONED: { label: '已弃坑', color: 'bg-red-100 text-red-600' },
};

export default function WorkDetailPage() {
  const params = useParams();
  const workId = params.id as string;
  const [work, setWork] = useState<WorkDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workId) {
      loadWorkDetail();
    }
  }, [workId]);

  const loadWorkDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await worksService.getWorkById(workId);
      setWork(response);
    } catch (err) {
      setError('加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Work Detail */}
        {work && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Header Card */}
            <div className="card p-6 mb-6">
              <div className="flex gap-6">
                {/* Cover */}
                <div className="w-32 h-44 rounded-lg shrink-0 overflow-hidden">
                  {work.coverImage ? (
                    <img
                      src={work.coverImage}
                      alt={work.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = '<div class="flex h-full w-full items-center justify-center text-4xl text-white bg-gradient-to-br from-indigo-500 to-purple-600">📖</div>';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl">
                      📖
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold mb-2">{work.title}</h1>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {work.author.displayName || work.author.username}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${statusMap[work.status].color}`}>
                      {statusMap[work.status].label}
                    </span>
                    {work.updatedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(work.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {work.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {work.tags.map((tag) => (
                        <span key={tag} className="badge bg-muted text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {work.description && (
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {work.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs">字数</span>
                  </div>
                  <span className="font-semibold">{formatNumber(work.stats.wordCount)}</span>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Eye className="w-4 h-4" />
                    <span className="text-xs">阅读</span>
                  </div>
                  <span className="font-semibold">{formatNumber(work.stats.viewCount)}</span>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Heart className="w-4 h-4" />
                    <span className="text-xs">喜欢</span>
                  </div>
                  <span className="font-semibold">{formatNumber(work.stats.likeCount)}</span>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Quote className="w-4 h-4" />
                    <span className="text-xs">引用</span>
                  </div>
                  <span className="font-semibold">{formatNumber(work.stats.quoteCount)}</span>
                </div>
              </div>
            </div>

            {/* Chapters */}
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              章节目录
              <span className="text-sm font-normal text-muted-foreground">
                ({work.chapters.length}章)
              </span>
            </h2>
            
            {work.chapters.length === 0 ? (
              <div className="card p-8 text-center text-muted-foreground">
                暂无章节
              </div>
            ) : (
              <div className="card p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {work.chapters
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((chapter) => (
                      <Link
                        key={chapter.id}
                        href={`/read/${workId}/${chapter.id}`}
                        className="p-2 rounded hover:bg-muted transition-colors text-sm truncate flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{chapter.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatNumber(chapter.wordCount)}字
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
