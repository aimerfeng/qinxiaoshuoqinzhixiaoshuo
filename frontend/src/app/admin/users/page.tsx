'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  Ban,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { adminService, type AdminUser, type UserListQuery } from '@/services/admin';

/**
 * 用户管理页面
 *
 * 需求18: 管理后台
 * 任务18.2.3: 用户管理页面
 *
 * 用户列表、搜索、封禁/解封操作
 */

const MEMBER_LEVELS = [
  { value: '', label: '全部等级' },
  { value: 'VISITOR', label: '游客' },
  { value: 'REGISTERED', label: '注册用户' },
  { value: 'OFFICIAL_MEMBER', label: '正式会员' },
  { value: 'CONTRIBUTOR', label: '贡献者' },
  { value: 'SENIOR_MEMBER', label: '资深会员' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [memberLevel, setMemberLevel] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'banned'>('all');

  // 操作状态
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'ban' | 'unban' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadUsers = useCallback(async (query: UserListQuery = {}) => {
    setIsLoading(true);
    try {
      const response = await adminService.getUserList({
        page: query.page || 1,
        pageSize: 20,
        search: query.search || undefined,
        memberLevel: query.memberLevel || undefined,
        isActive: query.isActive,
      });
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const isActive = activeFilter === 'all' ? undefined : activeFilter === 'active';
    loadUsers({ page: 1, search, memberLevel, isActive });
  }, [loadUsers, search, memberLevel, activeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const isActive = activeFilter === 'all' ? undefined : activeFilter === 'active';
    loadUsers({ page: 1, search, memberLevel, isActive });
  };

  const handlePageChange = (page: number) => {
    const isActive = activeFilter === 'all' ? undefined : activeFilter === 'active';
    loadUsers({ page, search, memberLevel, isActive });
  };

  const handleAction = (userId: string, type: 'ban' | 'unban') => {
    setActionUserId(userId);
    setActionType(type);
    setActionReason('');
  };

  const handleConfirmAction = async () => {
    if (!actionUserId || !actionType || !actionReason.trim()) return;

    setIsProcessing(true);
    try {
      if (actionType === 'ban') {
        await adminService.banUser(actionUserId, actionReason);
      } else {
        await adminService.unbanUser(actionUserId, actionReason);
      }
      // 刷新列表
      const isActive = activeFilter === 'all' ? undefined : activeFilter === 'active';
      await loadUsers({ page: pagination.page, search, memberLevel, isActive });
      setActionUserId(null);
      setActionType(null);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
          <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">用户管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">管理平台用户，支持搜索和封禁操作</p>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-4 rounded-2xl',
          'bg-white/60 dark:bg-gray-900/60',
          'backdrop-blur-xl border border-white/20 dark:border-gray-700/30'
        )}
      >
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          {/* 搜索框 */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索用户名、昵称或邮箱..."
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl',
                  'bg-white dark:bg-gray-800',
                  'border border-gray-200 dark:border-gray-700',
                  'text-gray-900 dark:text-white',
                  'placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
                )}
              />
            </div>
          </div>

          {/* 会员等级筛选 */}
          <select
            value={memberLevel}
            onChange={(e) => setMemberLevel(e.target.value)}
            className={cn(
              'px-4 py-2.5 rounded-xl',
              'bg-white dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
            )}
          >
            {MEMBER_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>

          {/* 状态筛选 */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {(['all', 'active', 'banned'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium transition-colors',
                  activeFilter === filter
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                {filter === 'all' ? '全部' : filter === 'active' ? '正常' : '已封禁'}
              </button>
            ))}
          </div>
        </form>
      </motion.div>

      {/* 用户列表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          'rounded-2xl overflow-hidden',
          'bg-white/60 dark:bg-gray-900/60',
          'backdrop-blur-xl border border-white/20 dark:border-gray-700/30'
        )}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">暂无用户数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    用户
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    邮箱
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    会员等级
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    注册时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    最后登录
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-medium">
                            {(user.nickname || user.username).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.nickname || user.username}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        {user.memberLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          正常
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                          <Ban className="w-3.5 h-3.5" />
                          已封禁
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.isActive ? (
                        <button
                          onClick={() => handleAction(user.id, 'ban')}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          封禁
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(user.id, 'unban')}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                        >
                          解封
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              共 {pagination.total} 条记录
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* 操作确认弹窗 */}
      <AnimatePresence>
        {actionUserId && actionType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setActionUserId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'w-full max-w-md p-6 rounded-2xl',
                'bg-white dark:bg-gray-900',
                'border border-gray-200 dark:border-gray-700',
                'shadow-xl'
              )}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    'p-2 rounded-xl',
                    actionType === 'ban'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  )}
                >
                  {actionType === 'ban' ? (
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {actionType === 'ban' ? '封禁用户' : '解封用户'}
                </h3>
                <button
                  onClick={() => setActionUserId(null)}
                  className="ml-auto p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {actionType === 'ban'
                  ? '封禁后该用户将无法登录和使用平台功能。'
                  : '解封后该用户将恢复正常使用权限。'}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {actionType === 'ban' ? '封禁原因' : '解封原因'} *
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="请输入原因..."
                  rows={3}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-gray-50 dark:bg-gray-800',
                    'border border-gray-200 dark:border-gray-700',
                    'text-gray-900 dark:text-white',
                    'placeholder:text-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
                  )}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActionUserId(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={!actionReason.trim() || isProcessing}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50',
                    actionType === 'ban'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  )}
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '确认'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
