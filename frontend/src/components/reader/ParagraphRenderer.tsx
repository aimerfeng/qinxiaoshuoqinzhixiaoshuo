'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Quote } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Paragraph } from '@/types/reader';

interface ParagraphRendererProps {
  paragraph: Paragraph;
  index: number;
  showNumber: boolean;
  isSelected: boolean;
  /** 是否高亮显示（用于引用跳转后的视觉反馈） */
  isHighlighted?: boolean;
  onClick: (e: React.MouseEvent) => void;
  readingMode: string;
}

/**
 * 段落渲染组件
 *
 * 需求4验收标准2: WHEN 用户阅读章节 THEN System SHALL 按顺序渲染 Paragraph 并显示对应 Anchor_ID 标记
 * 需求4验收标准3: WHEN 用户点击 Paragraph THEN System SHALL 展开段落操作菜单
 * 需求3验收标准5: WHEN 用户点击 Card 中的引用链接 THEN System SHALL 导航到 Reader 并定位到对应 Paragraph
 * 任务7.2.1: 段落选择引用交互 - 添加视觉反馈当段落被选中时（高亮）
 * 任务7.2.5: 引用跳转到原文功能 - 添加跳转后的高亮动画效果
 */
export function ParagraphRenderer({
  paragraph,
  index,
  showNumber,
  isSelected,
  isHighlighted = false,
  onClick,
  readingMode,
}: ParagraphRendererProps) {
  // 解析段落内容中的 Markdown
  const renderedContent = useMemo(() => {
    return parseInlineMarkdown(paragraph.content);
  }, [paragraph.content]);

  // 检查是否是图片段落
  const isImageParagraph = paragraph.content.trim().startsWith('![');

  return (
    <motion.div
      id={`paragraph-${paragraph.id}`}
      data-anchor-id={paragraph.anchorId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3 }}
      className={cn(
        'group relative',
        readingMode === 'page' && 'snap-start',
        // 选中状态的视觉反馈
        isSelected && 'relative'
      )}
    >
      {/* 选中状态高亮背景 */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'absolute -inset-x-4 -inset-y-2',
            'rounded-lg',
            'bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10',
            'border border-primary/20',
            'pointer-events-none'
          )}
        />
      )}

      {/* 选中状态左侧指示条 */}
      {isSelected && (
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          className={cn(
            'absolute -left-4 top-0 bottom-0 w-1',
            'bg-gradient-to-b from-primary to-primary/50',
            'rounded-full'
          )}
        />
      )}

      {/* 引用跳转高亮效果 - 带脉冲动画 */}
      {isHighlighted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: [0, 1, 1, 0.8, 1, 0.6, 0],
            scale: [0.95, 1, 1, 1, 1, 1, 1]
          }}
          transition={{ 
            duration: 3,
            times: [0, 0.1, 0.3, 0.5, 0.7, 0.85, 1],
            ease: 'easeOut'
          }}
          className={cn(
            'absolute -inset-x-4 -inset-y-2',
            'rounded-lg',
            'bg-gradient-to-r from-amber-400/30 via-amber-300/20 to-amber-400/30',
            'border-2 border-amber-400/50',
            'pointer-events-none',
            'shadow-lg shadow-amber-400/20'
          )}
        />
      )}

      {/* 引用跳转左侧指示条 */}
      {isHighlighted && (
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'absolute -left-4 top-0 bottom-0 w-1.5',
            'bg-gradient-to-b from-amber-400 to-amber-500',
            'rounded-full',
            'shadow-md shadow-amber-400/50'
          )}
        />
      )}

      {/* 段落序号 */}
      {showNumber && !isImageParagraph && (
        <span className={cn(
          'absolute -left-8 top-0 text-xs',
          isSelected 
            ? 'text-primary' 
            : 'text-muted-foreground'
        )}>
          {index + 1}
        </span>
      )}

      {/* 段落内容 */}
      {isImageParagraph ? (
        <ImageParagraph content={paragraph.content} />
      ) : (
        <p
          onClick={onClick}
          className={cn(
            'relative cursor-pointer text-foreground transition-all duration-200',
            '-mx-2 rounded px-2 py-1',
            'text-justify',
            // 首行缩进
            'indent-8',
            // 悬停效果
            !isSelected && 'hover:bg-primary/5',
            // 选中状态
            isSelected && 'text-foreground'
          )}
          data-interactive
        >
          <span dangerouslySetInnerHTML={{ __html: renderedContent }} />
        </p>
      )}

      {/* 引用数量指示器 */}
      {paragraph.quoteCount > 0 && (
        <div className={cn(
          'absolute -right-2 top-0 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
          <div className={cn(
            'flex items-center gap-1 text-xs',
            'px-2 py-0.5 rounded-full',
            'bg-primary/10 text-primary'
          )}>
            <Quote className="h-3 w-3" />
            <span>{paragraph.quoteCount}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * 图片段落渲染
 */
function ImageParagraph({ content }: { content: string }) {
  // 解析 Markdown 图片语法 ![alt](src)
  const match = content.match(/!\[([^\]]*)\]\(([^)]+)\)/);

  if (!match) return null;

  const [, alt, src] = match;

  return (
    <figure className="my-6 text-center">
      <img
        src={src}
        alt={alt || '插图'}
        className={cn(
          'mx-auto h-auto max-w-full rounded-lg shadow-card',
          'cursor-pointer transition-shadow hover:shadow-card-hover',
          'max-h-[70vh] object-contain'
        )}
        data-lightbox
        data-interactive
      />
      {alt && <figcaption className="mt-2 text-sm text-muted-foreground">{alt}</figcaption>}
    </figure>
  );
}

/**
 * 解析行内 Markdown
 */
function parseInlineMarkdown(text: string): string {
  return (
    text
      // 粗体和斜体
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 行内代码
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      // 删除线
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      // 链接
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
      )
  );
}
