'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  MessageSquare,
  Gavel,
  Loader2,
  ChevronRight,
  User,
  Clock,
  Shield,
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
import type { RiskAlert, AffectedUser } from '@/types/risk-control';
import { PunishmentSelector } from './PunishmentSelector';

/**
 * 告警处理模态框
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.3: 处理操作界面
 *
 * 功能:
 * - 告警摘要显示
 * - 处理操作选择（忽略、升级、执行惩罚、请求更多信息、标记已解决）
 * - 原因/备注输入
 * - 确认工作流
 * - 惩罚选择（类型、时长、原因）
 * - 受影响用户预览
 */

// 处理操作类型
export type ProcessingAction =
  | 'dismiss' // 忽略（误报）
  | 'escalate' // 升级到更高级别
  | 'apply_punishment' // 执行惩罚
  | 'request_info' // 请求更多信息
  | 'resolve'; // 标记已解决

// 处理操作配置
const PROCESSING_ACTIONS: {
  action: ProcessingAction;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  targetStatus?: AlertStatus;
}[] = [
  {
    action: 'dismiss',
    label: '忽略告警',
    description: '将此告警标记为误报或无需处理',
    icon: XCircle,
    color: 'gray',
    targetStatus: AlertStatus.DISMISSED,
  },
  {
    action: 'escalate',
    label: '升级处理',
    description: '将此告警升级到更高级别管理员处理',
    icon: ArrowUpCircle,
    color: 'orange',
    targetStatus: AlertStatus.INVESTIGATING,
  },
  {
    action: 'apply_punishment',
    label: '执行惩罚',
    description: '对受影响用户执行惩罚措施',
    icon: Gavel,
    color: 'red',
  },
  {
    action: 'request_info',
    label: '请求更多信息',
    description: '需要更多信息才能做出决定',
    icon: MessageSquare,
    color: 'blue',
    targetStatus: AlertStatus.INVESTIGATING,
  },
  {
    action: 'resolve',
    label: '标记已解决',
    description: '此告警已处理完成',
    icon: CheckCircle,
    color: 'green',
    targetStatus: AlertStatus.RESOLVED,
  },
];

interface AlertProcessingModalProps {
  alert: RiskAlert;
  affectedUsers?: AffectedUser[];
  isOpen: boolean;
  onClose: () => void;
  onProcess: (params: {
    action: ProcessingAction;
    note?: string;
    punishment?: {
      type: PunishmentType;
      durationMinutes?: number;
      reason: string;
    };
    escalateTo?: string;
  }) => Promise<void>;
  isProcessing?: boolean;
}

export function AlertProcessingModal({
  alert,
  affectedUsers = [],
  isOpen,
  onClose,
  onProcess,
  isProcessing = false,
}: AlertProcessingModalProps) {
  // 当前步骤：select（选择操作）、configure（配置详情）、confirm（确认）
  const [step, setStep] = useState<'select' | 'configure' | 'confirm'>('select');
  const [selectedAction, setSelectedAction] = useState<ProcessingAction | null>(null);
  const [note, setNote] = useState('');
  const [escalateTo, setEscalateTo] = useState('');
  
  // 惩罚配置
  const [punishmentType, setPunishmentType] = useState<PunishmentType>(PunishmentType.WARNING);
  const [punishmentDuration, setPunishmentDuration] = useState<number>(
    PUNISHMENT_DURATION_PRESETS.MUTE_1_DAY
  );
  const [punishmentReason, setPunishmentReason] = useState('');

  // 重置状态
  const resetState = useCallback(() => {
    setStep('select');
    setSelectedAction(null);
    setNote('');
    setEscalateTo('');
    setPunishmentType(PunishmentType.WARNING);
    setPunishmentDuration(PUNISHMENT_DURATION_PRESETS.MUTE_1_DAY);
    setPunishmentReason('');
  }, []);

  // 关闭时重置
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // 选择操作
  const handleSelectAction = useCallback((action: ProcessingAction) => {
    setSelectedAction(action);
    setStep('configure');
  }, []);

  // 返回上一步
  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('configure');
    } else if (step === 'configure') {
      setStep('select');
      setSelectedAction(null);
    }
  }, [step]);

  // 进入确认步骤
  const handleProceedToConfirm = useCallback(() => {
    // 验证必填项
    if (selectedAction === 'apply_punishment' && !punishmentReason.trim()) {
      return;
    }
    if (selectedAction === 'escalate' && !escalateTo.trim()) {
      return;
    }
    setStep('confirm');
  }, [selectedAction, punishmentReason, escalateTo]);

  // 执行处理
  const handleConfirm = useCallback(async () => {
    if (!selectedAction) return;

    await onProcess({
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
      escalateTo: selectedAction === 'escalate' ? escalateTo : undefined,
    });

    handleClose();
  }, [
    selectedAction,
    note,
    punishmentType,
    punishmentDuration,
    punishmentReason,
    escalateTo,
    onProcess,
    handleClose,
  ]);

  // 获取当前操作配置
  const currentActionConfig = selectedAction
    ? PROCESSING_ACTIONS.find((a) => a.action === selectedAction)
    : null;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* 背景遮罩 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* 模态框内容 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn(
            'relative w-full max-w-2xl max-h-[90vh] overflow-hidden',
            'rounded-2xl bg-white dark:bg-gray-900 shadow-xl',
            'flex flex-col'
          )}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2 rounded-xl',
                  alert.severity === AlertSeverity.CRITICAL &&
                    'bg-red-100 dark:bg-red-900/30',
                  alert.severity === AlertSeverity.HIGH &&
                    'bg-orange-100 dark:bg-orange-900/30',
                  alert.severity === AlertSeverity.MEDIUM &&
                    'bg-yellow-100 dark:bg-yellow-900/30',
                  alert.severity === AlertSeverity.LOW &&
                    'bg-blue-100 dark:bg-blue-900/30'
                )}
              >
                <Shield
                  className={cn(
                    'w-5 h-5',
                    alert.severity === AlertSeverity.CRITICAL && 'text-red-600 dark:text-red-400',
                    alert.severity === AlertSeverity.HIGH && 'text-orange-600 dark:text-orange-400',
                    alert.severity === AlertSeverity.MEDIUM && 'text-yellow-600 dark:text-yellow-400',
                    alert.severity === AlertSeverity.LOW && 'text-blue-600 dark:text-blue-400'
                  )}
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  处理告警
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {ALERT_TYPE_LABELS[alert.type]} · {ALERT_SEVERITY_LABELS[alert.severity]}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className={cn(
                'p-2 rounded-xl',
                'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                'dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800',
                'transition-colors'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 告警摘要 */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              {alert.title}
            </h3>
            {alert.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {alert.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {alert.affectedUserIds.length} 个受影响用户
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(alert.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {/* 步骤1：选择操作 */}
              {step === 'select' && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    选择要执行的处理操作：
                  </p>
                  {PROCESSING_ACTIONS.map((actionConfig) => {
                    const Icon = actionConfig.icon;
                    const isDisabled =
                      actionConfig.action === 'apply_punishment' &&
                      alert.affectedUserIds.length === 0;

                    return (
                      <button
                        key={actionConfig.action}
                        onClick={() => handleSelectAction(actionConfig.action)}
                        disabled={isDisabled}
                        className={cn(
                          'w-full flex items-center gap-4 p-4 rounded-xl',
                          'border border-gray-200 dark:border-gray-700',
                          'hover:border-indigo-300 hover:bg-indigo-50/50',
                          'dark:hover:border-indigo-600 dark:hover:bg-indigo-900/20',
                          'transition-all text-left',
                          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent'
                        )}
                      >
                        <div
                          className={cn(
                            'p-2.5 rounded-xl',
                            actionConfig.color === 'gray' && 'bg-gray-100 dark:bg-gray-800',
                            actionConfig.color === 'orange' && 'bg-orange-100 dark:bg-orange-900/30',
                            actionConfig.color === 'red' && 'bg-red-100 dark:bg-red-900/30',
                            actionConfig.color === 'blue' && 'bg-blue-100 dark:bg-blue-900/30',
                            actionConfig.color === 'green' && 'bg-green-100 dark:bg-green-900/30'
                          )}
                        >
                          <Icon
                            className={cn(
                              'w-5 h-5',
                              actionConfig.color === 'gray' && 'text-gray-600 dark:text-gray-400',
                              actionConfig.color === 'orange' && 'text-orange-600 dark:text-orange-400',
                              actionConfig.color === 'red' && 'text-red-600 dark:text-red-400',
                              actionConfig.color === 'blue' && 'text-blue-600 dark:text-blue-400',
                              actionConfig.color === 'green' && 'text-green-600 dark:text-green-400'
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {actionConfig.label}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {actionConfig.description}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {/* 步骤2：配置详情 */}
              {step === 'configure' && selectedAction && (
                <motion.div
                  key="configure"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* 惩罚配置 */}
                  {selectedAction === 'apply_punishment' && (
                    <PunishmentSelector
                      type={punishmentType}
                      duration={punishmentDuration}
                      reason={punishmentReason}
                      affectedUsers={affectedUsers}
                      affectedUserIds={alert.affectedUserIds}
                      onTypeChange={setPunishmentType}
                      onDurationChange={setPunishmentDuration}
                      onReasonChange={setPunishmentReason}
                    />
                  )}

                  {/* 升级配置 */}
                  {selectedAction === 'escalate' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          升级到 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={escalateTo}
                          onChange={(e) => setEscalateTo(e.target.value)}
                          placeholder="输入高级管理员 ID 或选择..."
                          className={cn(
                            'w-full px-4 py-3 rounded-xl text-sm',
                            'bg-gray-100 dark:bg-gray-800',
                            'border border-transparent',
                            'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
                            'text-gray-900 dark:text-white',
                            'placeholder-gray-400 dark:placeholder-gray-500'
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* 通用备注输入 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      处理备注 {selectedAction !== 'apply_punishment' && '（可选）'}
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="添加处理备注..."
                      rows={3}
                      className={cn(
                        'w-full px-4 py-3 rounded-xl text-sm',
                        'bg-gray-100 dark:bg-gray-800',
                        'border border-transparent',
                        'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
                        'text-gray-900 dark:text-white',
                        'placeholder-gray-400 dark:placeholder-gray-500',
                        'resize-none'
                      )}
                    />
                  </div>
                </motion.div>
              )}

              {/* 步骤3：确认 */}
              {step === 'confirm' && selectedAction && currentActionConfig && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* 确认提示 */}
                  <div
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-xl',
                      selectedAction === 'apply_punishment'
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : 'bg-indigo-50 dark:bg-indigo-900/20'
                    )}
                  >
                    <AlertTriangle
                      className={cn(
                        'w-5 h-5 flex-shrink-0 mt-0.5',
                        selectedAction === 'apply_punishment'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-indigo-600 dark:text-indigo-400'
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          'font-medium',
                          selectedAction === 'apply_punishment'
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-indigo-700 dark:text-indigo-300'
                        )}
                      >
                        确认执行此操作？
                      </p>
                      <p
                        className={cn(
                          'text-sm mt-1',
                          selectedAction === 'apply_punishment'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-indigo-600 dark:text-indigo-400'
                        )}
                      >
                        {selectedAction === 'apply_punishment'
                          ? `将对 ${alert.affectedUserIds.length} 个用户执行「${PUNISHMENT_TYPE_LABELS[punishmentType]}」惩罚`
                          : `将${currentActionConfig.label}`}
                      </p>
                    </div>
                  </div>

                  {/* 操作摘要 */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      操作摘要
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">操作类型</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {currentActionConfig.label}
                        </span>
                      </div>
                      {selectedAction === 'apply_punishment' && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">惩罚类型</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {PUNISHMENT_TYPE_LABELS[punishmentType]}
                            </span>
                          </div>
                          {punishmentType !== PunishmentType.WARNING &&
                            punishmentType !== PunishmentType.ACCOUNT_BAN && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">惩罚时长</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {PUNISHMENT_DURATION_LABELS[punishmentDuration]}
                                </span>
                              </div>
                            )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">受影响用户</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {alert.affectedUserIds.length} 人
                            </span>
                          </div>
                        </>
                      )}
                      {selectedAction === 'escalate' && escalateTo && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">升级到</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {escalateTo}
                          </span>
                        </div>
                      )}
                      {note && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-sm text-gray-500 dark:text-gray-400">备注：</span>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">{note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 底部操作栏 */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {step !== 'select' ? (
              <button
                onClick={handleBack}
                disabled={isProcessing}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium',
                  'text-gray-700 hover:bg-gray-200',
                  'dark:text-gray-300 dark:hover:bg-gray-700',
                  'transition-colors disabled:opacity-50'
                )}
              >
                返回
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={isProcessing}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium',
                  'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  'dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                  'transition-colors disabled:opacity-50'
                )}
              >
                取消
              </button>

              {step === 'configure' && (
                <button
                  onClick={handleProceedToConfirm}
                  disabled={
                    isProcessing ||
                    (selectedAction === 'apply_punishment' && !punishmentReason.trim()) ||
                    (selectedAction === 'escalate' && !escalateTo.trim())
                  }
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium',
                    'bg-indigo-500 text-white hover:bg-indigo-600',
                    'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  下一步
                </button>
              )}

              {step === 'confirm' && (
                <button
                  onClick={handleConfirm}
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
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
