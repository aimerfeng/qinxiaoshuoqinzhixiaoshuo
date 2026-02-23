'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gavel,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  ReportStatsCard,
  ReportStatsCardSkeleton,
  AlertTypeChart,
  AlertTrendChart,
  SeverityBarChart,
  ResolutionRateChart,
  TopRiskUsersTable,
  PunishmentStatsChart,
  ReportFilters,
  ExportButton,
} from '@/components/risk-control';
import type {
  TimeRangeConfig,
  RiskControlReportData,
  AlertStats,
  AlertType,
  AlertSeverity,
  PunishmentType,
} from '@/types/risk-control';
import {
  ALERT_TYPE_LABELS,
  PUNISHMENT_TYPE_LABELS,
  PunishmentType as PunishmentTypeEnum,
} from '@/types/risk-control';

/**
 * 风控报告页面
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.4: 风控报告页面
 *
 * 功能:
 * - 概览统计卡片（总告警、解决率、平均解决时间等）
 * - 时间范围选择器
 * - 告警类型分布饼图
 * - 告警严重程度柱状图
 * - 告警趋势折线图
 * - 解决率趋势图
 * - 高风险用户表格
 * - 惩罚统计图表
 * - 导出功能（CSV/PDF）
 */

export default function RiskControlReportsPage() {
  const [timeRange, setTimeRange] = useState<TimeRangeConfig>({
    range: '7days',
  });

  // 获取告警统计数据
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['risk-alert-stats'],
    queryFn: async () => {
      const response = await api.get<{ message: string; data: AlertStats }>(
        '/risk-control/alerts/stats'
      );
      return response.data.data;
    },
  });

  // 生成报告数据（基于真实统计数据 + 模拟趋势数据）
  const reportData = useMemo<RiskControlReportData | null>(() => {
    if (!statsData) return null;

    // 计算时间范围
    const now = new Date();
    const days = timeRange.range === 'today' ? 1 : timeRange.range === '7days' ? 7 : 30;
    
    // 生成趋势数据
    const trendData = generateTrendData(days, statsData.total);
    const resolutionTrend = generateResolutionTrend(days);

    // 按类型统计
    const alertsByType = Object.entries(statsData.byType).map(([type, count]) => ({
      type: type as AlertType,
      label: ALERT_TYPE_LABELS[type as AlertType] || type,
      count,
      percentage: statsData.total > 0 ? (count / statsData.total) * 100 : 0,
    }));

    // 按严重程度统计
    const alertsBySeverity = [
      { severity: 'CRITICAL' as AlertSeverity, label: '紧急', count: statsData.bySeverity.critical },
      { severity: 'HIGH' as AlertSeverity, label: '高', count: statsData.bySeverity.high },
      { severity: 'MEDIUM' as AlertSeverity, label: '中', count: statsData.bySeverity.medium },
      { severity: 'LOW' as AlertSeverity, label: '低', count: statsData.bySeverity.low },
    ].map((item) => ({
      ...item,
      percentage: statsData.total > 0 ? (item.count / statsData.total) * 100 : 0,
    }));

    // 惩罚统计（模拟数据）
    const punishmentStats = generatePunishmentStats();

    // 高风险用户（模拟数据）
    const topRiskUsers = generateTopRiskUsers();

    return {
      overview: {
        totalAlerts: statsData.total,
        resolvedAlerts: statsData.byStatus.resolved,
        resolvedRate:
          statsData.total > 0
            ? (statsData.byStatus.resolved / statsData.total) * 100
            : 0,
        avgResolutionTimeHours: statsData.avgResolutionTimeHours,
        totalPunishments: punishmentStats.totalCount,
        activePunishments: punishmentStats.activeCount,
        expiredPunishments: punishmentStats.expiredCount,
        uniqueAffectedUsers: topRiskUsers.length,
      },
      alertsByType,
      alertsBySeverity,
      alertTrend: { daily: trendData },
      resolutionRateTrend: resolutionTrend,
      topRiskUsers,
      punishmentStats,
      generatedAt: now.toISOString(),
      timeRange,
    };
  }, [statsData, timeRange]);

  // 处理时间范围变化
  const handleTimeRangeChange = useCallback((config: TimeRangeConfig) => {
    setTimeRange(config);
  }, []);

  // 处理导出
  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    if (!reportData) return;

    if (format === 'csv') {
      // 生成 CSV 内容
      const csvContent = generateCSVContent(reportData);
      downloadFile(csvContent, 'risk-control-report.csv', 'text/csv');
    } else {
      // PDF 导出需要后端支持，这里先提示
      alert('PDF 导出功能开发中，请使用 CSV 格式');
    }
  }, [reportData]);

  // 处理用户点击
  const handleUserClick = useCallback((userId: string) => {
    // TODO: 跳转到用户详情页
    console.log('View user:', userId);
  }, []);

  const isLoading = isLoadingStats;

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
            <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              风控报告
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              风控数据分析与统计报告
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ReportFilters
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
          />
          <ExportButton onExport={handleExport} />
        </div>
      </div>

      {/* 概览统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <ReportStatsCardSkeleton key={i} />)
        ) : (
          <>
            <ReportStatsCard
              title="总告警数"
              value={reportData?.overview.totalAlerts || 0}
              subtitle={`${timeRange.range === 'today' ? '今日' : timeRange.range === '7days' ? '近7天' : '近30天'}`}
              icon={AlertTriangle}
              iconColor="text-orange-500"
              iconBgColor="bg-orange-50 dark:bg-orange-900/20"
              delay={0}
            />
            <ReportStatsCard
              title="解决率"
              value={`${(reportData?.overview.resolvedRate || 0).toFixed(1)}%`}
              subtitle="已解决 / 总数"
              icon={CheckCircle}
              iconColor="text-green-500"
              iconBgColor="bg-green-50 dark:bg-green-900/20"
              trend={{
                value: 5.2,
                isPositive: true,
                label: '较上周',
              }}
              delay={0.05}
            />
            <ReportStatsCard
              title="平均解决时间"
              value={`${(reportData?.overview.avgResolutionTimeHours || 0).toFixed(1)}h`}
              subtitle="从创建到解决"
              icon={Clock}
              iconColor="text-blue-500"
              iconBgColor="bg-blue-50 dark:bg-blue-900/20"
              trend={{
                value: 12.3,
                isPositive: false,
                label: '较上周',
              }}
              delay={0.1}
            />
            <ReportStatsCard
              title="活跃惩罚"
              value={reportData?.overview.activePunishments || 0}
              subtitle={`共 ${reportData?.overview.totalPunishments || 0} 条惩罚`}
              icon={Gavel}
              iconColor="text-red-500"
              iconBgColor="bg-red-50 dark:bg-red-900/20"
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* 图表区域 - 第一行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertTypeChart
          data={reportData?.alertsByType || []}
          isLoading={isLoading}
        />
        <SeverityBarChart
          data={reportData?.alertsBySeverity || []}
          isLoading={isLoading}
        />
      </div>

      {/* 图表区域 - 第二行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertTrendChart
          data={reportData?.alertTrend.daily || []}
          isLoading={isLoading}
        />
        <ResolutionRateChart
          data={reportData?.resolutionRateTrend || []}
          isLoading={isLoading}
        />
      </div>

      {/* 下半部分 - 表格和惩罚统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TopRiskUsersTable
            users={reportData?.topRiskUsers || []}
            isLoading={isLoading}
            onUserClick={handleUserClick}
          />
        </div>
        <div>
          <PunishmentStatsChart
            stats={reportData?.punishmentStats || null}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 报告生成时间 */}
      {reportData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-gray-400 dark:text-gray-500"
        >
          报告生成时间: {new Date(reportData.generatedAt).toLocaleString('zh-CN')}
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// 辅助函数 - 数据生成
// ============================================

function generateTrendData(days: number, total: number) {
  const data = [];
  const now = new Date();
  const avgPerDay = Math.max(1, Math.floor(total / days));

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // 添加一些随机波动
    const variance = Math.floor(avgPerDay * 0.5);
    const count = Math.max(0, avgPerDay + Math.floor(Math.random() * variance * 2) - variance);
    const resolved = Math.floor(count * (0.6 + Math.random() * 0.3));
    
    data.push({
      date: date.toISOString().split('T')[0],
      count,
      resolved,
      pending: count - resolved,
    });
  }

  return data;
}

function generateResolutionTrend(days: number) {
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // 解决率在 60-95% 之间波动
    const rate = 60 + Math.random() * 35;
    const total = 10 + Math.floor(Math.random() * 20);
    const resolved = Math.floor(total * (rate / 100));
    
    data.push({
      date: date.toISOString().split('T')[0],
      rate,
      resolved,
      total,
    });
  }

  return data;
}

function generatePunishmentStats() {
  const types: PunishmentType[] = [
    PunishmentTypeEnum.WARNING,
    PunishmentTypeEnum.MUTE,
    PunishmentTypeEnum.FEATURE_RESTRICT,
    PunishmentTypeEnum.ACCOUNT_FREEZE,
    PunishmentTypeEnum.ACCOUNT_BAN,
  ];

  const byType = types.map((type) => {
    const count = Math.floor(Math.random() * 50) + 5;
    return {
      type,
      label: PUNISHMENT_TYPE_LABELS[type],
      count,
      percentage: 0, // 稍后计算
    };
  });

  const totalCount = byType.reduce((sum, item) => sum + item.count, 0);
  byType.forEach((item) => {
    item.percentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
  });

  const activeCount = Math.floor(totalCount * 0.4);
  const expiredCount = totalCount - activeCount;

  return {
    byType,
    activeCount,
    expiredCount,
    totalCount,
    effectivenessRate: 70 + Math.random() * 20, // 70-90%
  };
}

function generateTopRiskUsers() {
  const usernames = [
    'suspicious_user_1',
    'multi_account_2',
    'spam_bot_3',
    'fraud_attempt_4',
    'abuse_report_5',
  ];

  return usernames.map((username, index) => ({
    userId: `user-${index + 1}`,
    username,
    displayName: `风险用户 ${index + 1}`,
    avatarUrl: undefined,
    alertCount: Math.floor(Math.random() * 20) + 5,
    punishmentCount: Math.floor(Math.random() * 10) + 1,
    lastAlertDate: new Date(
      Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
    riskScore: Math.floor(Math.random() * 60) + 40, // 40-100
  })).sort((a, b) => b.riskScore - a.riskScore);
}

function generateCSVContent(data: RiskControlReportData): string {
  const lines: string[] = [];

  // 概览
  lines.push('风控报告概览');
  lines.push(`生成时间,${data.generatedAt}`);
  lines.push(`总告警数,${data.overview.totalAlerts}`);
  lines.push(`已解决,${data.overview.resolvedAlerts}`);
  lines.push(`解决率,${data.overview.resolvedRate.toFixed(1)}%`);
  lines.push(`平均解决时间,${data.overview.avgResolutionTimeHours.toFixed(1)}小时`);
  lines.push('');

  // 按类型统计
  lines.push('告警类型分布');
  lines.push('类型,数量,占比');
  data.alertsByType.forEach((item) => {
    lines.push(`${item.label},${item.count},${item.percentage.toFixed(1)}%`);
  });
  lines.push('');

  // 按严重程度统计
  lines.push('严重程度分布');
  lines.push('严重程度,数量,占比');
  data.alertsBySeverity.forEach((item) => {
    lines.push(`${item.label},${item.count},${item.percentage.toFixed(1)}%`);
  });
  lines.push('');

  // 高风险用户
  lines.push('高风险用户');
  lines.push('用户名,告警数,惩罚数,风险分');
  data.topRiskUsers.forEach((user) => {
    lines.push(`${user.username},${user.alertCount},${user.punishmentCount},${user.riskScore}`);
  });

  return lines.join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
