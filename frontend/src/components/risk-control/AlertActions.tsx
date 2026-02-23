'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  CheckCircle,
  XCircle,
  UserPlus,
  Gavel,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  AlertStatus,
  ALERT_STATUS_LABELS,
  PunishmentType,
  PUNISHMENT_TYPE_LABELS,
  PUNISHMENT_DURATION_LABELS,
  PUNISHMENT_DURATION_PRESETS,
} from '@/types/risk-control';
import type { RiskAlert } from '@/types/risk-control';

/**
 * 告警操作组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.2: 告警详情页面 - 操作组件
 *
 * 提供状态更新、分配、执行惩罚等操作
 */
interface AlertActionsProps {
  alert: RiskAlert;
  onUpdateStatus: (status: AlertStatus, note?: string) => Promise<void>;
  onAssign: (adminId: string) => Promise<void>;
  onExecutePunishment: (
    type: PunishmentType,
    durationMinutes?: number
  ) => Promise<void>;
  isUpdating?: boolean;
  className?: string;
}

export function AlertActions({
  alert,
  onUpdateStatus,
  onAssign,
  onExecutePunishment,
  isUpdating = false,
  className,
}: AlertActionsProps) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPunishmentModal, setShowPunishmentModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AlertStatus | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [punishmentType, setPunishmentType] = useState<PunishmentType>(
    PunishmentType.WARNING
  );
  const [punishmentDuration, setPunishmentDuration] = useState<number>(
    PUNISHMENT_DURATION_PRESETS.MUTE_1_DAY
  );

  // 获取可用的状态转换
  const getAvailableStatuses = () => {
    switch (alert.status) {
      case AlertStatus.PENDING:
        return [AlertStatus.INVESTIGATING, AlertStatus.DISMISSED];
      case AlertStatus.INVESTIGATING:
        return [AlertStatus.RESOLVED, AlertStatus.DISMISSED];
      case AlertStatus.RESOLVED:
      case AlertStatus.DISMISSED:
        return [AlertStatus.INVESTIGATING]; // 允许重新打开
      default:
        return [];
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus) return;
    await onUpdateStatus(selectedStatus, statusNote || undefined);
    setShowStatusModal(false);
    setSelectedStatus(null);
    setStatusNote('');
  };

  const handleAssign = async () => {
    if (!assigneeId.trim()) return;
    await onAssign(assigneeId.trim());
    setShowAssignModal(false);
    setAssigneeId('');
  };

  const handleExecutePunishment = async () => {
    const duration =
      punishmentType === PunishmentType.WARNING ||
      punishmentType === PunishmentType.ACCOUNT_BAN
        ? undefined
        : punishmentDuration;
    await onExecutePunishment(punishmentType, duration);
    setShowPunishmentModal(false);
    setPunishmentType(PunishmentType.WARNING);
    setPunishmentDuration(PUNISHMENT_DURATION_PRESETS.MUTE_1_DAY);
  };

  const availableStatuses = getAvailableStatuses();
  const canExecutePunishment =
    alert.affectedUserIds.length > 0 &&
    (alert.status === AlertStatus.INVESTIGATING ||
      alert.status === AlertStatus.RESOLVED);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={cn(
          'rounded-2xl p-4',
          'bg-white/60 dark:bg-gray-900/60',
          'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
          className
        )}
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">操作</h3>

        <div className="space-y-3">
          {/* 状态更新按钮 */}
          {availableStatuses.length > 0 && (
            <div className="space-y-2">
              {availableStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setSelectedStatus(status);
                    setShowStatusModal(true);
                  }}
                  disabled={isUpdating}
                  className={cn(
                    'w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
                    'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    status === AlertStatus.INVESTIGATING &&
                      'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50',
                    status === AlertStatus.RESOLVED &&
                      'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50',
                    status === AlertStatus.DISMISSED &&
                      'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800'
                  )}
                >
                  {status === AlertStatus.INVESTIGATING && <Play className="w-4 h-4" />}
                  {status === AlertStatus.RESOLVED && <CheckCircle className="w-4 h-4" />}
                  {status === AlertStatus.DISMISSED && <XCircle className="w-4 h-4" />}
                  {ALERT_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          )}

          {/* 分配按钮 */}
          <button
            onClick={() => setShowAssignModal(true)}
            disabled={isUpdating}
            className={cn(
              'w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
              'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
              'dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50',
              'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <UserPlus className="w-4 h-4" />
            {alert.assignedTo ? '重新分配' : '分配给管理员'}
          </button>

          {/* 执行惩罚按钮 */}
          {canExecutePunishment && (
            <button
              onClick={() => setShowPunishmentModal(true)}
              disabled={isUpdating}
              className={cn(
                'w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
                'bg-red-100 text-red-700 hover:bg-red-200',
                'dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50',
                'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Gavel className="w-4 h-4" />
              执行惩罚
            </button>
          )}
        </div>
      </motion.div>

      {/* 状态更新模态框 */}
      <AnimatePresence>
        {showStatusModal && selectedStatus && (
          <Modal onClose={() => setShowStatusModal(false)}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              更新状态为 {ALERT_STATUS_LABELS[selectedStatus]}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  备注（可选）
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="添加状态变更备注..."
                  rows={3}
                  className={cn(
                    'w-full px-4 py-2 rounded-xl text-sm',
                    'bg-gray-100 dark:bg-gray-800',
                    'border border-transparent',
                    'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
                    'text-gray-900 dark:text-white',
                    'placeholder-gray-400 dark:placeholder-gray-500'
                  )}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-xl text-sm font-medium',
                    'bg-gray-100 text-gray-700 hover:bg-gray-200',
                    'dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  取消
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-xl text-sm font-medium',
                    'bg-indigo-500 text-white hover:bg-indigo-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                  确认
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* 分配模态框 */}
      <AnimatePresence>
        {showAssignModal && (
          <Modal onClose={() => setShowAssignModal(false)}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              分配告警
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  管理员 ID
                </label>
                <input
                  type="text"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  placeholder="输入管理员 ID..."
                  className={cn(
                    'w-full px-4 py-2 rounded-xl text-sm',
                    'bg-gray-100 dark:bg-gray-800',
                    'border border-transparent',
                    'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
                    'text-gray-900 dark:text-white',
                    'placeholder-gray-400 dark:placeholder-gray-500'
                  )}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-xl text-sm font-medium',
                    'bg-gray-100 text-gray-700 hover:bg-gray-200',
                    'dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  取消
                </button>
                <button
                  onClick={handleAssign}
                  disabled={isUpdating || !assigneeId.trim()}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-xl text-sm font-medium',
                    'bg-indigo-500 text-white hover:bg-indigo-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                  分配
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* 执行惩罚模态框 */}
      <AnimatePresence>
        {showPunishmentModal && (
          <Modal onClose={() => setShowPunishmentModal(false)}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              执行惩罚
            </h3>
            <div className="space-y-4">
              {/* 警告提示 */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">注意</p>
                  <p>
                    此操作将对 {alert.affectedUserIds.length} 个受影响用户执行惩罚。
                  </p>
                </div>
              </div>

              {/* 惩罚类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  惩罚类型
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(PunishmentType).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPunishmentType(type)}
                      className={cn(
                        'px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                        punishmentType === type
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      )}
                    >
                      {PUNISHMENT_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 惩罚时长（非警告和封禁时显示） */}
              {punishmentType !== PunishmentType.WARNING &&
                punishmentType !== PunishmentType.ACCOUNT_BAN && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      惩罚时长
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[60, 360, 1440, 4320, 10080, 43200].map((duration) => (
                        <button
                          key={duration}
                          onClick={() => setPunishmentDuration(duration)}
                          className={cn(
                            'px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                            punishmentDuration === duration
                              ? 'bg-indigo-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                          )}
                        >
                          {PUNISHMENT_DURATION_LABELS[duration]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPunishmentModal(false)}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-xl text-sm font-medium',
                    'bg-gray-100 text-gray-700 hover:bg-gray-200',
                    'dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  取消
                </button>
                <button
                  onClick={handleExecutePunishment}
                  disabled={isUpdating}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-xl text-sm font-medium',
                    'bg-red-500 text-white hover:bg-red-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                  执行惩罚
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * 模态框组件
 */
interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

function Modal({ children, onClose }: ModalProps) {
  return (
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
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* 模态框内容 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={cn(
          'relative w-full max-w-md p-6 rounded-2xl',
          'bg-white dark:bg-gray-900',
          'shadow-xl'
        )}
      >
        <button
          onClick={onClose}
          className={cn(
            'absolute top-4 right-4 p-1 rounded-lg',
            'text-gray-400 hover:text-gray-600',
            'dark:text-gray-500 dark:hover:text-gray-300',
            'transition-colors'
          )}
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}
