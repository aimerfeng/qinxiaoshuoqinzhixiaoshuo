'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';

// ==================== 类型定义 ====================

export type EditorMode = 'wysiwyg' | 'ir' | 'sv';

export interface VditorEditorProps {
  /** 初始内容（Markdown 格式） */
  initialValue?: string;
  /** 编辑模式：wysiwyg（所见即所得）、ir（即时渲染）、sv（分屏预览） */
  mode?: EditorMode;
  /** 编辑器高度 */
  height?: number | string;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否启用暗色模式 */
  darkMode?: boolean;
  /** 内容变化回调 */
  onChange?: (value: string) => void;
  /** 自动保存回调（防抖后触发） */
  onAutoSave?: (value: string) => void;
  /** 自动保存延迟（毫秒），默认 3000 */
  autoSaveDelay?: number;
  /** 图片上传 URL */
  uploadUrl?: string;
  /** 是否只读 */
  readonly?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 编辑器初始化完成回调 */
  onReady?: (vditor: Vditor) => void;
  /** 模式切换回调 */
  onModeChange?: (mode: EditorMode) => void;
  /** 章节分隔符插入回调 */
  onInsertChapterSeparator?: () => void;
  /** 角色标签插入回调 */
  onInsertCharacterTag?: (characterName: string) => void;
  /** 插图上传回调 */
  onUploadIllustration?: (file: File) => Promise<string>;
}

export interface VditorEditorRef {
  /** 获取 Markdown 内容 */
  getValue: () => string;
  /** 设置 Markdown 内容 */
  setValue: (value: string) => void;
  /** 获取 HTML 内容 */
  getHTML: () => string;
  /** 聚焦编辑器 */
  focus: () => void;
  /** 失焦编辑器 */
  blur: () => void;
  /** 清空内容 */
  clear: () => void;
  /** 插入文本 */
  insertValue: (value: string) => void;
  /** 获取当前模式 */
  getMode: () => EditorMode;
  /** 切换模式 */
  setMode: (mode: EditorMode) => void;
  /** 获取 Vditor 实例 */
  getInstance: () => Vditor | null;
  /** 获取字数统计 */
  getWordCount: () => { characters: number; words: number; paragraphs: number };
}

// ==================== 编辑器状态接口 ====================

export interface EditorState {
  content: string;
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  lastSaved: Date | null;
  isDirty: boolean;
  isOffline: boolean;
  syncStatus: 'synced' | 'syncing' | 'pending' | 'conflict';
  currentMode: EditorMode;
}

// ==================== 模式标签 ====================

const modeLabels: Record<EditorMode, string> = {
  wysiwyg: '所见即所得',
  ir: '即时渲染',
  sv: '分屏预览',
};

// ==================== 自定义工具栏图标 ====================

const customIcons = {
  chapterSeparator: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
  </svg>`,
  characterTag: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>`,
  illustration: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
  </svg>`,
};

// ==================== 主组件 ====================

const VditorEditor = forwardRef<VditorEditorRef, VditorEditorProps>(
  (
    {
      initialValue = '',
      mode = 'wysiwyg',
      height = 500,
      placeholder = '开始创作你的故事...',
      darkMode = false,
      onChange,
      onAutoSave,
      autoSaveDelay = 3000,
      uploadUrl = '/api/v1/creator/upload/image',
      readonly = false,
      className = '',
      onReady,
      onModeChange,
      onInsertChapterSeparator,
      onInsertCharacterTag,
      onUploadIllustration,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const vditorRef = useRef<Vditor | null>(null);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [currentMode, setCurrentMode] = useState<EditorMode>(mode);
    const [isReady, setIsReady] = useState(false);
    const [wordStats, setWordStats] = useState({ characters: 0, words: 0, paragraphs: 0 });

    // ==================== 字数统计 ====================

    const calculateWordStats = useCallback((content: string) => {
      const text = content.replace(/[#*`\[\]()>-]/g, '').trim();
      const characters = text.length;
      // 中文按字符计数，英文按空格分词
      const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      const englishWords = text.replace(/[\u4e00-\u9fa5]/g, ' ').split(/\s+/).filter(Boolean).length;
      const words = chineseChars + englishWords;
      const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim()).length || 1;
      return { characters, words, paragraphs };
    }, []);

    // ==================== 自动保存防抖 ====================

    const triggerAutoSave = useCallback((value: string) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        onAutoSave?.(value);
      }, autoSaveDelay);
    }, [onAutoSave, autoSaveDelay]);

    // ==================== 自定义工具栏按钮 ====================

    const createCustomToolbar = useCallback(() => {
      const customButtons: IMenuItem[] = [];

      // 章节分隔符按钮
      customButtons.push({
        name: 'chapter-separator',
        tip: '插入章节分隔符',
        icon: customIcons.chapterSeparator,
        click: () => {
          if (vditorRef.current) {
            const separator = '\n\n---\n\n## 第X章 章节标题\n\n';
            vditorRef.current.insertValue(separator);
            onInsertChapterSeparator?.();
          }
        },
      });

      // 角色标签按钮
      customButtons.push({
        name: 'character-tag',
        tip: '插入角色标签',
        icon: customIcons.characterTag,
        click: () => {
          if (vditorRef.current) {
            const characterName = prompt('请输入角色名称：');
            if (characterName) {
              const tag = `**【${characterName}】**`;
              vditorRef.current.insertValue(tag);
              onInsertCharacterTag?.(characterName);
            }
          }
        },
      });

      // 插图上传按钮
      customButtons.push({
        name: 'illustration-upload',
        tip: '上传插图',
        icon: customIcons.illustration,
        click: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && vditorRef.current) {
              try {
                let imageUrl: string;
                if (onUploadIllustration) {
                  imageUrl = await onUploadIllustration(file);
                } else {
                  // 默认上传逻辑
                  const formData = new FormData();
                  formData.append('file', file);
                  const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData,
                  });
                  const data = await response.json();
                  imageUrl = data.url;
                }
                const markdown = `\n\n![插图](${imageUrl})\n\n`;
                vditorRef.current.insertValue(markdown);
              } catch (error) {
                console.error('插图上传失败:', error);
                alert('插图上传失败，请重试');
              }
            }
          };
          input.click();
        },
      });

      return customButtons;
    }, [uploadUrl, onInsertChapterSeparator, onInsertCharacterTag, onUploadIllustration]);

    // ==================== 初始化编辑器 ====================

    useEffect(() => {
      if (!containerRef.current) return;

      const customToolbar = createCustomToolbar();

      const vditor = new Vditor(containerRef.current, {
        value: initialValue,
        mode: mode,
        height: typeof height === 'number' ? height : undefined,
        minHeight: 300,
        placeholder: placeholder,
        theme: darkMode ? 'dark' : 'classic',
        icon: 'material',
        lang: 'zh_CN',
        
        // 工具栏配置
        toolbar: [
          'emoji',
          'headings',
          'bold',
          'italic',
          'strike',
          'link',
          '|',
          'list',
          'ordered-list',
          'check',
          'outdent',
          'indent',
          '|',
          'quote',
          'line',
          'code',
          'inline-code',
          'table',
          '|',
          ...customToolbar,
          '|',
          'upload',
          '|',
          'undo',
          'redo',
          '|',
          'edit-mode',
          'fullscreen',
          'outline',
          'preview',
          '|',
          {
            name: 'word-count',
            tip: '字数统计',
            icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z"/></svg>',
            click: () => {
              const stats = wordStats;
              alert(`字符数: ${stats.characters}\n词数: ${stats.words}\n段落数: ${stats.paragraphs}`);
            },
          },
        ],

        // 缓存配置
        cache: {
          enable: false, // 使用自定义的 IndexedDB 缓存
        },

        // 预览配置
        preview: {
          markdown: {
            toc: true,
            mark: true,
            footnotes: true,
            autoSpace: true,
          },
          hljs: {
            enable: true,
            style: darkMode ? 'dracula' : 'github',
            lineNumber: true,
          },
        },

        // 计数器配置
        counter: {
          enable: true,
          type: 'text',
        },

        // 大纲配置
        outline: {
          enable: true,
          position: 'right',
        },

        // 上传配置
        upload: {
          url: uploadUrl,
          max: 5 * 1024 * 1024, // 5MB
          accept: 'image/*',
          fieldName: 'file',
          format: (files: File[], responseText: string) => {
            try {
              const response = JSON.parse(responseText);
              return JSON.stringify({
                msg: '',
                code: 0,
                data: {
                  errFiles: [],
                  succMap: {
                    [files[0].name]: response.url,
                  },
                },
              });
            } catch {
              return responseText;
            }
          },
        },

        // 事件回调
        after: () => {
          vditorRef.current = vditor;
          setIsReady(true);
          onReady?.(vditor);
          
          // 初始化字数统计
          const content = vditor.getValue();
          setWordStats(calculateWordStats(content));
        },

        input: (value: string) => {
          onChange?.(value);
          triggerAutoSave(value);
          setWordStats(calculateWordStats(value));
        },

        blur: (value: string) => {
          // 失焦时立即保存
          if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
          }
          onAutoSave?.(value);
        },
      });

      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
        vditor.destroy();
        vditorRef.current = null;
      };
    }, []); // 只在挂载时初始化一次

    // ==================== 响应 props 变化 ====================

    // 响应暗色模式变化
    useEffect(() => {
      if (vditorRef.current && isReady) {
        vditorRef.current.setTheme(darkMode ? 'dark' : 'classic');
      }
    }, [darkMode, isReady]);

    // 响应只读模式变化
    useEffect(() => {
      if (vditorRef.current && isReady) {
        if (readonly) {
          vditorRef.current.disabled();
        } else {
          vditorRef.current.enable();
        }
      }
    }, [readonly, isReady]);

    // ==================== 暴露方法给父组件 ====================

    useImperativeHandle(ref, () => ({
      getValue: () => vditorRef.current?.getValue() || '',
      setValue: (value: string) => vditorRef.current?.setValue(value),
      getHTML: () => vditorRef.current?.getHTML() || '',
      focus: () => vditorRef.current?.focus(),
      blur: () => vditorRef.current?.blur(),
      clear: () => vditorRef.current?.setValue(''),
      insertValue: (value: string) => vditorRef.current?.insertValue(value),
      getMode: () => currentMode,
      setMode: (newMode: EditorMode) => {
        if (vditorRef.current) {
          // Vditor 不支持运行时切换模式，需要重新初始化
          // 这里只更新状态，实际切换需要重新渲染组件
          setCurrentMode(newMode);
          onModeChange?.(newMode);
        }
      },
      getInstance: () => vditorRef.current,
      getWordCount: () => wordStats,
    }), [currentMode, wordStats, onModeChange]);

    // ==================== 渲染 ====================

    return (
      <div className={`vditor-editor-wrapper ${className}`}>
        {/* 模式切换标签 */}
        <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
          <span>当前模式：</span>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-xs font-medium">
            {modeLabels[currentMode]}
          </span>
          <span className="ml-auto text-xs">
            {wordStats.characters} 字符 | {wordStats.words} 词 | {wordStats.paragraphs} 段落
          </span>
        </div>
        
        {/* 编辑器容器 */}
        <div 
          ref={containerRef} 
          className="vditor-container rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
          style={{ height: typeof height === 'string' ? height : undefined }}
        />

        {/* 自定义样式 */}
        <style jsx global>{`
          .vditor-editor-wrapper {
            --vditor-primary: #6366f1;
            --vditor-primary-light: #8b5cf6;
          }
          
          .vditor-container .vditor-toolbar {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-bottom: 1px solid #e2e8f0;
          }
          
          .vditor-container .vditor-toolbar button:hover {
            background-color: rgba(99, 102, 241, 0.1);
          }
          
          .vditor-container .vditor-toolbar button.vditor-menu--current {
            background-color: rgba(99, 102, 241, 0.2);
            color: #6366f1;
          }
          
          .vditor-container .vditor-content {
            font-family: 'Source Han Serif SC', 'Noto Serif SC', serif;
          }
          
          .vditor-container .vditor-ir .vditor-ir__marker,
          .vditor-container .vditor-wysiwyg .vditor-wysiwyg__marker {
            color: #6366f1;
          }
          
          .vditor-container .vditor-outline {
            border-left: 1px solid #e2e8f0;
          }
          
          .vditor-container .vditor-outline__item:hover {
            background-color: rgba(99, 102, 241, 0.1);
          }
          
          /* 暗色模式 */
          .dark .vditor-container .vditor-toolbar {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            border-bottom: 1px solid #374151;
          }
          
          .dark .vditor-container .vditor-content {
            background-color: #1f2937;
            color: #f3f4f6;
          }
          
          .dark .vditor-container .vditor-outline {
            background-color: #111827;
            border-left: 1px solid #374151;
          }
        `}</style>
      </div>
    );
  }
);

VditorEditor.displayName = 'VditorEditor';

// ==================== 类型声明 ====================

interface IMenuItem {
  name: string;
  tip?: string;
  icon?: string;
  click?: () => void;
}

export default VditorEditor;
