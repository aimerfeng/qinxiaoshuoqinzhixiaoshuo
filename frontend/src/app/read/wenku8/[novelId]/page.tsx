'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, User, Clock, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion } from 'motion/react';
import Header from '@/components/layout/Header';
import { wenku8Service, type Wenku8NovelInfo, type Wenku8Volume } from '@/services/wenku8';

function VolumeSection({ volume, novelId, defaultOpen }: { volume: Wenku8Volume; novelId: string; defaultOpen: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
      >
        <span className="font-medium">{volume.name}</span>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{volume.chapters.length}章</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {isOpen && (
        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
          {volume.chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/read/wenku8/${novelId}/${chapter.id}`}
              className="p-2 rounded hover:bg-muted transition-colors text-sm truncate"
            >
              {chapter.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NovelDetailPage() {
  const params = useParams();
  const novelId = params.novelId as string;
  const [novelInfo, setNovelInfo] = useState<Wenku8NovelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (novelId) {
      loadNovelInfo();
    }
  }, [novelId]);

  const loadNovelInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await wenku8Service.getNovelInfo(novelId);
      // apiRequest already unwraps the data, so response IS the Wenku8NovelInfo
      setNovelInfo(response);
    } catch (err) {
      setError('加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
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

        {/* Novel Info */}
        {novelInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Header */}
            <div className="card p-6 mb-6">
              <div className="flex gap-6">
                {/* Cover */}
                <div className="w-32 h-44 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-4xl shrink-0">
                  📖
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold mb-2">{novelInfo.title}</h1>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {novelInfo.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {novelInfo.status}
                    </span>
                    {novelInfo.lastUpdate && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {novelInfo.lastUpdate}
                      </span>
                    )}
                  </div>
                  {novelInfo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {novelInfo.tags.map((tag) => (
                        <span key={tag} className="badge bg-muted text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {novelInfo.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Chapters */}
            <h2 className="text-lg font-semibold mb-4">章节目录</h2>
            <div className="space-y-3">
              {novelInfo.volumes.map((volume, index) => (
                <VolumeSection
                  key={volume.name}
                  volume={volume}
                  novelId={novelId}
                  defaultOpen={index === novelInfo.volumes.length - 1}
                />
              ))}
            </div>

            {/* Source Disclaimer */}
            <div className="mt-6 p-3 bg-muted/50 rounded-lg flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>内容来源于第三方，仅供学习交流使用</span>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
