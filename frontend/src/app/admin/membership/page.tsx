'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Star,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { adminService, type MembershipApplication, type ApplicationListQuery } from '@/services/admin';

/**
 * 会员审核页面
 *
 * 需求18: 管理后台
 * 任务18.2.5: 会员审核页面
 *
 * 会员申请列表、审核通过/拒绝
 */

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待审核' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已拒绝' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  PENDING: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-600 dark:text-yellow-400',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  APPROVED: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  REJECTED: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const LEVEL_NAMES: Record<string, string> = {
  OFFICIAL_MEMBER: '正式会员',
  CONTRIBUTOR: '贡献者',
  SENIOR_MEMBER: '资深会员',
};

export default function AdminMembershipPage() {
  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // 操作状态
  const [selectedApp, setSelectedApp] = useState<MembershipApplication | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadApplications = useCallback(async (query: ApplicationListQuery = {}) => {
    setIsLoading(true);
    try {
      const response = await adminService.getApplicationList({
        page: query.page || 1,
        pageSize: 20,
        status: query.status || undefined,
      });
      setApplications(response.applications);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications({ page: 1, status: statusFilter });
  }, [loadApplications, statusFilter]);

  const handlePageChange = (page: number) => {
    loadApplications({ page, status: statusFilter });
  };

  const handleAction = (app: MembershipApplication, type: 'approve' | 'reject') => {
    setSelectedApp(app);
    setActionType(type);
    setActionNote('');
  };

  const handleConfirmAction = async () => {
    if (!selectedApp || !actionType) return;

    setIsProcessing(true);
    try {
      if (actionType === 'approve') {
        await adminService.approveApplication(selectedApp.id, actionNote || undefined);
      } else {
        if (!actionNote.trim()) return;
        await adminService.rejectApplication(selectedApp.id, actionNote);
      }
      await loadApplications({ page: pagination.page, status: statusFilter });
      setSelectedApp(null);
      setActionType(null);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
          <UserCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">会员审核</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">审核用户的会员升级申请</p>
        </div>
      </div>

      {/* 筛选 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-4 rounded-2xl',
          'bg-white/60 dark:bg-gray-900/60',
          'backdrop-blur-xl border border-white/20 dark:border-gray-700/30'
        )}
      >
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={cn(
              'px-4 py-2.5 rounded-xl',
              'bg-white dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
            )}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* 申请列表 */}
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
        ) : applications.length === 0 ? (
          <div className="text-center py-20">
            <UserCheck className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">暂无会员申请</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {applications.map((app) => {
              const statusStyle = STATUS_COLORS[app.status] || STATUS_COLORS.PENDING;
              return (
                <div key={app.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {app.user.avatar ? (
                        <img src={app.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-medium">
                          {(app.user.nickname || app.user.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {app.user.nickname || app.user.username}
                          </span>
                          <span
                            className={cn(
                              'flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
                              statusStyle.bg,
                              statusStyle.text
                            )}
                          >
                            {statusStyle.icon}
                            {STATUS_OPTIONS.find((o) => o.value === app.status)?.label || app.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-amber-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            申请升级为: <span className="font-medium text-purple-600 dark:text-purple-400">{LEVEL_NAMES[app.targetLevel] || app.targetLevel}</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{app.reason}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{formatDate(app.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {app.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleAction(app, 'approve')}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                          >
                            通过
                          </button>
                          <button
                            onClick={() => handleAction(app, 'reject')}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            拒绝
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 分页 */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">共 {pagination.total} 条记录</p>
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
        {selectedApp && actionType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedApp(null)}
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
                    actionType === 'approve'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  )}
                >
                  {actionType === 'approve' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {actionType === 'approve' ? '通过申请' : '拒绝申请'}
                </h3>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="ml-auto p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  用户: <span className="font-medium text-gray-900 dark:text-white">{selectedApp.user.nickname || selectedApp.user.username}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  申请等级: <span className="font-medium text-purple-600 dark:text-purple-400">{LEVEL_NAMES[selectedApp.targetLevel] || selectedApp.targetLevel}</span>
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {actionType === 'approve' ? '审核备注（可选）' : '拒绝原因 *'}
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={actionType === 'approve' ? '请输入审核备注...' : '请输入拒绝原因...'}
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
                  onClick={() => setSelectedApp(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={(actionType === 'reject' && !actionNote.trim()) || isProcessing}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50',
                    actionType === 'approve'
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
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
