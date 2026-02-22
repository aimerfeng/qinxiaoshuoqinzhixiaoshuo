'use client';

import { useMemo, useCallback, useState } from 'react';
import { useReadingStore } from '@/store/reading';
import { ParagraphRenderer } from './ParagraphRenderer';
import { ParagraphMenu } from './ParagraphMenu';
import { cn } from '@/utils/cn';
import type { Paragraph } from '@/types/reader';

interface ReaderContentProps {
  paragraphs: Paragraph[];
  content?: string;
  settings: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    paragraphSpacing: number;
    showParagraphNumbers: boolean;
    readingMode: string;
  };
  /** 引用回调 */
  onQuote?: (paragraph: Paragraph) => void;
  /** 高亮的锚点ID（用于引用跳转后的视觉反馈） */
  highlightedAnchorId?: string | null;
}

/**
 * 阅读器内容渲染组件
 *
 * 需求4验收标准2: WHEN 用户阅读章节 THEN System SHALL 按顺序渲染 Paragraph 并显示对应 Anchor_ID 标记
 * 需求3验收标准2: WHEN 用户在 Reader 中选择 Paragraph THEN System SHALL 显示引用操作选项
 * 需求3验收标准5: WHEN 用户点击 Card 中的引用链接 THEN System SHALL 导航到 Reader 并定位到对应 Paragraph
 * 任务4.2.2: 段落渲染组件（含 Markdown → HTML 转换层）
 * 任务7.2.1: 段落选择引用交互
 * 任务7.2.5: 引用跳转到原文功能
 */
export function ReaderContent({ paragraphs, content, settings, onQuote, highlightedAnchorId }: ReaderContentProps) {
  const [selectedParagraph, setSelectedParagraph] = useState<Paragraph | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const { setSelectedParagraph: setStoreParagraph } = useReadingStore();

  // 字体样式映射
  const fontFamilyClass = useMemo(() => {
    switch (settings.fontFamily) {
      case 'serif':
        return 'font-serif';
      case 'display':
        return 'font-display';
      default:
        return 'font-sans';
    }
  }, [settings.fontFamily]);

  // 处理段落点击
  const handleParagraphClick = useCallback(
    (paragraph: Paragraph, event: React.MouseEvent) => {
      event.stopPropagation();
      setSelectedParagraph(paragraph);
      setStoreParagraph(paragraph.id);

      // 计算菜单位置
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    },
    [setStoreParagraph]
  );

  // 关闭段落菜单
  const handleCloseMenu = useCallback(() => {
    setSelectedParagraph(null);
    setMenuPosition(null);
    setStoreParagraph(null);
  }, [setStoreParagraph]);

  // 处理引用操作
  const handleQuote = useCallback((paragraph: Paragraph) => {
    if (onQuote) {
      onQuote(paragraph);
    }
    handleCloseMenu();
  }, [onQuote, handleCloseMenu]);

  // 如果有原始内容但没有段落，使用 Markdown 渲染
  if (content && (!paragraphs || paragraphs.length === 0)) {
    return (
      <article
        className={cn('prose prose-lg dark:prose-invert max-w-none', fontFamilyClass)}
        style={
          {
            '--tw-prose-body': 'var(--foreground)',
            '--tw-prose-headings': 'var(--foreground)',
          } as React.CSSProperties
        }
      >
        <MarkdownContent content={content} />
      </article>
    );
  }

  return (
    <article className={cn('relative', fontFamilyClass)}>
      {/* 段落列表 */}
      <div
        className="space-y-0"
        style={{
          gap: `${settings.paragraphSpacing}em`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {paragraphs.map((paragraph, index) => (
          <ParagraphRenderer
            key={paragraph.id}
            paragraph={paragraph}
            index={index}
            showNumber={settings.showParagraphNumbers}
            isSelected={selectedParagraph?.id === paragraph.id}
            isHighlighted={highlightedAnchorId === paragraph.anchorId}
            onClick={(e) => handleParagraphClick(paragraph, e)}
            readingMode={settings.readingMode}
          />
        ))}
      </div>

      {/* 段落操作菜单 */}
      {selectedParagraph && menuPosition && (
        <ParagraphMenu
          paragraph={selectedParagraph}
          position={menuPosition}
          onClose={handleCloseMenu}
          onQuote={handleQuote}
        />
      )}
    </article>
  );
}

/**
 * Markdown 内容渲染组件
 * 将 Markdown 转换为 HTML
 */
function MarkdownContent({ content }: { content: string }) {
  const html = useMemo(() => {
    // 简单的 Markdown 转换
    // 在生产环境中应该使用 marked 或 markdown-it
    return (
      content
        // 标题
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-4">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-10 mb-5">$1</h1>')
        // 粗体和斜体
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // 代码块
        .replace(
          /```([\s\S]*?)```/g,
          '<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4"><code>$1</code></pre>'
        )
        .replace(/`(.*?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
        // 引用
        .replace(
          /^> (.*$)/gim,
          '<blockquote class="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">$1</blockquote>'
        )
        // 分隔线
        .replace(/^---$/gim, '<hr class="my-8 border-border" />')
        // 链接
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        // 图片
        .replace(
          /!\[([^\]]*)\]\(([^)]+)\)/g,
          '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-4 cursor-pointer" data-lightbox />'
        )
        // 段落
        .replace(/\n\n/g, '</p><p class="mb-4 text-indent-2">')
        .replace(/\n/g, '<br />')
    );
  }, [content]);

  return (
    <div
      className="leading-relaxed text-foreground"
      dangerouslySetInnerHTML={{ __html: `<p class="mb-4 text-indent-2">${html}</p>` }}
    />
  );
}
