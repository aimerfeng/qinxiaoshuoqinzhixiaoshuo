'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Eye,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { adminService, type Report, type ReportListQuery } from '@/services/admin';

/**
 * 内容审核页面
 *
 * 需求18: 管理后台
 * 任务18.2.4: 内容审核页面
 *
 * 举报列表、审核操作
 */

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待处理' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已拒绝' },
  { value: 'RESOLVED', label: '已解决' },
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
  RESOLVED: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
};

export default function AdminContentPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // 操作状态
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadReports = useCallback(async (query: ReportListQuery = {}) => {
    setIsLoading(true);
    try {
      const response = await adminService.getReportList({
        page: query.page || 1,
        pageSize: 20,
        status: query.status || undefined,
      });
      setReports(response.reports);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports({ page: 1, status: statusFilter });
  }, [loadReports, statusFilter]);

  const handlePageChange = (page: number) => {
    loadReports({ page, status: statusFilter });
  };

  const handleAction = (report: Report, type: 'APPROVE' | 'REJECT') => {
    setSelectedReport(report);
    setActionType(type);
    setActionNote('');
  };

  const handleConfirmAction = async () => {
    if (!selectedReport || !actionType) return;

    setIsProcessing(true);
    try {
      await adminService.processReport(selectedReport.id, actionType, actionNote || undefined);
      await loadReports({ page: pagination.page, status: statusFilter });
      setSelectedReport(null);
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
        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">内容审核</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">处理用户举报，维护社区环境</p>
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

      {/* 举报列表 */}
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
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">暂无举报记录</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {reports.map((report) => {
              const statusStyle = STATUS_COLORS[report.status] || STATUS_COLORS.PENDING;
              return (
                <div key={report.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full',
                            statusStyle.bg,
                            statusStyle.text
                          )}
                        >
                          {statusStyle.icon}
                          {STATUS_OPTIONS.find((o) => o.value === report.status)?.label || report.status}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {report.targetType} · {report.type}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white mb-1">{report.reason}</p>
                      {report.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{report.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>举报人: {report.reporter.nickname || report.reporter.username}</span>
                        <span>{formatDate(report.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {report.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleAction(report, 'APPROVE')}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                          >
                            通过
                          </button>
                          <button
                            onClick={() => handleAction(report, 'REJECT')}
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
        {selectedReport && actionType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedReport(null)}
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
                    actionType === 'APPROVE'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  )}
                >
                  {actionType === 'APPROVE' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {actionType === 'APPROVE' ? '通过举报' : '拒绝举报'}
                </h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="ml-auto p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {actionType === 'APPROVE'
                  ? '确认该举报有效，将对被举报内容进行处理。'
                  : '确认该举报无效，不对被举报内容进行处理。'}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  处理备注（可选）
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="请输入处理备注..."
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
                  onClick={() => setSelectedReport(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={isProcessing}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50',
                    actionType === 'APPROVE'
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
