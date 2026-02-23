'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { api } from '@/lib/api';
import {
  AlertList,
  AlertFilters,
  AlertStatsCard,
  SeverityDistribution,
  BatchProcessingPanel,
} from '@/components/risk-control';
import type {
  RiskAlert,
  AlertListResponse,
  AlertStats,
  AlertFilters as AlertFiltersType,
  PunishmentType,
} from '@/types/risk-control';
import { AlertStatus } from '@/types/risk-control';

/**
 * 风控告警列表页面
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.1: 风控告警列表
 *
 * 功能:
 * - 显示风控告警列表
 * - 按类型、严重程度、状态过滤
 * - 分页支持
 * - 点击查看告警详情
 * - 显示告警统计数据
 *
 * API 集成:
 * - GET /api/v1/risk-control/alerts - 获取告警列表
 * - GET /api/v1/risk-control/alerts/stats - 获取告警统计
 */

const DEFAULT_PAGE_SIZE = 20;

export default function RiskControlAlertsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AlertFiltersType>({
    limit: DEFAULT_PAGE_SIZE,
    offset: 0,
  });
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);

  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || DEFAULT_PAGE_SIZE)) + 1;

  // 获取告警列表
  const {
    data: alertsData,
    isLoading: isLoadingAlerts,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['risk-alerts', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.status) params.append('status', filters.status);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.offset) params.append('offset', String(filters.offset));

      const response = await api.get<{ message: string; data: AlertListResponse }>(
        `/risk-control/alerts?${params.toString()}`
      );
      return response.data.data;
    },
  });

  // 获取告警统计
  const {
    data: statsData,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['risk-alert-stats'],
    queryFn: async () => {
      const response = await api.get<{ message: string; data: AlertStats }>(
        '/risk-control/alerts/stats'
      );
      return response.data.data;
    },
  });

  // 处理页码变化
  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({
      ...prev,
      offset: (page - 1) * (prev.limit || DEFAULT_PAGE_SIZE),
    }));
  }, []);

  // 处理过滤器变化
  const handleFiltersChange = useCallback((newFilters: AlertFiltersType) => {
    setFilters(newFilters);
  }, []);

  // 处理告警点击
  const handleAlertClick = useCallback((alert: RiskAlert) => {
    router.push(`/admin/risk-control/alerts/${alert.id}`);
  }, [router]);

  // 刷新数据
  const handleRefresh = useCallback(() => {
    refetchAlerts();
  }, [refetchAlerts]);

  // 批量更新状态 mutation
  const batchUpdateStatusMutation = useMutation({
    mutationFn: async ({
      alertIds,
      status,
      note,
    }: {
      alertIds: string[];
      status: AlertStatus;
      note?: string;
    }) => {
      // 批量更新每个告警的状态
      const promises = alertIds.map((alertId) =>
        api.patch(`/risk-control/alerts/${alertId}/status`, { status, note })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['risk-alert-stats'] });
      setSelectedAlertIds([]);
    },
  });

  // 批量执行惩罚 mutation
  const batchPunishmentMutation = useMutation({
    mutationFn: async ({
      alertIds,
      type,
      durationMinutes,
    }: {
      alertIds: string[];
      type: PunishmentType;
      durationMinutes?: number;
    }) => {
      const createdBy = 'current-admin-id'; // TODO: 从认证上下文获取
      const promises = alertIds.map((alertId) =>
        api.post('/risk-control/punishments/execute-from-alert-all', {
          alertId,
          type,
          durationMinutes,
          createdBy,
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['risk-alert-stats'] });
      setSelectedAlertIds([]);
    },
  });

  // 处理批量操作
  const handleBatchProcess = useCallback(
    async (params: {
      alertIds: string[];
      action: 'dismiss' | 'resolve' | 'investigate' | 'apply_punishment';
      note?: string;
      punishment?: {
        type: PunishmentType;
        durationMinutes?: number;
        reason: string;
      };
    }) => {
      const { alertIds, action, note, punishment } = params;

      switch (action) {
        case 'dismiss':
          await batchUpdateStatusMutation.mutateAsync({
            alertIds,
            status: AlertStatus.DISMISSED,
            note: note || '批量忽略',
          });
          break;

        case 'resolve':
          await batchUpdateStatusMutation.mutateAsync({
            alertIds,
            status: AlertStatus.RESOLVED,
            note: note || '批量解决',
          });
          break;

        case 'investigate':
          await batchUpdateStatusMutation.mutateAsync({
            alertIds,
            status: AlertStatus.INVESTIGATING,
            note: note || '批量标记调查中',
          });
          break;

        case 'apply_punishment':
          if (punishment) {
            await batchPunishmentMutation.mutateAsync({
              alertIds,
              type: punishment.type,
              durationMinutes: punishment.durationMinutes,
            });
          }
          break;
      }
    },
    [batchUpdateStatusMutation, batchPunishmentMutation]
  );

  // 处理选择变化
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedAlertIds(ids);
  }, []);

  const isBatchProcessing =
    batchUpdateStatusMutation.isPending || batchPunishmentMutation.isPending;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
          <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">风控告警</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            监控和处理平台风控告警
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <AlertStatsCard stats={statsData || null} isLoading={isLoadingStats} />

      {/* 严重程度分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {/* 过滤器 */}
          <AlertFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            className="mb-4"
          />

          {/* 告警列表 */}
          <AlertList
            data={alertsData || null}
            isLoading={isLoadingAlerts}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onAlertClick={handleAlertClick}
            onRefresh={handleRefresh}
            selectedIds={selectedAlertIds}
            onSelectionChange={handleSelectionChange}
          />
        </div>

        <div className="space-y-4">
          {/* 严重程度分布 */}
          <SeverityDistribution stats={statsData || null} isLoading={isLoadingStats} />

          {/* 快速操作提示 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={cn(
              'p-4 rounded-xl',
              'bg-white/60 dark:bg-gray-900/60',
              'backdrop-blur-xl border border-white/20 dark:border-gray-700/30'
            )}
          >
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              快速操作
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>紧急告警需立即处理</span>
              </p>
              <p className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span>高级告警需数小时内处理</span>
              </p>
              <p className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span>中级告警需数天内处理</span>
              </p>
              <p className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                <span>低级告警为信息性提示</span>
              </p>
            </div>
          </motion.div>

          {/* 平均解决时间 */}
          {statsData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={cn(
                'p-4 rounded-xl',
                'bg-white/60 dark:bg-gray-900/60',
                'backdrop-blur-xl border border-white/20 dark:border-gray-700/30'
              )}
            >
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                平均解决时间
              </h3>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {statsData.avgResolutionTimeHours.toFixed(1)} 小时
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                基于最近 100 条已解决告警
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* 批量处理面板 */}
      <BatchProcessingPanel
        alerts={alertsData?.alerts || []}
        selectedIds={selectedAlertIds}
        onSelectionChange={handleSelectionChange}
        onBatchProcess={handleBatchProcess}
        isProcessing={isBatchProcessing}
      />
    </div>
  );
}
