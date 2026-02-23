/**
 * 修改密码表单组件
 *
 * 需求21: 设置中心
 * 任务21.2.2: 账户安全设置
 *
 * 需求21验收标准2: WHEN 用户修改密码 THEN System SHALL 验证原密码并要求二次确认
 *
 * 功能:
 * - 输入当前密码
 * - 输入新密码
 * - 确认新密码
 * - 密码强度提示
 * - 表单验证
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye,
  EyeOff,
  Lock,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useChangePassword } from '@/hooks/useSettings';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * 密码强度等级
 */
type PasswordStrength = 'weak' | 'medium' | 'strong';

/**
 * 计算密码强度
 */
function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return 'weak';

  let score = 0;

  // 长度检查
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // 包含小写字母
  if (/[a-z]/.test(password)) score += 1;

  // 包含大写字母
  if (/[A-Z]/.test(password)) score += 1;

  // 包含数字
  if (/\d/.test(password)) score += 1;

  // 包含特殊字符
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

/**
 * 密码强度配置
 */
const strengthConfig: Record<
  PasswordStrength,
  { label: string; color: string; bgColor: string; width: string }
> = {
  weak: {
    label: '弱',
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    width: 'w-1/3',
  },
  medium: {
    label: '中',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    width: 'w-2/3',
  },
  strong: {
    label: '强',
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    width: 'w-full',
  },
};

export default function ChangePasswordForm({
  onSuccess,
  onCancel,
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePasswordMutation = useChangePassword();

  const passwordStrength = calculatePasswordStrength(newPassword);
  const strengthInfo = strengthConfig[passwordStrength];

  // 密码要求检查
  const passwordRequirements = [
    { label: '至少8个字符', met: newPassword.length >= 8 },
    { label: '包含大写字母', met: /[A-Z]/.test(newPassword) },
    { label: '包含小写字母', met: /[a-z]/.test(newPassword) },
    { label: '包含数字', met: /\d/.test(newPassword) },
  ];

  // 表单验证
  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    passwordStrength !== 'weak';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValid) {
      if (newPassword !== confirmPassword) {
        setError('两次输入的密码不一致');
      } else if (newPassword.length < 8) {
        setError('新密码至少需要8个字符');
      } else if (passwordStrength === 'weak') {
        setError('密码强度太弱，请使用更复杂的密码');
      }
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : '修改密码失败，请稍后重试';
      setError(errorMessage);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-8"
      >
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-lg font-medium text-gray-900 dark:text-white">
          密码修改成功
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          请使用新密码重新登录
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 当前密码 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          当前密码
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="请输入当前密码"
            className={cn(
              'w-full pl-10 pr-10 py-3 rounded-xl',
              'bg-gray-50 dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-white placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'transition-all'
            )}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showCurrentPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* 新密码 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          新密码
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="请输入新密码"
            className={cn(
              'w-full pl-10 pr-10 py-3 rounded-xl',
              'bg-gray-50 dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-white placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'transition-all'
            )}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showNewPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 密码强度指示器 */}
        {newPassword && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                密码强度
              </span>
              <span className={cn('text-xs font-medium', strengthInfo.color)}>
                {strengthInfo.label}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: strengthInfo.width === 'w-full' ? '100%' : strengthInfo.width === 'w-2/3' ? '66.67%' : '33.33%' }}
                className={cn('h-full rounded-full', strengthInfo.bgColor)}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* 密码要求 */}
        {newPassword && (
          <div className="mt-3 space-y-1">
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center gap-2">
                {req.met ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                )}
                <span
                  className={cn(
                    'text-xs',
                    req.met
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 确认新密码 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          确认新密码
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入新密码"
            className={cn(
              'w-full pl-10 pr-10 py-3 rounded-xl',
              'bg-gray-50 dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-white placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'transition-all',
              confirmPassword &&
                newPassword !== confirmPassword &&
                'border-red-500 focus:ring-red-500'
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="mt-1 text-xs text-red-500">两次输入的密码不一致</p>
        )}
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'flex-1 py-3 rounded-xl',
            'text-sm font-medium',
            'text-gray-700 dark:text-gray-300',
            'bg-gray-100 dark:bg-gray-800',
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'transition-colors'
          )}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={!isValid || changePasswordMutation.isPending}
          className={cn(
            'flex-1 py-3 rounded-xl',
            'text-sm font-medium text-white',
            'bg-gradient-to-r from-indigo-500 to-purple-500',
            'hover:from-indigo-600 hover:to-purple-600',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all',
            'flex items-center justify-center gap-2'
          )}
        >
          {changePasswordMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              修改中...
            </>
          ) : (
            '确认修改'
          )}
        </button>
      </div>
    </form>
  );
}
