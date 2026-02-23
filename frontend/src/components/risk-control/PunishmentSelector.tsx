'use client';

import { cn } from '@/utils/cn';
import {
  AlertTriangle,
  MessageSquareOff,
  Lock,
  Snowflake,
  Ban,
  User,
} from 'lucide-react';
import {
  PunishmentType,
  PUNISHMENT_TYPE_LABELS,
  PUNISHMENT_DURATION_LABELS,
  PUNISHMENT_DURATION_PRESETS,
} from '@/types/risk-control';
import type { AffectedUser } from '@/types/risk-control';

/**
 * 惩罚选择器组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.3: 处理操作界面 - 惩罚选择
 *
 * 功能:
 * - 惩罚类型选择（警告、禁言、功能限制、账户冻结、账户封禁）
 * - 时长选择（针对非永久惩罚）
 * - 原因输入
 * - 受影响用户预览
 */

// 惩罚类型配置
const PUNISHMENT_TYPE_CONFIG: {
  type: PunishmentType;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  hasDuration: boolean;
}[] = [
  {
    type: PunishmentType.WARNING,
    icon: AlertTriangle,
    color: 'yellow',
    description: '记录警告，不限制用户功能',
    hasDuration: false,
  },
  {
    type: PunishmentType.MUTE,
    icon: MessageSquareOff,
    color: 'orange',
    description: '限制发言、评论、弹幕功能',
    hasDuration: true,
  },
  {
    type: PunishmentType.FEATURE_RESTRICT,
    icon: Lock,
    color: 'purple',
    description: '限制特定功能（如打赏、发布）',
    hasDuration: true,
  },
  {
    type: PunishmentType.ACCOUNT_FREEZE,
    icon: Snowflake,
    color: 'blue',
    description: '暂停账户所有活动',
    hasDuration: true,
  },
  {
    type: PunishmentType.ACCOUNT_BAN,
    icon: Ban,
    color: 'red',
    description: '永久封禁账户',
    hasDuration: false,
  },
];

// 时长选项
const DURATION_OPTIONS = [
  { value: PUNISHMENT_DURATION_PRESETS.MUTE_1_HOUR, label: '1 小时' },
  { value: PUNISHMENT_DURATION_PRESETS.MUTE_6_HOURS, label: '6 小时' },
  { value: PUNISHMENT_DURATION_PRESETS.MUTE_1_DAY, label: '1 天' },
  { value: PUNISHMENT_DURATION_PRESETS.MUTE_3_DAYS, label: '3 天' },
  { value: PUNISHMENT_DURATION_PRESETS.MUTE_7_DAYS, label: '7 天' },
  { value: PUNISHMENT_DURATION_PRESETS.MUTE_30_DAYS, label: '30 天' },
];

interface PunishmentSelectorProps {
  type: PunishmentType;
  duration: number;
  reason: string;
  affectedUsers?: AffectedUser[];
  affectedUserIds: string[];
  onTypeChange: (type: PunishmentType) => void;
  onDurationChange: (duration: number) => void;
  onReasonChange: (reason: string) => void;
}

export function PunishmentSelector({
  type,
  duration,
  reason,
  affectedUsers = [],
  affectedUserIds,
  onTypeChange,
  onDurationChange,
  onReasonChange,
}: PunishmentSelectorProps) {
  const currentConfig = PUNISHMENT_TYPE_CONFIG.find((c) => c.type === type);

  return (
    <div className="space-y-6">
      {/* 受影响用户预览 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          受影响用户 ({affectedUserIds.length})
        </label>
        <div
          className={cn(
            'rounded-xl border border-gray-200 dark:border-gray-700',
            'bg-gray-50 dark:bg-gray-800/50',
            'max-h-32 overflow-y-auto'
          )}
        >
          {affectedUsers.length > 0 ? (
            <div className="p-3 space-y-2">
              {affectedUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  )}
                  <span className="text-sm text-gray-900 dark:text-white">
                    {user.displayName || user.username}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    @{user.username}
                  </span>
                </div>
              ))}
              {affectedUsers.length > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                  还有 {affectedUsers.length - 5} 个用户...
                </p>
              )}
            </div>
          ) : (
            <div className="p-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {affectedUserIds.length} 个用户 ID
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {affectedUserIds.slice(0, 3).map((id) => (
                  <span
                    key={id}
                    className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  >
                    {id.slice(0, 8)}...
                  </span>
                ))}
                {affectedUserIds.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{affectedUserIds.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 惩罚类型选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          惩罚类型 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PUNISHMENT_TYPE_CONFIG.map((config) => {
            const Icon = config.icon;
            const isSelected = type === config.type;

            return (
              <button
                key={config.type}
                onClick={() => onTypeChange(config.type)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl text-left transition-all',
                  'border',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <div
                  className={cn(
                    'p-1.5 rounded-lg flex-shrink-0',
                    config.color === 'yellow' && 'bg-yellow-100 dark:bg-yellow-900/30',
                    config.color === 'orange' && 'bg-orange-100 dark:bg-orange-900/30',
                    config.color === 'purple' && 'bg-purple-100 dark:bg-purple-900/30',
                    config.color === 'blue' && 'bg-blue-100 dark:bg-blue-900/30',
                    config.color === 'red' && 'bg-red-100 dark:bg-red-900/30'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4',
                      config.color === 'yellow' && 'text-yellow-600 dark:text-yellow-400',
                      config.color === 'orange' && 'text-orange-600 dark:text-orange-400',
                      config.color === 'purple' && 'text-purple-600 dark:text-purple-400',
                      config.color === 'blue' && 'text-blue-600 dark:text-blue-400',
                      config.color === 'red' && 'text-red-600 dark:text-red-400'
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'text-sm font-medium',
                      isSelected
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-900 dark:text-white'
                    )}
                  >
                    {PUNISHMENT_TYPE_LABELS[config.type]}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {config.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 时长选择（仅对有时长的惩罚类型显示） */}
      {currentConfig?.hasDuration && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            惩罚时长 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onDurationChange(option.value)}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  duration === option.value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 惩罚原因 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          惩罚原因 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="请输入惩罚原因，将显示给被惩罚用户..."
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
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          此原因将记录在惩罚记录中，并可能显示给被惩罚用户
        </p>
      </div>

      {/* 惩罚预览 */}
      {type === PunishmentType.ACCOUNT_BAN && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">永久封禁警告</p>
            <p className="mt-1">
              账户封禁是最严重的惩罚措施，将永久禁止用户访问平台。请确保已充分调查并确认违规行为。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
