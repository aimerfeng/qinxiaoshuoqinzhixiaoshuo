'use client';

import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Send, X, Loader2, Sparkles, AlertCircle, User } from 'lucide-react';
import { cn } from '@/utils/cn';
import { walletService } from '@/services/wallet';
import type { TipRequest } from '@/types/wallet';

/**
 * 打赏弹窗组件
 *
 * 需求15: 零芥子代币系统
 * 任务15.2.3: 打赏弹窗组件
 *
 * 功能:
 * - 显示收款人信息（用户名、头像）
 * - 金额输入与验证（最小1，最大100）
 * - 显示当前余额
 * - 快捷金额按钮（1, 5, 10, 20, 50, 100）
 * - 可选留言输入
 * - 提交打赏（带加载状态）
 * - 成功/错误反馈
 */

// 打赏限制常量
const TIP_MIN = 1;
const TIP_MAX = 100;

// 快捷金额选项
const QUICK_AMOUNTS = [1, 5, 10, 20, 50, 100];

interface TipRecipient {
  id: string;
  username: string;
  avatar?: string;
}

interface TipModalProps {
  recipient: TipRecipient;
  currentBalance: number;
  workId?: string;
  chapterId?: string;
  onClose: () => void;
  onSuccess?: (amount: number, newBalance: number) => void;
}

export default function TipModal({
  recipient,
  currentBalance,
  workId,
  chapterId,
  onClose,
  onSuccess,
}: TipModalProps) {
  const [amount, setAmount] = useState<number | ''>('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    amount: number;
    newBalance: number;
  } | null>(null);


  // 验证金额
  const validateAmount = useCallback((value: number): string | null => {
    if (value < TIP_MIN) {
      return `最少打赏 ${TIP_MIN} 零芥子`;
    }
    if (value > TIP_MAX) {
      return `单次最多打赏 ${TIP_MAX} 零芥子`;
    }
    if (value > currentBalance) {
      return '余额不足';
    }
    if (!Number.isInteger(value)) {
      return '请输入整数金额';
    }
    return null;
  }, [currentBalance]);

  // 处理金额输入
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setAmount('');
      setError(null);
      return;
    }
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setAmount(numValue);
      setError(validateAmount(numValue));
    }
  };

  // 选择快捷金额
  const handleQuickAmount = (value: number) => {
    setAmount(value);
    setError(validateAmount(value));
  };

  // 提交打赏
  const handleSubmit = async () => {
    if (amount === '' || isSubmitting) return;

    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const request: TipRequest = {
        toUserId: recipient.id,
        amount,
        message: message.trim() || undefined,
        workId,
        chapterId,
      };

      const response = await walletService.tip(request);

      if (response.data.success) {
        setResult({
          success: true,
          amount: response.data.amount,
          newBalance: response.data.newBalance,
        });
        onSuccess?.(response.data.amount, response.data.newBalance);
      } else {
        setError(response.data.message || '打赏失败，请稍后重试');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '网络错误，请稍后重试';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidAmount = amount !== '' && !validateAmount(amount);


  return (
    <>
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
      />

      {/* 弹窗内容 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm z-50"
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl',
            'bg-white/90 dark:bg-gray-900/90',
            'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
            'shadow-2xl'
          )}
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* 顶部装饰渐变 - 紫蓝主题 */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-violet-500/20" />

          {/* 内容区域 */}
          <div className="relative p-6 pt-8">
            {result?.success ? (
              // 成功状态
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 mb-4"
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  打赏成功！
                </h3>

                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                  <Sparkles className="w-6 h-6" />
                  <span>-{result.amount}</span>
                  <span className="text-base font-normal">零芥子</span>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  已成功打赏给 {recipient.username}
                </p>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  当前余额: {result.newBalance.toLocaleString()} 零芥子
                </p>

                <button
                  onClick={onClose}
                  className={cn(
                    'w-full py-3 rounded-xl font-medium transition-all',
                    'bg-gradient-to-r from-indigo-500 to-purple-500 text-white',
                    'hover:shadow-lg hover:shadow-indigo-500/25'
                  )}
                >
                  完成
                </button>
              </motion.div>
            ) : (
              // 输入状态
              <>
                {/* 收款人信息 */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative">
                    {recipient.avatar ? (
                      <img
                        src={recipient.avatar}
                        alt={recipient.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">打赏给</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {recipient.username}
                    </p>
                  </div>
                </div>

                {/* 金额输入 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    打赏金额
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder={`${TIP_MIN}-${TIP_MAX}`}
                      min={TIP_MIN}
                      max={TIP_MAX}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl text-lg font-semibold',
                        'bg-gray-50 dark:bg-gray-800/50',
                        'border-2 transition-colors',
                        error
                          ? 'border-red-300 dark:border-red-500/50 focus:border-red-500'
                          : 'border-transparent focus:border-indigo-500 dark:focus:border-purple-500',
                        'focus:outline-none focus:ring-0',
                        'text-gray-900 dark:text-white placeholder-gray-400'
                      )}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      零芥子
                    </span>
                  </div>
                </div>

                {/* 快捷金额按钮 */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((quickAmount) => (
                      <button
                        key={quickAmount}
                        onClick={() => handleQuickAmount(quickAmount)}
                        disabled={quickAmount > currentBalance}
                        className={cn(
                          'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                          amount === quickAmount
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                            : quickAmount > currentBalance
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        )}
                      >
                        {quickAmount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 当前余额 */}
                <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">当前余额</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {currentBalance.toLocaleString()} 零芥子
                  </span>
                </div>

                {/* 留言输入 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    留言（可选）
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="说点什么..."
                    maxLength={100}
                    rows={2}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl resize-none',
                      'bg-gray-50 dark:bg-gray-800/50',
                      'border-2 border-transparent focus:border-indigo-500 dark:focus:border-purple-500',
                      'focus:outline-none focus:ring-0',
                      'text-gray-900 dark:text-white placeholder-gray-400'
                    )}
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">
                    {message.length}/100
                  </p>
                </div>

                {/* 错误提示 */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* 提交按钮 */}
                <button
                  onClick={handleSubmit}
                  disabled={!isValidAmount || isSubmitting}
                  className={cn(
                    'w-full py-3 rounded-xl font-medium transition-all',
                    'bg-gradient-to-r from-indigo-500 to-purple-500 text-white',
                    'hover:shadow-lg hover:shadow-indigo-500/25',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none'
                  )}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      打赏中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Send className="w-5 h-5" />
                      确认打赏
                    </span>
                  )}
                </button>

                {/* 提示信息 */}
                <p className="text-xs text-gray-400 text-center mt-3">
                  单次打赏 {TIP_MIN}-{TIP_MAX} 零芥子，每日上限 500 零芥子
                </p>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
