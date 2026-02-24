'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  GitBranch,
  FileText,
  Palette,
  BookOpen,
  Upload,
  Trash2,
  Loader2,
  ChevronDown,
  Calculator,
  ArrowLeft,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type {
  BranchCreatorProps,
  BranchType,
  DerivativeType,
  CreateBranchDto,
  LibraryDetail,
} from '@/types/library';
import {
  BRANCH_TYPE_NAMES,
  DERIVATIVE_TYPE_NAMES,
} from '@/types/library';
import { libraryService } from '@/services/library.service';

/**
 * 分支类型配置
 */
const BRANCH_TYPE_CONFIG: {
  type: BranchType;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  requiresFee: boolean;
}[] = [
  {
    type: 'MAIN',
    icon: FileText,
    description: '原创内容或续写，无需支付上传费用',
    requiresFee: false,
  },
  {
    type: 'DERIVATIVE',
    icon: Palette,
    description: '同人、IF线、改编等衍生内容，需支付上传费用',
    requiresFee: true,
  },
  {
    type: 'MANGA',
    icon: BookOpen,
    description: '漫画改编版本，按页数计费',
    requiresFee: true,
  },
];

/**
 * 改写子类型配置
 */
const DERIVATIVE_TYPE_CONFIG: {
  type: DerivativeType;
  description: string;
}[] = [
  { type: 'FANFIC', description: '基于原作的同人创作' },
  { type: 'IF_LINE', description: '假设性的剧情分支' },
  { type: 'ADAPTATION', description: '改编或重新演绎' },
];

/**
 * 阅读方向配置
 */
const READING_DIRECTION_CONFIG = [
  { value: 'LTR' as const, label: '从左到右', icon: ArrowRight },
  { value: 'RTL' as const, label: '从右到左', icon: ArrowLeft },
];

/**
 * 计算上传费用
 * 需求3.2, 3.3, 4.2
 */
function calculateUploadFee(
  uploadFeeType: 'PER_THOUSAND_WORDS' | 'PER_PAGE',
  uploadFeeRate: number,
  wordCount: number,
  pageCount: number
): { total: number; ownerAmount: number; platformAmount: number } {
  let total = 0;
  if (uploadFeeType === 'PER_THOUSAND_WORDS') {
    total = Math.ceil(wordCount / 1000) * uploadFeeRate;
  } else {
    total = pageCount * uploadFeeRate;
  }
  const ownerAmount = Math.floor(total * 0.7);
  const platformAmount = total - ownerAmount;
  return { total, ownerAmount, platformAmount };
}

/**
 * 格式化金额（分转元）
 */
function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}


/**
 * 分支创建器组件
 *
 * 需求2.1: 创建正文分支，记录分支点和分支创作者
 * 需求3.1: 创建改写分支，要求选择分支类型
 * 需求3.2: 根据库拥有者设置的费率计算并收取上传费用
 * 需求4.1: 创建漫画分支，要求上传漫画页面图片
 * 需求4.2: 漫画分支按页数计费
 *
 * 功能:
 * - 选择分支类型（MAIN/DERIVATIVE/MANGA）
 * - 改写分支需选择子类型（FANFIC/IF_LINE/ADAPTATION）
 * - 显示上传费用预估
 * - 漫画分支支持图片上传和阅读方向设置
 * - 输入标题、描述、封面图
 * - 提交创建分支
 */
export function BranchCreator({
  libraryId,
  forkPoint,
  onSuccess,
  onCancel,
}: BranchCreatorProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // 库信息
  const [library, setLibrary] = useState<LibraryDetail | null>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  // 表单状态
  const [branchType, setBranchType] = useState<BranchType>('MAIN');
  const [derivativeType, setDerivativeType] = useState<DerivativeType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [readingDirection, setReadingDirection] = useState<'LTR' | 'RTL'>('LTR');
  const [wordCount, setWordCount] = useState(0);

  // 漫画页面
  const [mangaPages, setMangaPages] = useState<{ url: string; preview: string }[]>([]);

  // UI 状态
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingPages, setIsUploadingPages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDerivativeDropdown, setShowDerivativeDropdown] = useState(false);

  // 获取库信息
  useEffect(() => {
    async function fetchLibrary() {
      try {
        const data = await libraryService.getLibraryById(libraryId);
        setLibrary(data);
      } catch (err) {
        setError('获取小说库信息失败');
      } finally {
        setLoadingLibrary(false);
      }
    }
    fetchLibrary();
  }, [libraryId]);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  // ESC 键关闭
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // 获取当前分支类型配置
  const currentConfig = BRANCH_TYPE_CONFIG.find((c) => c.type === branchType)!;

  // 计算上传费用
  const uploadFee = useMemo(() => {
    if (!library || !currentConfig.requiresFee) {
      return null;
    }
    return calculateUploadFee(
      library.settings.uploadFeeType,
      library.settings.uploadFeeRate,
      wordCount,
      mangaPages.length
    );
  }, [library, currentConfig.requiresFee, wordCount, mangaPages.length]);

  // 切换分支类型
  const handleBranchTypeChange = useCallback((type: BranchType) => {
    setBranchType(type);
    setError(null);
    if (type !== 'DERIVATIVE') {
      setDerivativeType(null);
    }
    if (type !== 'MANGA') {
      setMangaPages([]);
    }
  }, []);

  // 处理封面上传
  const handleCoverSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }

    setError(null);
    setIsUploadingCover(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/creator/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('封面上传失败');
      }

      const data = await response.json();
      setCoverImage(data.data?.url || data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '封面上传失败');
      setCoverPreview(null);
    } finally {
      setIsUploadingCover(false);
    }
  }, []);

  // 清除封面
  const handleClearCover = useCallback(() => {
    setCoverImage(null);
    setCoverPreview(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  }, []);

  // 处理漫画页面上传
  const handlePagesSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter((file) => {
      if (!file.type.startsWith('image/')) return false;
      if (file.size > 10 * 1024 * 1024) return false;
      return true;
    });

    if (validFiles.length === 0) {
      setError('请选择有效的图片文件（最大 10MB）');
      return;
    }

    setError(null);
    setIsUploadingPages(true);

    try {
      const uploadedPages: { url: string; preview: string }[] = [];

      for (const file of validFiles) {
        // 创建预览
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        // 上传图片
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/v1/creator/upload/image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`上传失败: ${file.name}`);
        }

        const data = await response.json();
        uploadedPages.push({
          url: data.data?.url || data.url,
          preview,
        });
      }

      setMangaPages((prev) => [...prev, ...uploadedPages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败');
    } finally {
      setIsUploadingPages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  // 删除漫画页面
  const handleRemovePage = useCallback((index: number) => {
    setMangaPages((prev) => prev.filter((_, i) => i !== index));
  }, []);


  // 提交创建分支
  const handleSubmit = useCallback(async () => {
    // 验证
    if (!title.trim()) {
      setError('请输入分支标题');
      return;
    }

    if (branchType === 'DERIVATIVE' && !derivativeType) {
      setError('请选择改写类型');
      return;
    }

    if (branchType === 'MANGA' && mangaPages.length === 0) {
      setError('请上传至少一张漫画页面');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const dto: CreateBranchDto = {
        branchType,
        title: title.trim(),
        ...(description.trim() && { description: description.trim() }),
        ...(coverImage && { coverImage }),
        ...(forkPoint?.chapterId && { forkFromChapterId: forkPoint.chapterId }),
        ...(forkPoint?.paragraphId && { forkFromParagraphId: forkPoint.paragraphId }),
        ...(branchType === 'DERIVATIVE' && derivativeType && { derivativeType }),
        ...(branchType === 'MANGA' && {
          readingDirection,
          pageCount: mangaPages.length,
          pageUrls: mangaPages.map((p) => p.url),
        }),
        ...(branchType !== 'MANGA' && wordCount > 0 && { wordCount }),
      };

      const response = await libraryService.createBranch(libraryId, dto);
      onSuccess(response.branch);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建分支失败');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    branchType,
    coverImage,
    derivativeType,
    description,
    forkPoint,
    libraryId,
    mangaPages,
    onSuccess,
    readingDirection,
    title,
    wordCount,
  ]);

  // 加载中状态
  if (loadingLibrary) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-gray-900 px-6 py-4 shadow-xl">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          <span className="text-gray-700 dark:text-gray-300">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'w-full max-w-2xl max-h-[90vh] overflow-hidden',
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg',
          'rounded-2xl shadow-2xl',
          'border border-gray-200 dark:border-gray-700',
          'flex flex-col'
        )}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              创建新分支
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 分支类型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              分支类型
            </label>
            <div className="grid grid-cols-3 gap-3">
              {BRANCH_TYPE_CONFIG.map((config) => {
                const Icon = config.icon;
                const isSelected = branchType === config.type;
                return (
                  <button
                    key={config.type}
                    onClick={() => handleBranchTypeChange(config.type)}
                    className={cn(
                      'flex flex-col items-center gap-2 px-4 py-4 rounded-xl',
                      'border-2 transition-all duration-200',
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-500'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-6 w-6',
                        isSelected
                          ? 'text-indigo-500'
                          : 'text-gray-400 dark:text-gray-500'
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isSelected
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-gray-600 dark:text-gray-400'
                      )}
                    >
                      {BRANCH_TYPE_NAMES[config.type]}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {currentConfig.description}
            </p>
          </div>

          {/* 改写子类型选择 - 需求3.1 */}
          {branchType === 'DERIVATIVE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                改写类型 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowDerivativeDropdown(!showDerivativeDropdown)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl',
                    'border border-gray-200 dark:border-gray-700',
                    'bg-white dark:bg-gray-800',
                    'text-left transition-colors',
                    'hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      derivativeType
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-500'
                    )}
                  >
                    {derivativeType
                      ? DERIVATIVE_TYPE_NAMES[derivativeType]
                      : '请选择改写类型'}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-gray-400 transition-transform',
                      showDerivativeDropdown && 'rotate-180'
                    )}
                  />
                </button>
                <AnimatePresence>
                  {showDerivativeDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        'absolute z-10 w-full mt-2',
                        'bg-white dark:bg-gray-800',
                        'border border-gray-200 dark:border-gray-700',
                        'rounded-xl shadow-lg overflow-hidden'
                      )}
                    >
                      {DERIVATIVE_TYPE_CONFIG.map((config) => (
                        <button
                          key={config.type}
                          onClick={() => {
                            setDerivativeType(config.type);
                            setShowDerivativeDropdown(false);
                          }}
                          className={cn(
                            'w-full px-4 py-3 text-left',
                            'hover:bg-gray-50 dark:hover:bg-gray-700',
                            'transition-colors',
                            derivativeType === config.type &&
                              'bg-indigo-50 dark:bg-indigo-900/30'
                          )}
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {DERIVATIVE_TYPE_NAMES[config.type]}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {config.description}
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* 标题输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              分支标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入分支标题..."
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'border border-gray-200 dark:border-gray-700',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500',
                'transition-colors'
              )}
            />
          </div>

          {/* 描述输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              分支描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入分支描述（可选）..."
              rows={3}
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'border border-gray-200 dark:border-gray-700',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500',
                'resize-none transition-colors'
              )}
            />
          </div>

          {/* 封面图上传 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              封面图片
            </label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleCoverSelect}
              className="hidden"
            />
            {coverPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <img
                  src={coverPreview}
                  alt="封面预览"
                  className="w-full h-40 object-cover"
                />
                <button
                  onClick={handleClearCover}
                  className={cn(
                    'absolute top-2 right-2',
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                    'bg-red-500/90 text-white text-sm font-medium',
                    'hover:bg-red-600 transition-colors'
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
                {isUploadingCover && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className={cn(
                  'w-full h-32 rounded-xl',
                  'border-2 border-dashed border-gray-300 dark:border-gray-600',
                  'flex flex-col items-center justify-center gap-2',
                  'text-gray-500 dark:text-gray-400',
                  'hover:border-indigo-400 hover:text-indigo-500',
                  'transition-colors cursor-pointer',
                  isUploadingCover && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isUploadingCover ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
                <span className="text-sm">点击上传封面图片</span>
              </button>
            )}
          </div>


          {/* 漫画分支特有设置 - 需求4.1 */}
          {branchType === 'MANGA' && (
            <>
              {/* 阅读方向设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  阅读方向
                </label>
                <div className="flex gap-3">
                  {READING_DIRECTION_CONFIG.map((config) => {
                    const Icon = config.icon;
                    const isSelected = readingDirection === config.value;
                    return (
                      <button
                        key={config.value}
                        onClick={() => setReadingDirection(config.value)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
                          'border-2 transition-all duration-200',
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-500'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5',
                            isSelected
                              ? 'text-indigo-500'
                              : 'text-gray-400'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isSelected
                              ? 'text-indigo-700 dark:text-indigo-300'
                              : 'text-gray-600 dark:text-gray-400'
                          )}
                        >
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 漫画页面上传 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  漫画页面 <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs text-gray-400">
                    ({mangaPages.length} 页)
                  </span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handlePagesSelect}
                  className="hidden"
                />
                <div className="grid grid-cols-4 gap-3">
                  {/* 已上传的页面 */}
                  {mangaPages.map((page, index) => (
                    <div
                      key={index}
                      className="relative aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group"
                    >
                      <img
                        src={page.preview}
                        alt={`第 ${index + 1} 页`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => handleRemovePage(index)}
                          className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                  {/* 添加按钮 */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPages}
                    className={cn(
                      'aspect-[3/4] rounded-lg',
                      'border-2 border-dashed border-gray-300 dark:border-gray-600',
                      'flex flex-col items-center justify-center gap-2',
                      'text-gray-400 dark:text-gray-500',
                      'hover:border-indigo-400 hover:text-indigo-500',
                      'transition-colors cursor-pointer',
                      isUploadingPages && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {isUploadingPages ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-6 w-6" />
                        <span className="text-xs">添加页面</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  支持 JPG、PNG、GIF、WebP，单张最大 10MB，可多选
                </p>
              </div>
            </>
          )}

          {/* 字数输入（非漫画分支） */}
          {branchType !== 'MANGA' && currentConfig.requiresFee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                预计字数
              </label>
              <input
                type="number"
                value={wordCount || ''}
                onChange={(e) => setWordCount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="输入预计字数以计算费用..."
                min={0}
                className={cn(
                  'w-full px-4 py-3 rounded-xl',
                  'border border-gray-200 dark:border-gray-700',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-white',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500',
                  'transition-colors'
                )}
              />
            </div>
          )}

          {/* 上传费用预估 - 需求3.2, 4.2 */}
          {uploadFee && uploadFee.total > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-800 dark:text-amber-300">
                  上传费用预估
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>
                    {library?.settings.uploadFeeType === 'PER_THOUSAND_WORDS'
                      ? `${Math.ceil(wordCount / 1000)} 千字 × ¥${formatAmount(library.settings.uploadFeeRate)}/千字`
                      : `${mangaPages.length} 页 × ¥${formatAmount(library?.settings.uploadFeeRate || 0)}/页`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>库拥有者收入 (70%)</span>
                  <span>¥{formatAmount(uploadFee.ownerAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>平台收入 (30%)</span>
                  <span>¥{formatAmount(uploadFee.platformAmount)}</span>
                </div>
                <div className="pt-2 border-t border-amber-200 dark:border-amber-700 flex justify-between font-semibold text-amber-800 dark:text-amber-300">
                  <span>总计</span>
                  <span>¥{formatAmount(uploadFee.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
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
              onClick={onCancel}
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
              disabled={isSubmitting || isUploadingCover || isUploadingPages}
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
                  创建中...
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4" />
                  创建分支
                  {uploadFee && uploadFee.total > 0 && (
                    <span className="ml-1 text-xs opacity-80">
                      (¥{formatAmount(uploadFee.total)})
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default BranchCreator;
