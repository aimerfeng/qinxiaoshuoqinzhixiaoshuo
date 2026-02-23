'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { motion } from 'motion/react';
import Header from '@/components/layout/Header';
import { wenku8Service, type Wenku8ChapterContent } from '@/services/wenku8';

export default function Wenku8ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const novelId = params.novelId as string;
  const chapterId = params.chapterId as string;
  const [chapter, setChapter] = useState<Wenku8ChapterContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (novelId && chapterId) {
      loadChapter();
    }
  }, [novelId, chapterId]);

  const loadChapter = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await wenku8Service.getChapterContent(novelId, chapterId);
      // apiRequest already unwraps the data, so response IS the Wenku8ChapterContent
      setChapter(response);
    } catch (err) {
      setError('加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const goToChapter = (id: string | undefined) => {
    if (id) {
      router.push(`/wenku8/novel/${novelId}/chapter/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/wenku8/novel/${novelId}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <List className="w-4 h-4" />
            目录
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => goToChapter(chapter?.prevChapterId)}
              disabled={!chapter?.prevChapterId}
              className="btn btn-outline px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              上一章
            </button>
            <button
              onClick={() => goToChapter(chapter?.nextChapterId)}
              disabled={!chapter?.nextChapterId}
              className="btn btn-outline px-3 py-1.5 text-sm disabled:opacity-50"
            >
              下一章
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

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

        {/* Content */}
        {chapter && (
          <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6">
            <h1 className="text-xl font-bold mb-6 text-center">{chapter.title}</h1>
            <div className="prose prose-lg max-w-none">
              {chapter.content.split('\n').map((paragraph, index) => (
                paragraph.trim() && (
                  <p key={index} className="mb-4 leading-relaxed text-foreground">
                    {paragraph}
                  </p>
                )
              ))}
            </div>
          </motion.article>
        )}

        {/* Bottom Navigation */}
        {chapter && (
          <div className="flex justify-between mt-6">
            <button
              onClick={() => goToChapter(chapter.prevChapterId)}
              disabled={!chapter.prevChapterId}
              className="btn btn-outline px-4 py-2 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              上一章
            </button>
            <Link href={`/wenku8/novel/${novelId}`} className="btn btn-ghost px-4 py-2">
              <List className="w-4 h-4 mr-1" />
              目录
            </Link>
            <button
              onClick={() => goToChapter(chapter.nextChapterId)}
              disabled={!chapter.nextChapterId}
              className="btn btn-outline px-4 py-2 disabled:opacity-50"
            >
              下一章
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
