'use client';

import { useState, useCallback } from 'react';
import { UserX, Search, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SettingsPageHeader,
  SettingsSection,
} from '@/components/settings';
import BlacklistItem from '@/components/settings/BlacklistItem';
import { useBlacklist, useRemoveFromBlacklist } from '@/hooks/useBlacklist';
import { cn } from '@/utils/cn';

/**
 * 黑名单管理页面
 *
 * 需求21: 设置中心
 * 任务21.2.7: 黑名单管理
 *
 * 需求21验收标准10: WHEN 用户拉黑其他用户 THEN System SHALL 屏蔽对方内容和互动
 * 需求21验收标准11: WHEN 用户解除拉黑 THEN System SHALL 恢复正常显示
 *
 * 功能:
 * - 查看黑名单列表
 * - 搜索黑名单用户
 * - 解除拉黑（带确认对话框）
 * - 分页加载
 */

export default function BlacklistSettingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmUnblock, setConfirmUnblock] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 获取黑名单数据
  const { data, isLoading, error, refetch } = useBlacklist(currentPage);
  const removeFromBlacklistMutation = useRemoveFromBlacklist();

  // 过滤黑名单（本地搜索）
  const filteredBlacklist = data?.users.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.blockedUser.username.toLowerCase().includes(query) ||
      entry.blockedUser.displayName?.toLowerCase().includes(query)
    );
  }) || [];

  // 处理解除拉黑
  const handleUnblock = useCallback(async (userId: string) => {
    try {
      await removeFromBlacklistMutation.mutateAsync(userId);
      setConfirmUnblock(null);
      setSuccessMessage('已成功解除拉黑');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      // Error handled by mutation
    }
  }, [removeFromBlacklistMutation]);

  // 请求解除拉黑（显示确认对话框）
  const requestUnblock = useCallback((userId: string) => {
    setConfirmUnblock(userId);
  }, []);

  // 取消解除拉黑
  const cancelUnblock = useCallback(() => {
    setConfirmUnblock(null);
  }, []);

  // 确认解除拉黑
  const confirmUnblockAction = useCallback(async () => {
    if (confirmUnblock) {
      await handleUnblock(confirmUnblock);
    }
  }, [confirmUnblock, handleUnblock]);

  // 获取待确认用户信息
  const pendingUnblockUser = confirmUnblock
    ? data?.users.find((entry) => entry.blockedUserId === confirmUnblock)
    : null;

  return (
    <div className="max-w-2xl">
      <SettingsPageHeader
        title="黑名单管理"
        description="管理您拉黑的用户，被拉黑的用户无法与您互动"
        icon={<UserX className="w-6 h-6" />}
      />

      {/* 成功提示 */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          >
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-600 dark:text-green-400">
              {successMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 搜索框 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索黑名单用户..."
            className={cn(
              'w-full pl-12 pr-4 py-3 rounded-xl',
              'bg-white dark:bg-gray-900',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-white placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'transition-all'
            )}
          />
        </div>
      </div>

      {/* 黑名单列表 */}
      <SettingsSection
        title={`黑名单用户${data ? ` (${data.total})` : ''}`}
        description="点击「解除拉黑」可恢复与该用户的正常互动"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
              加载黑名单失败
            </p>
            <button
              onClick={() => refetch()}
              className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              重试
            </button>
          </div>
        ) : filteredBlacklist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <UserX className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {searchQuery ? '未找到匹配的用户' : '黑名单为空'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium"
              >
                清除搜索
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <AnimatePresence mode="popLayout">
              {filteredBlacklist.map((entry, index) => (
                <BlacklistItem
                  key={entry.id}
                  entry={entry}
                  onUnblock={requestUnblock}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* 分页控制 */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              第 {data.page} 页，共 {Math.ceil(data.total / data.limit)} 页
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg',
                  'text-gray-600 dark:text-gray-400',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!data.hasMore}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg',
                  'text-gray-600 dark:text-gray-400',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </SettingsSection>

      {/* 提示信息 */}
      <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>提示：</strong>被拉黑的用户将无法：
        </p>
        <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
          <li>给您发送私信</li>
          <li>评论您的内容</li>
          <li>@提及您</li>
          <li>查看您的非公开内容</li>
        </ul>
      </div>

      {/* 确认解除拉黑对话框 */}
      <AnimatePresence>
        {confirmUnblock && pendingUnblockUser && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelUnblock}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            {/* 对话框 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  确认解除拉黑
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  确定要解除对{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {pendingUnblockUser.blockedUser.displayName ||
                      pendingUnblockUser.blockedUser.username}
                  </span>{' '}
                  的拉黑吗？解除后该用户将可以与您正常互动。
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={cancelUnblock}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium',
                      'text-gray-600 dark:text-gray-400',
                      'hover:bg-gray-100 dark:hover:bg-gray-800',
                      'transition-colors'
                    )}
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmUnblockAction}
                    disabled={removeFromBlacklistMutation.isPending}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                      'text-white bg-red-500 hover:bg-red-600',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-colors'
                    )}
                  >
                    {removeFromBlacklistMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    确认解除
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
