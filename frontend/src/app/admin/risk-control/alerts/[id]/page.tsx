'use client';

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Loader2, AlertTriangle, Settings } from 'lucide-react';
import { cn } from '@/utils/cn';
import { api } from '@/lib/api';
import {
  AlertDetailHeader,
  AlertDataView,
  AffectedUsersList,
  AlertNotes,
  AlertTimeline,
  AlertActions,
  AlertProcessingModal,
} from '@/components/risk-control';
import type { ProcessingAction } from '@/components/risk-control';
import type {
  RiskAlert,
  AlertStatus,
  AlertStatusChange,
  PunishmentType,
  AffectedUser,
} from '@/types/risk-control';
import { AlertStatus as AlertStatusEnum } from '@/types/risk-control';

/**
 * 风控告警详情页面
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.2: 告警详情页面
 *
 * 功能:
 * - 显示告警完整详情（类型、严重程度、状态、标题、描述）
 * - 显示受影响用户列表
 * - 显示告警数据/证据
 * - 显示备注列表，支持添加新备注
 * - 状态更新操作（PENDING → INVESTIGATING → RESOLVED/DISMISSED）
 * - 分配告警给管理员
 * - 从告警执行惩罚
 * - 状态变更时间线
 * - 返回告警列表导航
 *
 * API 集成:
 * - GET /api/v1/risk-control/alerts/:id - 获取告警详情
 * - PATCH /api/v1/risk-control/alerts/:id/status - 更新状态
 * - PATCH /api/v1/risk-control/alerts/:id/assign - 分配告警
 * - POST /api/v1/risk-control/alerts/:id/notes - 添加备注
 * - POST /api/v1/risk-control/punishments/execute-from-alert - 执行惩罚
 */

// 扩展的告警详情响应接口
interface AlertDetailResponse extends RiskAlert {
  statusHistory?: AlertStatusChange[];
  affectedUsers?: AffectedUser[];
}

export default function AlertDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const alertId = params.id as string;

  // 处理模态框状态
  const [showProcessingModal, setShowProcessingModal] = useState(false);

  // 获取告警详情
  const {
    data: alert,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['risk-alert', alertId],
    queryFn: async () => {
      const response = await api.get<{ message: string; data: AlertDetailResponse }>(
        `/risk-control/alerts/${alertId}`
      );
      return response.data.data;
    },
    enabled: !!alertId,
  });

  // 更新状态 mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, note }: { status: AlertStatus; note?: string }) => {
      const response = await api.patch<{ message: string; data: RiskAlert }>(
        `/risk-control/alerts/${alertId}/status`,
        { status, note }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-alert', alertId] });
      queryClient.invalidateQueries({ queryKey: ['risk-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['risk-alert-stats'] });
    },
  });

  // 分配告警 mutation
  const assignMutation = useMutation({
    mutationFn: async (adminId: string) => {
      const response = await api.patch<{ message: string; data: RiskAlert }>(
        `/risk-control/alerts/${alertId}/assign`,
        { adminId }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-alert', alertId] });
      queryClient.invalidateQueries({ queryKey: ['risk-alerts'] });
    },
  });

  // 添加备注 mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      // TODO: 从认证上下文获取当前用户ID
      const authorId = 'current-admin-id';
      const response = await api.post<{
        message: string;
        data: { note: { id: string; content: string; authorId: string; createdAt: Date } };
      }>(`/risk-control/alerts/${alertId}/notes?authorId=${authorId}`, { note: content });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-alert', alertId] });
    },
  });

  // 执行惩罚 mutation
  const executePunishmentMutation = useMutation({
    mutationFn: async ({
      type,
      durationMinutes,
    }: {
      type: PunishmentType;
      durationMinutes?: number;
    }) => {
      // TODO: 从认证上下文获取当前用户ID
      const createdBy = 'current-admin-id';
      const response = await api.post<{ message: string; data: unknown }>(
        '/risk-control/punishments/execute-from-alert-all',
        {
          alertId,
          type,
          durationMinutes,
          createdBy,
        }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-alert', alertId] });
    },
  });

  // 处理返回
  const handleBack = useCallback(() => {
    router.push('/admin/risk-control/alerts');
  }, [router]);

  // 处理状态更新
  const handleUpdateStatus = useCallback(
    async (status: AlertStatus, note?: string) => {
      await updateStatusMutation.mutateAsync({ status, note });
    },
    [updateStatusMutation]
  );

  // 处理分配
  const handleAssign = useCallback(
    async (adminId: string) => {
      await assignMutation.mutateAsync(adminId);
    },
    [assignMutation]
  );

  // 处理添加备注
  const handleAddNote = useCallback(
    async (content: string) => {
      await addNoteMutation.mutateAsync(content);
    },
    [addNoteMutation]
  );

  // 处理执行惩罚
  const handleExecutePunishment = useCallback(
    async (type: PunishmentType, durationMinutes?: number) => {
      await executePunishmentMutation.mutateAsync({ type, durationMinutes });
    },
    [executePunishmentMutation]
  );

  // 处理模态框中的处理操作
  const handleProcess = useCallback(
    async (params: {
      action: ProcessingAction;
      note?: string;
      punishment?: {
        type: PunishmentType;
        durationMinutes?: number;
        reason: string;
      };
      escalateTo?: string;
    }) => {
      const { action, note, punishment, escalateTo } = params;

      switch (action) {
        case 'dismiss':
          await updateStatusMutation.mutateAsync({
            status: AlertStatusEnum.DISMISSED,
            note: note || '标记为误报',
          });
          break;

        case 'escalate':
          // 先更新状态为调查中
          await updateStatusMutation.mutateAsync({
            status: AlertStatusEnum.INVESTIGATING,
            note: note || `升级处理到: ${escalateTo}`,
          });
          // 然后分配给指定管理员
          if (escalateTo) {
            await assignMutation.mutateAsync(escalateTo);
          }
          break;

        case 'apply_punishment':
          if (punishment) {
            await executePunishmentMutation.mutateAsync({
              type: punishment.type,
              durationMinutes: punishment.durationMinutes,
            });
            // 添加备注记录惩罚原因
            if (punishment.reason) {
              await addNoteMutation.mutateAsync(
                `执行惩罚: ${punishment.type}${punishment.durationMinutes ? ` (${punishment.durationMinutes}分钟)` : ''}\n原因: ${punishment.reason}`
              );
            }
          }
          break;

        case 'request_info':
          await updateStatusMutation.mutateAsync({
            status: AlertStatusEnum.INVESTIGATING,
            note: note || '需要更多信息',
          });
          break;

        case 'resolve':
          await updateStatusMutation.mutateAsync({
            status: AlertStatusEnum.RESOLVED,
            note: note || '已解决',
          });
          break;
      }

      setShowProcessingModal(false);
    },
    [updateStatusMutation, assignMutation, executePunishmentMutation, addNoteMutation]
  );

  // 处理用户点击
  const handleUserClick = useCallback(
    (userId: string) => {
      router.push(`/admin/users/${userId}`);
    },
    [router]
  );

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // 错误状态
  if (error || !alert) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-2xl p-8 text-center',
          'bg-white/60 dark:bg-gray-900/60',
          'backdrop-blur-xl border border-white/20 dark:border-gray-700/30'
        )}
      >
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          告警不存在
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          该告警可能已被删除或您没有访问权限
        </p>
        <button
          onClick={handleBack}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium',
            'bg-indigo-500 text-white hover:bg-indigo-600',
            'transition-colors'
          )}
        >
          返回告警列表
        </button>
      </motion.div>
    );
  }

  const isUpdating =
    updateStatusMutation.isPending ||
    assignMutation.isPending ||
    executePunishmentMutation.isPending;

  const isProcessing =
    updateStatusMutation.isPending ||
    assignMutation.isPending ||
    executePunishmentMutation.isPending ||
    addNoteMutation.isPending;

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <AlertDetailHeader alert={alert} onBack={handleBack}>
        {/* 处理按钮 */}
        <button
          onClick={() => setShowProcessingModal(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
            'bg-indigo-500 text-white hover:bg-indigo-600',
            'transition-colors'
          )}
        >
          <Settings className="w-4 h-4" />
          处理告警
        </button>
      </AlertDetailHeader>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：数据和用户 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 告警数据 */}
          <AlertDataView data={alert.data} />

          {/* 受影响用户 */}
          <AffectedUsersList
            userIds={alert.affectedUserIds}
            onUserClick={handleUserClick}
          />

          {/* 备注 */}
          <AlertNotes
            notes={alert.notes}
            onAddNote={handleAddNote}
            isSubmitting={addNoteMutation.isPending}
          />
        </div>

        {/* 右侧：操作和时间线 */}
        <div className="space-y-6">
          {/* 操作按钮 */}
          <AlertActions
            alert={alert}
            onUpdateStatus={handleUpdateStatus}
            onAssign={handleAssign}
            onExecutePunishment={handleExecutePunishment}
            isUpdating={isUpdating}
          />

          {/* 状态变更时间线 */}
          <AlertTimeline
            statusHistory={alert.statusHistory || []}
            createdAt={alert.createdAt}
          />
        </div>
      </div>

      {/* 处理模态框 */}
      <AlertProcessingModal
        alert={alert}
        affectedUsers={alert.affectedUsers}
        isOpen={showProcessingModal}
        onClose={() => setShowProcessingModal(false)}
        onProcess={handleProcess}
        isProcessing={isProcessing}
      />
    </div>
  );
}
