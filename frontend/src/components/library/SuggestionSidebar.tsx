'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Edit3,
  ArrowUpFromLine,
  ArrowDownFromLine,
  ImagePlus,
  Send,
  Loader2,
  Upload,
  Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type {
  SuggestionSidebarProps,
  SuggestionType,
  CreateSuggestionDto,
} from '@/types/library';
import { SUGGESTION_TYPE_NAMES } from '@/types/library';

/**
 * 建议类型配置
 */
const SUGGESTION_TYPE_CONFIG: {
  type: SuggestionType;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  requiresContent: boolean;
  requiresImage: boolean;
}[] = [
  {
    type: 'MODIFY',
    icon: Edit3,
    description: '修改当前段落的内容',
    requiresContent: true,
    requiresImage: false,
  },
  {
    type: 'INSERT_BEFORE',
    icon: ArrowUpFromLine,
    description: '在当前段落前插入新段落',
    requiresContent: true,
    requiresImage: false,
  },
  {
    type: 'INSERT_AFTER',
    icon: ArrowDownFromLine,
    description: '在当前段落后插入新段落',
    requiresContent: true,
    requiresImage: false,
  },
  {
    type: 'ADD_IMAGE',
    icon: ImagePlus,
    description: '为当前段落添加插图',
    requiresContent: false,
    requiresImage: true,
  },
];


/**
 * 修订建议侧边栏组件
 *
 * 需求5.1: 显示侧边栏编辑界面
 * 需求5.2: 在侧边栏上方显示选中的原文段落
 * 需求5.3: 支持在选中段落前后添加新段落
 * 需求5.4: 支持修改选中段落的内容
 * 需求5.5: 支持在段落中插入插图（富文本编辑）
 *
 * 功能:
 * - 显示选中的原文段落
 * - 支持四种建议类型的选择
 * - 提供富文本编辑区域
 * - 支持图片上传（ADD_IMAGE 类型）
 * - 提交建议到后端
 */
export function SuggestionSidebar({
  paragraph,
  branchId,
  onClose,
  onSubmit,
}: SuggestionSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 状态
  const [selectedType, setSelectedType] = useState<SuggestionType>('MODIFY');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取当前类型配置
  const currentConfig = SUGGESTION_TYPE_CONFIG.find((c) => c.type === selectedType)!;

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // ESC 键关闭
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 自动调整 textarea 高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    }
  }, [content]);

  // 切换类型时重置内容
  const handleTypeChange = useCallback((type: SuggestionType) => {
    setSelectedType(type);
    setError(null);
    // 如果切换到 MODIFY，预填充原文
    if (type === 'MODIFY') {
      setContent(paragraph.content);
    } else if (type !== 'ADD_IMAGE') {
      setContent('');
    }
    // 如果切换到非图片类型，清除图片
    if (type !== 'ADD_IMAGE') {
      setImageUrl(null);
      setImagePreview(null);
    }
  }, [paragraph.content]);

  // 处理图片选择
  const handleImageSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 验证文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // 上传图片
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/creator/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('图片上传失败');
      }

      const data = await response.json();
      setImageUrl(data.data?.url || data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败');
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 清除图片
  const handleClearImage = useCallback(() => {
    setImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // 提交建议
  const handleSubmit = useCallback(async () => {
    // 验证
    if (currentConfig.requiresContent && !content.trim()) {
      setError('请输入建议内容');
      return;
    }
    if (currentConfig.requiresImage && !imageUrl) {
      setError('请上传图片');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const suggestion: CreateSuggestionDto = {
        branchId,
        suggestionType: selectedType,
        ...(currentConfig.requiresContent && { suggestedContent: content.trim() }),
        ...(currentConfig.requiresImage && imageUrl && { imageUrl }),
      };

      await onSubmit(suggestion);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [branchId, content, currentConfig, imageUrl, onClose, onSubmit, selectedType]);


  return (
    <motion.div
      ref={sidebarRef}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed bottom-0 right-0 top-0 z-50 w-96',
        'bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg',
        'border-l border-gray-200 dark:border-gray-700 shadow-xl',
        'flex flex-col'
      )}
      data-interactive
    >
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            提交修订建议
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="关闭"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 原文段落展示 - 需求5.2 */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            原文段落
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            #{paragraph.anchorId}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-4">
          {paragraph.content}
        </p>
      </div>

      {/* 建议类型选择 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          建议类型
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTION_TYPE_CONFIG.map((config) => {
            const Icon = config.icon;
            const isSelected = selectedType === config.type;
            return (
              <button
                key={config.type}
                onClick={() => handleTypeChange(config.type)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium',
                  'border transition-all duration-200',
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <Icon className={cn('h-4 w-4', isSelected && 'text-indigo-500')} />
                <span>{SUGGESTION_TYPE_NAMES[config.type]}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {currentConfig.description}
        </p>
      </div>

      {/* 内容编辑区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 文本编辑 - 需求5.3, 5.4 */}
        {currentConfig.requiresContent && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {selectedType === 'MODIFY' ? '修改后的内容' : '新段落内容'}
            </label>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                selectedType === 'MODIFY'
                  ? '输入修改后的段落内容...'
                  : '输入要插入的新段落内容...'
              }
              className={cn(
                'w-full min-h-[120px] px-3 py-2.5 rounded-xl',
                'bg-white dark:bg-gray-800',
                'border border-gray-200 dark:border-gray-700',
                'text-gray-900 dark:text-white text-sm leading-relaxed',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500',
                'resize-none transition-colors'
              )}
            />
            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 text-right">
              {content.length} 字
            </div>
          </div>
        )}

        {/* 图片上传 - 需求5.5 */}
        {currentConfig.requiresImage && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              上传插图
            </label>
            
            {/* 隐藏的文件输入 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* 图片预览或上传按钮 */}
            <AnimatePresence mode="wait">
              {imagePreview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
                >
                  <img
                    src={imagePreview}
                    alt="预览"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <button
                    onClick={handleClearImage}
                    className={cn(
                      'absolute bottom-3 right-3',
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                      'bg-red-500/90 text-white text-sm font-medium',
                      'hover:bg-red-600 transition-colors'
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.button
                  key="upload"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={cn(
                    'w-full h-48 rounded-xl',
                    'border-2 border-dashed border-gray-300 dark:border-gray-600',
                    'flex flex-col items-center justify-center gap-3',
                    'text-gray-500 dark:text-gray-400',
                    'hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-500',
                    'transition-colors cursor-pointer',
                    isUploading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8" />
                  )}
                  <span className="text-sm font-medium">
                    {isUploading ? '上传中...' : '点击上传图片'}
                  </span>
                  <span className="text-xs text-gray-400">
                    支持 JPG、PNG、GIF、WebP，最大 5MB
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部操作栏 */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-700 dark:text-gray-300 font-medium',
              'hover:bg-gray-50 dark:hover:bg-gray-800',
              'transition-colors'
            )}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
              'bg-gradient-to-r from-indigo-500 to-purple-500',
              'text-white font-medium',
              'hover:from-indigo-600 hover:to-purple-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                提交建议
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default SuggestionSidebar;
