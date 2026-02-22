'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { NovelReader } from '@/components/reader/NovelReader';

/**
 * 小说阅读器页面
 *
 * 需求4: 沉浸式阅读器
 * 需求3验收标准5: WHEN 用户点击 Card 中的引用链接 THEN System SHALL 导航到 Reader 并定位到对应 Paragraph
 * 任务4.2.1: 阅读器页面布局
 * 任务7.2.5: 引用跳转到原文功能
 */
export default function ReaderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const workId = params.workId as string;
  const chapterId = params.chapterId as string;
  const anchorId = searchParams.get('anchor');

  return <NovelReader workId={workId} chapterId={chapterId} anchorId={anchorId} />;
}
