'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { Settings, Percent, FileText, Image, Save, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { RevenueSettingsProps, UpdateLibrarySettingsDto, UploadFeeType } from '@/types/library';

/**
 * 上传费用类型选项
 */
const UPLOAD_FEE_TYPE_OPTIONS: { value: UploadFeeType; label: string; icon: typeof FileText; description: string }[] = [
  {
    value: 'PER_THOUSAND_WORDS',
    label: '按千字计费',
    icon: FileText,
    description: '适用于文字分支，按内容字数收费',
  },
  {
    value: 'PER_PAGE',
    label: '按页数计费',
    icon: Image,
    description: '适用于漫画分支，按漫画页数收费',
  },
];

/**
 * 平台固定抽成比例
 */
const PLATFORM_CUT_PERCENT = 30;

/**
 * 库拥有者最大抽成比例
 */
const MAX_OWNER_CUT_PERCENT = 30;

/**
 * 收益分配预览组件
 */
function RevenuePreview({ ownerCutPercent }: { ownerCutPercent: number }) {
  const creatorPercent = 70 - ownerCutPercent;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Info className="w-4 h-4 text-indigo-500" />
        <span>收益分配预览</span>
      </div>
      
      {/* 分配条 */}
      <div className="h-4 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${PLATFORM_CUT_PERCENT}%` }}
          transition={{ duration: 0.3 }}
          className="bg-gray-400 dark:bg-gray-600"
          title={`平台: ${PLATFORM_CUT_PERCENT}%`}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${ownerCutPercent}%` }}
          transition={{ duration: 0.3 }}
          className="bg-indigo-500"
          title={`库拥有者: ${ownerCutPercent}%`}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${creatorPercent}%` }}
          transition={{ duration: 0.3 }}
          className="bg-emerald-500"
          title={`分支创作者: ${creatorPercent}%`}
        />
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gray-400 dark:bg-gray-600" />
          <span className="text-gray-600 dark:text-gray-400">平台 {PLATFORM_CUT_PERCENT}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-indigo-500" />
          <span className="text-gray-600 dark:text-gray-400">库拥有者 {ownerCutPercent}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-gray-600 dark:text-gray-400">分支创作者 {creatorPercent}%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 收益设置组件
 *
 * 需求1.2: 允许设置 0-30% 的额外抽成比例
 * 需求1.3: 支持按千字或按漫画页数两种计费模式
 *
 * 功能:
 * - 设置库拥有者抽成比例 (0-30%)
 * - 选择上传费用类型 (按千字/按页数)
 * - 设置上传费率
 * - 显示收益分配预览
 * - 保存设置
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function RevenueSettings({
  library,
  onSave,
}: RevenueSettingsProps) {
  // 表单状态
  const [ownerCutPercent, setOwnerCutPercent] = useState(library.ownerCutPercent);
  const [uploadFeeType, setUploadFeeType] = useState<UploadFeeType>(library.uploadFeeType);
  const [uploadFeeRate, setUploadFeeRate] = useState(library.uploadFeeRate);
  
  // UI 状态
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 检查是否有更改
  const hasChanges = useMemo(() => {
    return (
      ownerCutPercent !== library.ownerCutPercent ||
      uploadFeeType !== library.uploadFeeType ||
      uploadFeeRate !== library.uploadFeeRate
    );
  }, [ownerCutPercent, uploadFeeType, uploadFeeRate, library]);

  // 验证 ownerCutPercent
  const ownerCutPercentError = useMemo(() => {
    if (ownerCutPercent < 0) {
      return '抽成比例不能小于 0%';
    }
    if (ownerCutPercent > MAX_OWNER_CUT_PERCENT) {
      return `抽成比例不能超过 ${MAX_OWNER_CUT_PERCENT}%`;
    }
    return null;
  }, [ownerCutPercent]);

  // 验证 uploadFeeRate
  const uploadFeeRateError = useMemo(() => {
    if (uploadFeeRate < 0) {
      return '费率不能为负数';
    }
    return null;
  }, [uploadFeeRate]);

  // 是否可以保存
  const canSave = hasChanges && !ownerCutPercentError && !uploadFeeRateError && !saving;

  // 处理保存
  const handleSave = useCallback(async () => {
    if (!canSave) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const settings: UpdateLibrarySettingsDto = {
        ownerCutPercent,
        uploadFeeType,
        uploadFeeRate,
      };
      await onSave(settings);
      setSuccess(true);
      // 3秒后清除成功提示
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }, [canSave, ownerCutPercent, uploadFeeType, uploadFeeRate, onSave]);

  // 处理抽成比例输入
  const handleOwnerCutPercentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setOwnerCutPercent(Math.min(Math.max(value, 0), 100));
    } else if (e.target.value === '') {
      setOwnerCutPercent(0);
    }
  }, []);

  // 处理费率输入
  const handleUploadFeeRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setUploadFeeRate(Math.max(value, 0));
    } else if (e.target.value === '') {
      setUploadFeeRate(0);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-2xl',
        'bg-white/70 dark:bg-gray-900/70',
        'backdrop-blur-xl',
        'border border-white/30 dark:border-gray-700/30',
        'shadow-lg shadow-indigo-500/5',
        'overflow-hidden'
      )}
    >
      {/* 标题栏 */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              收益设置
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              配置分支上传费用和打赏分成比例
            </p>
          </div>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="p-6 space-y-6">
        {/* 错误提示 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* 成功提示 */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm"
          >
            <Save className="w-4 h-4 flex-shrink-0" />
            <span>设置已保存</span>
          </motion.div>
        )}

        {/* 库拥有者抽成比例 */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Percent className="w-4 h-4 text-indigo-500" />
            <span>库拥有者抽成比例</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={MAX_OWNER_CUT_PERCENT}
              value={ownerCutPercent}
              onChange={handleOwnerCutPercentChange}
              className={cn(
                'w-full px-4 py-3 pr-12 rounded-xl',
                'bg-gray-50 dark:bg-gray-800',
                'border',
                ownerCutPercentError
                  ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500',
                'text-gray-900 dark:text-white',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-offset-0',
                'transition-colors duration-200'
              )}
              placeholder="0"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              %
            </span>
          </div>
          {ownerCutPercentError ? (
            <p className="text-xs text-red-500 dark:text-red-400">{ownerCutPercentError}</p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              设置 0-{MAX_OWNER_CUT_PERCENT}% 的额外抽成，剩余部分归分支创作者
            </p>
          )}
        </div>

        {/* 收益分配预览 */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <RevenuePreview ownerCutPercent={ownerCutPercent} />
        </div>

        {/* 上传费用类型 */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            上传费用类型
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {UPLOAD_FEE_TYPE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = uploadFeeType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setUploadFeeType(option.value)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-xl text-left',
                    'border-2 transition-all duration-200',
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isSelected
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'font-medium text-sm',
                        isSelected
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-gray-700 dark:text-gray-300'
                      )}
                    >
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 上传费率 */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            上传费率
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              value={uploadFeeRate}
              onChange={handleUploadFeeRateChange}
              className={cn(
                'w-full px-4 py-3 pr-24 rounded-xl',
                'bg-gray-50 dark:bg-gray-800',
                'border',
                uploadFeeRateError
                  ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500',
                'text-gray-900 dark:text-white',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-offset-0',
                'transition-colors duration-200'
              )}
              placeholder="0"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">
              {uploadFeeType === 'PER_THOUSAND_WORDS' ? '分/千字' : '分/页'}
            </span>
          </div>
          {uploadFeeRateError ? (
            <p className="text-xs text-red-500 dark:text-red-400">{uploadFeeRateError}</p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {uploadFeeType === 'PER_THOUSAND_WORDS'
                ? '创建改写分支时，按内容字数收取费用'
                : '创建漫画分支时，按漫画页数收取费用'}
            </p>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl',
            'font-medium text-sm',
            'transition-all duration-200',
            canSave
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          )}
        >
          <Save className="w-4 h-4" />
          <span>{saving ? '保存中...' : '保存设置'}</span>
        </button>
      </div>
    </motion.div>
  );
}

export default RevenueSettings;
