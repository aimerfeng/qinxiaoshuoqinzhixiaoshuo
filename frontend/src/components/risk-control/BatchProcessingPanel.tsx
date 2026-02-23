'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Square,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gavel,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  AlertStatus,
  AlertSeverity,
  PunishmentType,
  ALERT_STATUS_LABELS,
  ALERT_SEVERITY_LABELS,
  ALERT_TYPE_LABELS,
  PUNISHMENT_TYPE_LABELS,
  PUNISHMENT_DURATION_LABELS,
  PUNISHMENT_DURATION_PRESETS,
} from '@/types/risk-control';
import type { RiskAlert } from '@/types/risk-control';

/**
 * 批量处理面板组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.3: 处理操作界面 - 批量处理
 *
 * 功能:
 * - 选择多个告警
 * - 对所有选中告警执行相同操作
 * - 批量忽略、批量解决、批量执行惩罚
 */

// 批量操作类型
type BatchAction = 'dismiss' | 'resolve' | 'investigate' | 'apply_punishment';

// 批量操作配置
const BATCH_ACTIONS: {
  action: BatchAction;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  targetStatus?: AlertStatus;
}[] = [
  {
    action: 'investigate',
    label: '标记调查中',
    icon: AlertTriangle,
    color: 'purple',
    targetStatus: AlertStatus.INVESTIGATING,
  },
  {
    action: 'resolve',
    label: '批量解决',
    icon: CheckCircle,
    color: 'green',
    targetStatus: AlertStatus.RESOLVED,
  },
  {
    action: 'dismiss',
    label: '批量忽略',
    icon: XCircle,
    color: 'gray',
    targetStatus: AlertStatus.DISMISSED,
  },
  {
    action: 'apply_punishment',
    label: '批量惩罚',
    icon: Gavel,
    color: 'red',
  },
];

interface BatchProcessingPanelProps {
  alerts: RiskAlert[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBatchProcess: (params: {
    alertIds: string[];
    action: BatchAction;
    note?: string;
    punishment?: {
      type: PunishmentType;
      durationMinutes?: number;
      reason: string;
    };
  }) => Promise<void>;
  isProcessing?: boolean;
}

export function BatchProcessingPanel({
  alerts,
  selectedIds,
  onSelectionChange,
  onBatchProcess,
  isProcessing = false,
}: BatchProcessingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAction, setSelectedAction] = useState<BatchAction | null>(null);
  const [note, setNote] = useState('');
  const [punishmentType, setPunishmentType] = useState<PunishmentType>(PunishmentType.WARNING);
  const [punishmentDuration, setPunishmentDuration] = useState<number>(
    PUNISHMENT_DURATION_PRESETS.MUTE_1_DAY
  );
  const [punishmentReason, setPunishmentReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // 计算选中告警的统计信息
  const selectionStats = useMemo(() => {
    const selectedAlerts = alerts.filter((a) => selectedIds.includes(a.id));
    const totalAffectedUsers = new Set(
      selectedAlerts.flatMap((a) => a.affectedUserIds)
    ).size;

    return {
      count: selectedAlerts.length,
      totalAffectedUsers,
      bySeverity: {
        critical: selectedAlerts.filter((a) => a.severity === AlertSeverity.CRITICAL).length,
        high: selectedAlerts.filter((a) => a.severity === AlertSeverity.HIGH).length,
        medium: selectedAlerts.filter((a) => a.severity === AlertSeverity.MEDIUM).length,
        low: selectedAlerts.filter((a) => a.severity === AlertSeverity.LOW).length,
      },
    };
  }, [alerts, selectedIds]);

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === alerts.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(alerts.map((a) => a.id));
    }
  }, [alerts, selectedIds, onSelectionChange]);

  // 清除选择
  const handleClearSelection = useCallback(() => {
    onSelectionChange([]);
    setSelectedAction(null);
    setNote('');
    setPunishmentReason('');
    setShowConfirm(false);
  }, [onSelectionChange]);

  // 执行批量操作
  const handleExecute = useCallback(async () => {
    if (!selectedAction || selectedIds.length === 0) return;

    await onBatchProcess({
      alertIds: selectedIds,
      action: selectedAction,
      note: note.trim() || undefined,
      punishment:
        selectedAction === 'apply_punishment'
          ? {
              type: punishmentType,
              durationMinutes:
                punishmentType === PunishmentType.WARNING ||
                punishmentType === PunishmentType.ACCOUNT_BAN
                  ? undefined
                  : punishmentDuration,
              reason: punishmentReason,
            }
          : undefined,
    });

    handleClearSelection();
  }, [
    selectedAction,
    selectedIds,
    note,
    punishmentType,
    punishmentDuration,
    punishmentReason,
    onBatchProcess,
    handleClearSelection,
  ]);

  // 如果没有选中任何告警，不显示面板
  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
        'w-full max-w-2xl mx-auto px-4'
      )}
    >
      <div
        className={cn(
          'rounded-2xl shadow-2xl',
          'bg-white dark:bg-gray-900',
          'border border-gray-200 dark:border-gray-700',
          'overflow-hidden'
        )}
      >
        {/* 头部 - 始终显示 */}
        <div
          className={cn(
            'flex items-center justify-between p-4',
            'bg-indigo-50 dark:bg-indigo-900/20',
            'border-b border-indigo-100 dark:border-indigo-800/30'
          )}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-800/30 transition-colors"
            >
              {selectedIds.length === alerts.length ? (
                <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Square className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </button>
            <div>
              <span className="font-medium text-indigo-700 dark:text-indigo-300">
                已选择 {selectionStats.count} 个告警
              </span>
              <span className="text-sm text-indigo-600 dark:text-indigo-400 ml-2">
                ({selectionStats.totalAffectedUsers} 个受影响用户)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'p-2 rounded-xl',
                'text-indigo-600 hover:bg-indigo-100',
                'dark:text-indigo-400 dark:hover:bg-indigo-800/30',
                'transition-colors'
              )}
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleClearSelection}
              className={cn(
                'p-2 rounded-xl',
                'text-gray-500 hover:bg-gray-100',
                'dark:text-gray-400 dark:hover:bg-gray-800',
                'transition-colors'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 展开内容 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* 选中告警统计 */}
                <div className="flex items-center gap-4 text-sm">
                  {selectionStats.bySeverity.critical > 0 && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {selectionStats.bySeverity.critical} 紧急
                    </span>
                  )}
                  {selectionStats.bySeverity.high > 0 && (
                    <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      {selectionStats.bySeverity.high} 高
                    </span>
                  )}
                  {selectionStats.bySeverity.medium > 0 && (
                    <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      {selectionStats.bySeverity.medium} 中
                    </span>
                  )}
                  {selectionStats.bySeverity.low > 0 && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {selectionStats.bySeverity.low} 低
                    </span>
                  )}
                </div>

                {/* 操作选择 */}
                {!showConfirm ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        选择批量操作
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {BATCH_ACTIONS.map((actionConfig) => {
                          const Icon = actionConfig.icon;
                          const isSelected = selectedAction === actionConfig.action;
                          const isDisabled =
                            actionConfig.action === 'apply_punishment' &&
                            selectionStats.totalAffectedUsers === 0;

                          return (
                            <button
                              key={actionConfig.action}
                              onClick={() => setSelectedAction(actionConfig.action)}
                              disabled={isDisabled}
                              className={cn(
                                'flex flex-col items-center gap-1.5 p-3 rounded-xl text-sm transition-all',
                                'border',
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                                'disabled:opacity-50 disabled:cursor-not-allowed'
                              )}
                            >
                              <Icon
                                className={cn(
                                  'w-5 h-5',
                                  actionConfig.color === 'gray' && 'text-gray-500',
                                  actionConfig.color === 'purple' && 'text-purple-500',
                                  actionConfig.color === 'green' && 'text-green-500',
                                  actionConfig.color === 'red' && 'text-red-500'
                                )}
                              />
                              <span
                                className={cn(
                                  'font-medium',
                                  isSelected
                                    ? 'text-indigo-700 dark:text-indigo-300'
                                    : 'text-gray-700 dark:text-gray-300'
                                )}
                              >
                                {actionConfig.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 惩罚配置（仅在选择批量惩罚时显示） */}
                    {selectedAction === 'apply_punishment' && (
                      <div className="space-y-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                        <div className="flex items-start gap-2 text-red-700 dark:text-red-400">
                          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium">批量惩罚警告</p>
                            <p>
                              将对 {selectionStats.totalAffectedUsers} 个用户执行惩罚
                            </p>
                          </div>
                        </div>

                        {/* 惩罚类型 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            惩罚类型
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.values(PunishmentType).map((type) => (
                              <button
                                key={type}
                                onClick={() => setPunishmentType(type)}
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                  punishmentType === type
                                    ? 'bg-red-500 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                )}
                              >
                                {PUNISHMENT_TYPE_LABELS[type]}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 惩罚时长 */}
                        {punishmentType !== PunishmentType.WARNING &&
                          punishmentType !== PunishmentType.ACCOUNT_BAN && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                惩罚时长
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                {[60, 1440, 4320, 10080, 43200].map((duration) => (
                                  <button
                                    key={duration}
                                    onClick={() => setPunishmentDuration(duration)}
                                    className={cn(
                                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                      punishmentDuration === duration
                                        ? 'bg-red-500 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                    )}
                                  >
                                    {PUNISHMENT_DURATION_LABELS[duration]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* 惩罚原因 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            惩罚原因 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={punishmentReason}
                            onChange={(e) => setPunishmentReason(e.target.value)}
                            placeholder="输入惩罚原因..."
                            className={cn(
                              'w-full px-3 py-2 rounded-lg text-sm',
                              'bg-white dark:bg-gray-800',
                              'border border-gray-200 dark:border-gray-700',
                              'focus:border-red-500 focus:ring-1 focus:ring-red-500',
                              'text-gray-900 dark:text-white',
                              'placeholder-gray-400 dark:placeholder-gray-500'
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {/* 备注输入 */}
                    {selectedAction && selectedAction !== 'apply_punishment' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          处理备注（可选）
                        </label>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="添加处理备注..."
                          className={cn(
                            'w-full px-3 py-2 rounded-lg text-sm',
                            'bg-gray-100 dark:bg-gray-800',
                            'border border-transparent',
                            'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
                            'text-gray-900 dark:text-white',
                            'placeholder-gray-400 dark:placeholder-gray-500'
                          )}
                        />
                      </div>
                    )}

                    {/* 执行按钮 */}
                    {selectedAction && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setShowConfirm(true)}
                          disabled={
                            selectedAction === 'apply_punishment' && !punishmentReason.trim()
                          }
                          className={cn(
                            'px-4 py-2 rounded-xl text-sm font-medium',
                            selectedAction === 'apply_punishment'
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-indigo-500 text-white hover:bg-indigo-600',
                            'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                          )}
                        >
                          确认操作
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* 确认界面 */
                  <div className="space-y-4">
                    <div
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-xl',
                        selectedAction === 'apply_punishment'
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : 'bg-yellow-50 dark:bg-yellow-900/20'
                      )}
                    >
                      <AlertTriangle
                        className={cn(
                          'w-5 h-5 flex-shrink-0 mt-0.5',
                          selectedAction === 'apply_punishment'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        )}
                      />
                      <div>
                        <p
                          className={cn(
                            'font-medium',
                            selectedAction === 'apply_punishment'
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-yellow-700 dark:text-yellow-300'
                          )}
                        >
                          确认批量操作？
                        </p>
                        <p
                          className={cn(
                            'text-sm mt-1',
                            selectedAction === 'apply_punishment'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                          )}
                        >
                          将对 {selectionStats.count} 个告警执行
                          {selectedAction === 'apply_punishment'
                            ? `「${PUNISHMENT_TYPE_LABELS[punishmentType]}」惩罚（影响 ${selectionStats.totalAffectedUsers} 个用户）`
                            : `「${BATCH_ACTIONS.find((a) => a.action === selectedAction)?.label}」操作`}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowConfirm(false)}
                        disabled={isProcessing}
                        className={cn(
                          'px-4 py-2 rounded-xl text-sm font-medium',
                          'bg-gray-100 text-gray-700 hover:bg-gray-200',
                          'dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                          'transition-colors disabled:opacity-50'
                        )}
                      >
                        返回
                      </button>
                      <button
                        onClick={handleExecute}
                        disabled={isProcessing}
                        className={cn(
                          'px-4 py-2 rounded-xl text-sm font-medium',
                          'flex items-center gap-2',
                          selectedAction === 'apply_punishment'
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-indigo-500 text-white hover:bg-indigo-600',
                          'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                        确认执行
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 快捷操作栏（折叠时显示） */}
        {!isExpanded && (
          <div className="flex items-center gap-2 p-3 border-t border-gray-100 dark:border-gray-800">
            {BATCH_ACTIONS.slice(0, 3).map((actionConfig) => {
              const Icon = actionConfig.icon;
              return (
                <button
                  key={actionConfig.action}
                  onClick={() => {
                    setSelectedAction(actionConfig.action);
                    setIsExpanded(true);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                    'transition-colors',
                    actionConfig.color === 'gray' &&
                      'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                    actionConfig.color === 'purple' &&
                      'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50',
                    actionConfig.color === 'green' &&
                      'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {actionConfig.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
