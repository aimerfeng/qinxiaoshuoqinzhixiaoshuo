'use client';

import { useMemo, useState } from 'react';
import { marked, Renderer, Tokens } from 'marked';
import DOMPurify from 'dompurify';

// ==================== 类型定义 ====================

export interface ChapterPreviewProps {
  /** Markdown 内容 */
  content: string;
  /** 章节标题 */
  title?: string;
  /** 是否显示标题 */
  showTitle?: boolean;
  /** 字体大小 */
  fontSize?: number;
  /** 行高 */
  lineHeight?: number;
  /** 字体系列 */
  fontFamily?: 'sans' | 'serif' | 'display';
  /** 段落间距 */
  paragraphSpacing?: number;
  /** 主题模式 */
  theme?: 'light' | 'dark' | 'sepia';
  /** 自定义类名 */
  className?: string;
  /** 图片点击回调 */
  onImageClick?: (src: string) => void;
}

// ==================== 主题配置 ====================

const themeStyles = {
  light: {
    background: 'bg-white',
    text: 'text-gray-900',
    heading: 'text-gray-900',
    blockquote: 'border-primary/50 text-gray-600',
    code: 'bg-gray-100 text-gray-800',
    hr: 'border-gray-200',
  },
  dark: {
    background: 'bg-gray-900',
    text: 'text-gray-100',
    heading: 'text-gray-100',
    blockquote: 'border-primary/50 text-gray-400',
    code: 'bg-gray-800 text-gray-200',
    hr: 'border-gray-700',
  },
  sepia: {
    background: 'bg-amber-50',
    text: 'text-amber-900',
    heading: 'text-amber-900',
    blockquote: 'border-amber-600/50 text-amber-700',
    code: 'bg-amber-100 text-amber-800',
    hr: 'border-amber-200',
  },
};

// ==================== 字体映射 ====================

const fontFamilyMap = {
  sans: 'font-sans',
  serif: 'font-serif',
  display: 'font-display',
};

// ==================== 配置 marked ====================

// 自定义渲染器
const createRenderer = (onImageClick?: (src: string) => void) => {
  const renderer = new Renderer();

  // 自定义图片渲染
  renderer.image = ({ href, title, text }: Tokens.Image) => {
    const clickHandler = onImageClick ? `onclick="window.__previewImageClick && window.__previewImageClick('${href}')"` : '';
    return `<img src="${href}" alt="${text}" title="${title || ''}" class="max-w-full h-auto rounded-lg my-4 cursor-pointer hover:opacity-90 transition-opacity" ${clickHandler} />`;
  };

  // 自定义段落渲染（添加首行缩进）
  renderer.paragraph = ({ text }: Tokens.Paragraph) => {
    return `<p class="mb-4 text-indent-2">${text}</p>`;
  };

  // 自定义标题渲染
  renderer.heading = ({ text, depth }: Tokens.Heading) => {
    const sizes: Record<number, string> = {
      1: 'text-2xl font-bold mt-10 mb-5',
      2: 'text-xl font-semibold mt-8 mb-4',
      3: 'text-lg font-semibold mt-6 mb-3',
      4: 'text-base font-semibold mt-4 mb-2',
      5: 'text-sm font-semibold mt-3 mb-2',
      6: 'text-sm font-medium mt-2 mb-1',
    };
    return `<h${depth} class="${sizes[depth]}">${text}</h${depth}>`;
  };

  // 自定义引用块渲染
  renderer.blockquote = ({ text }: Tokens.Blockquote) => {
    return `<blockquote class="border-l-4 border-primary/50 pl-4 italic my-4 text-muted-foreground">${text}</blockquote>`;
  };

  // 自定义代码块渲染
  renderer.code = ({ text, lang }: Tokens.Code) => {
    return `<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4"><code class="language-${lang || 'text'}">${text}</code></pre>`;
  };

  // 自定义行内代码渲染
  renderer.codespan = ({ text }: Tokens.Codespan) => {
    return `<code class="bg-muted px-1.5 py-0.5 rounded text-sm">${text}</code>`;
  };

  // 自定义分隔线渲染
  renderer.hr = () => {
    return `<hr class="my-8 border-border" />`;
  };

  // 自定义链接渲染
  renderer.link = ({ href, title, text }: Tokens.Link) => {
    return `<a href="${href}" title="${title || ''}" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
  };

  // 自定义列表渲染
  renderer.list = (token: Tokens.List) => {
    const tag = token.ordered ? 'ol' : 'ul';
    const listClass = token.ordered ? 'list-decimal' : 'list-disc';
    return `<${tag} class="${listClass} pl-6 my-4 space-y-2">${token.raw}</${tag}>`;
  };

  return renderer;
};

// ==================== 主组件 ====================

export function ChapterPreview({
  content,
  title,
  showTitle = true,
  fontSize = 18,
  lineHeight = 1.8,
  fontFamily = 'serif',
  paragraphSpacing = 1.5,
  theme = 'light',
  className = '',
  onImageClick,
}: ChapterPreviewProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // 设置全局图片点击处理
  useMemo(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __previewImageClick?: (src: string) => void }).__previewImageClick = (src: string) => {
        if (onImageClick) {
          onImageClick(src);
        } else {
          setLightboxImage(src);
        }
      };
    }
  }, [onImageClick]);

  // 解析 Markdown 为 HTML
  const htmlContent = useMemo(() => {
    if (!content) return '';

    // 配置 marked
    marked.setOptions({
      renderer: createRenderer(onImageClick || ((src) => setLightboxImage(src))),
      gfm: true,
      breaks: true,
    });

    // 解析 Markdown
    const rawHtml = marked.parse(content) as string;

    // 使用 DOMPurify 清理 HTML（防止 XSS）
    if (typeof window !== 'undefined') {
      return DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['onclick', 'target'],
        ADD_TAGS: ['iframe'],
      });
    }

    return rawHtml;
  }, [content, onImageClick]);

  // 获取主题样式
  const themeStyle = themeStyles[theme];

  return (
    <div className={`chapter-preview ${className}`}>
      {/* 预览容器 */}
      <div
        className={`${themeStyle.background} rounded-xl p-6 sm:p-8 md:p-12 shadow-lg`}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
        }}
      >
        {/* 章节标题 */}
        {showTitle && title && (
          <h1 className={`text-2xl sm:text-3xl font-bold mb-8 text-center ${themeStyle.heading}`}>
            {title}
          </h1>
        )}

        {/* 内容区域 */}
        <article
          className={`${fontFamilyMap[fontFamily]} ${themeStyle.text} prose prose-lg dark:prose-invert max-w-none`}
          style={{
            '--paragraph-spacing': `${paragraphSpacing}em`,
          } as React.CSSProperties}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      {/* 简易 Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="预览图片"
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
            onClick={() => setLightboxImage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* 自定义样式 */}
      <style jsx global>{`
        .chapter-preview .text-indent-2 {
          text-indent: 2em;
        }
        
        .chapter-preview p + p {
          margin-top: var(--paragraph-spacing, 1.5em);
        }
        
        .chapter-preview img {
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        
        .chapter-preview blockquote p {
          text-indent: 0;
        }
        
        .chapter-preview pre {
          font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
          font-size: 0.875em;
        }
        
        .chapter-preview h1,
        .chapter-preview h2,
        .chapter-preview h3 {
          text-indent: 0;
        }
        
        /* 角色标签样式 */
        .chapter-preview strong {
          color: var(--primary);
        }
        
        /* 章节分隔符样式 */
        .chapter-preview hr {
          border: none;
          height: 1px;
          background: linear-gradient(
            to right,
            transparent,
            var(--border) 20%,
            var(--border) 80%,
            transparent
          );
        }
      `}</style>
    </div>
  );
}

export default ChapterPreview;
