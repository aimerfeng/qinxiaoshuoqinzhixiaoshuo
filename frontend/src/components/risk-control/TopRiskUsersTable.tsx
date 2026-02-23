'use client';

import { motion } from 'motion/react';
import { User, AlertTriangle, Gavel, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { TopRiskUser } from '@/types/risk-control';

/**
 * 高风险用户表格组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.4: 风控报告页面 - 高风险用户列表
 */
interface TopRiskUsersTableProps {
  users: TopRiskUser[];
  isLoading?: boolean;
  className?: string;
  onUserClick?: (userId: string) => void;
}

export function TopRiskUsersTable({
  users,
  isLoading,
  className,
  onUserClick,
}: TopRiskUsersTableProps) {
  if (isLoading) {
    return <TopRiskUsersTableSkeleton className={className} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={cn(
        'rounded-xl overflow-hidden',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-500" />
          高风险用户
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          基于告警数量和惩罚记录排序
        </p>
      </div>

      {users.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          暂无高风险用户数据
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  告警数
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  惩罚数
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  风险分
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  最近告警
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user, index) => (
                <motion.tr
                  key={user.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'hover:bg-gray-50/50 dark:hover:bg-gray-800/50',
                    'transition-colors cursor-pointer'
                  )}
                  onClick={() => onUserClick?.(user.userId)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        {/* 风险等级指示器 */}
                        <div
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900',
                            getRiskLevelColor(user.riskScore)
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.alertCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Gavel className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.punishmentCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RiskScoreBadge score={user.riskScore} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {user.lastAlertDate
                        ? formatRelativeTime(user.lastAlertDate)
                        : '-'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

function RiskScoreBadge({ score }: { score: number }) {
  const level = getRiskLevel(score);
  const colors = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        colors[level]
      )}
    >
      {score}
    </span>
  );
}

function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function getRiskLevelColor(score: number): string {
  const level = getRiskLevel(score);
  const colors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-gray-400',
  };
  return colors[level];
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN');
}

function TopRiskUsersTableSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        'animate-pulse',
        className
      )}
    >
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
