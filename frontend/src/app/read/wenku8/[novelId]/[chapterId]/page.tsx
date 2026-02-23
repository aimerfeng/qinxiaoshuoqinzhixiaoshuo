'use client';

import { useParams } from 'next/navigation';
import { Wenku8NovelReader } from '@/components/reader/Wenku8NovelReader';

export default function Wenku8ChapterReaderPage() {
  const params = useParams();
  const novelId = params.novelId as string;
  const chapterId = params.chapterId as string;

  return <Wenku8NovelReader novelId={novelId} chapterId={chapterId} />;
}
