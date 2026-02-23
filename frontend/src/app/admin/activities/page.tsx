'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Coins,
  Users,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { adminService, type ActivityReview, type ActivityListQuery } from '@/services/admin';

/**
 * 活动管理页面
 *
 * 需求18: 管理后台
 * 任务18.2.6: 活动管理页面
 *
 * 活动列表、审核操作
 */

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待审核' },
  { value: 'ACTIVE', label: '进行中' },
  { value: 'ENDED', label: '已结束' },
  { value: 'CANCELLED', label: '已取消' },
];

const TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'READING_CHALLENGE', label: '阅读打卡' },
  { value: 'WRITING_CONTEST', label: '评论征集' },
  { value: 'COMMUNITY_EVENT', label: '引用挑战' },
  { value: 'SPECIAL_EVENT', label: '官方活动' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
  ACTIVE: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  ENDED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  CANCELLED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  READING_CHALLENGE: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  WRITING_CONTEST: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  COMMUNITY_EVENT: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  SPECIAL_EVENT: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400' },
};

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<ActivityReview[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // 操作状态
  const [selectedActivity, setSelectedActivity] = useState<ActivityReview | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadActivities = useCallback(async (query: ActivityListQuery = {}) => {
    setIsLoading(true);
    try {
      const response = await adminService.getActivityList({
        page: query.page || 1,
        pageSize: 20,
        status: query.status || undefined,
        type: query.type || undefined,
      });
      setActivities(response.activities);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities({ page: 1, status: statusFilter, type: typeFilter });
  }, [loadActivities, statusFilter, typeFilter]);

  const handlePageChange = (page: number) => {
    loadActivities({ page, status: statusFilter, type: typeFilter });
  };

  const handleAction = (activity: ActivityReview, type: 'approve' | 'reject') => {
    setSelectedActivity(activity);
    setActionType(type);
    setActionNote('');
  };

  const handleConfirmAction = async () => {
    if (!selectedActivity || !actionType) return;

    setIsProcessing(true);
    try {
      if (actionType === 'approve') {
        await adminService.approveActivity(selectedActivity.id, actionNote || undefined);
      } else {
        if (!actionNote.trim()) return;
        await adminService.rejectActivity(selectedActivity.id, actionNote);
      }
      await loadActivities({ page: pagination.page, status: statusFilter, type: typeFilter });
      setSelectedActivity(null);
      setActionType(null);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
          <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">活动管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">审核和管理社区活动</p>
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
        <div className="flex flex-wrap items-center gap-4">
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
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={cn(
              'px-4 py-2.5 rounded-xl',
              'bg-white dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
            )}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* 活动列表 */}
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
        ) : activities.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">暂无活动数据</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activities.map((activity) => {
              const statusStyle = STATUS_COLORS[activity.status] || STATUS_COLORS.PENDING;
              const typeStyle = TYPE_COLORS[activity.type] || TYPE_COLORS.SPECIAL_EVENT;
              const typeName = TYPE_OPTIONS.find((t) => t.value === activity.type)?.label || activity.type;
              const statusName = STATUS_OPTIONS.find((s) => s.value === activity.status)?.label || activity.status;

              return (
                <div key={activity.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', typeStyle.bg, typeStyle.text)}>
                          {typeName}
                        </span>
                        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', statusStyle.bg, statusStyle.text)}>
                          {statusName}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">{activity.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{activity.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(activity.startTime)} - {formatDate(activity.endTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" />
                          {activity.rewardPerPerson} 零芥子/人
                        </span>
                        <span className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          总奖池: {activity.totalPool}
                        </span>
                        <span>发起人: {activity.creator.nickname || activity.creator.username}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activity.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleAction(activity, 'approve')}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                          >
                            通过
                          </button>
                          <button
                            onClick={() => handleAction(activity, 'reject')}
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
        {selectedActivity && actionType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedActivity(null)}
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
                  {actionType === 'approve' ? '通过活动' : '拒绝活动'}
                </h3>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="ml-auto p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 mb-4">
                <p className="font-medium text-gray-900 dark:text-white mb-1">{selectedActivity.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  奖池: {selectedActivity.totalPool} 零芥子 · {selectedActivity.rewardPerPerson} 零芥子/人
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {actionType === 'approve' ? '审核备注（可选）' : '拒绝原因 *'}
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={actionType === 'approve' ? '请输入审核备注...' : '请输入拒绝原因，将通知活动发起人...'}
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
                  onClick={() => setSelectedActivity(null)}
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
