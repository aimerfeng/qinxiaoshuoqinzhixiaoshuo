'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  ChevronLeft,
  FileText,
  History,
  Award,
  Send,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/auth';
import { membershipService } from '@/services/membership';
import { MemberLevelBadge } from '@/components/membership/MemberLevelBadge';
import { ContributionProgressBar } from '@/components/membership/ContributionProgressBar';
import { LevelRequirementCard } from '@/components/membership/LevelRequirementCard';
import { ApplicationHistoryItem } from '@/components/membership/ApplicationHistoryItem';
import {
  MemberLevel,
  getLevelByScore,
  getMemberLevelConfig,
  type EligibilityResult,
  type ApplicationRecord,
  type Pagination,
  type UserContribution,
} from '@/types/membership';

/**
 * 会员申请页面
 *
 * 需求14: 会员等级体系
 * 任务14.2.4: 会员申请页面
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export default function MembershipApplyPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // 数据状态
  const [contribution, setContribution] = useState<UserContribution | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // 加载状态
  const [isLoadingContribution, setIsLoadingContribution] = useState(true);
  const [isLoadingEligibility, setIsLoadingEligibility] = useState(true);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 申请弹窗状态
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<MemberLevel | null>(null);
  const [applyReason, setApplyReason] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);

  // 加载贡献度
  const loadContribution = useCallback(async () => {
    setIsLoadingContribution(true);
    try {
      const response = await membershipService.getContribution();
      setContribution(response.data);
    } catch (error) {
      console.error('Failed to load contribution:', error);
    } finally {
      setIsLoadingContribution(false);
    }
  }, []);

  // 加载资格信息
  const loadEligibility = useCallback(async () => {
    setIsLoadingEligibility(true);
    try {
      const response = await membershipService.checkEligibility();
      setEligibility(response.data);
    } catch (error) {
      console.error('Failed to load eligibility:', error);
    } finally {
      setIsLoadingEligibility(false);
    }
  }, []);

  // 加载申请历史
  const loadApplications = useCallback(async () => {
    setIsLoadingApplications(true);
    try {
      const response = await membershipService.getApplications({ pageSize: 10 });
      setApplications(response.data.applications);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setIsLoadingApplications(false);
    }
  }, []);

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/membership/apply');
    }
  }, [authLoading, isAuthenticated, router]);

  // 加载数据
  useEffect(() => {
    if (isAuthenticated) {
      loadContribution();
      loadEligibility();
      loadApplications();
    }
  }, [isAuthenticated, loadContribution, loadEligibility, loadApplications]);

  // 打开申请弹窗
  const handleOpenApplyModal = (level: MemberLevel) => {
    setSelectedLevel(level);
    setApplyReason('');
    setApplyError(null);
    setShowApplyModal(true);
  };

  // 关闭申请弹窗
  const handleCloseApplyModal = () => {
    setShowApplyModal(false);
    setSelectedLevel(null);
    setApplyReason('');
    setApplyError(null);
  };

  // 提交申请
  const handleSubmitApplication = async () => {
    if (!selectedLevel) return;

    // 验证申请理由
    if (applyReason.trim().length < 10) {
      setApplyError('申请理由至少需要10个字符');
      return;
    }
    if (applyReason.trim().length > 500) {
      setApplyError('申请理由最多500个字符');
      return;
    }

    setIsSubmitting(true);
    setApplyError(null);

    try {
      await membershipService.submitApplication({
        targetLevel: selectedLevel,
        reason: applyReason.trim(),
      });

      // 关闭弹窗并刷新数据
      handleCloseApplyModal();
      loadEligibility();
      loadApplications();
    } catch (error: unknown) {
      const err = error as { message?: string };
      setApplyError(err.message || '提交申请失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const level = contribution ? getLevelByScore(contribution.totalScore) : null;
  const selectedLevelConfig = selectedLevel ? getMemberLevelConfig(selectedLevel) : null;

  // 过滤出可申请的等级（排除当前等级及以下）
  const applicableLevels = eligibility?.eligibleLevels.filter(
    (el) => getMemberLevelConfig(el.level).value > (level ? getMemberLevelConfig(level).value : 0)
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              会员申请
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              申请升级您的会员等级
            </p>
          </div>
        </motion.div>

        {/* 当前等级和贡献度卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          {isLoadingContribution ? (
            <div className="h-36 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : contribution && level ? (
            <div className="p-5 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-lg">
              {/* 等级徽章和总分 */}
              <div className="flex items-center justify-between mb-4">
                <MemberLevelBadge
                  level={level}
                  score={contribution.totalScore}
                  showScore
                  size="lg"
                  variant="glass"
                />
                <button
                  onClick={() => router.push('/membership/contribution')}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  查看明细 →
                </button>
              </div>

              {/* 进度条 */}
              <ContributionProgressBar
                score={contribution.totalScore}
                size="md"
                variant="minimal"
              />
            </div>
          ) : null}
        </motion.div>

        {/* 等级要求列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              等级要求
            </h2>
          </div>

          {isLoadingEligibility ? (
            <div className="h-48 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : applicableLevels.length > 0 ? (
            <div className="space-y-3">
              {applicableLevels.map((el, index) => (
                <LevelRequirementCard
                  key={el.level}
                  eligibleLevel={el}
                  currentScore={eligibility?.currentScore || 0}
                  index={index}
                  onApply={handleOpenApplyModal}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md text-center">
              <Award className="w-12 h-12 mx-auto mb-2 text-purple-400" />
              <p className="text-gray-600 dark:text-gray-300 font-medium">
                🎉 恭喜！您已达到最高等级
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                感谢您对社区的贡献
              </p>
            </div>
          )}
        </motion.div>

        {/* 申请历史 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              申请历史
            </h2>
            {pagination && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                共 {pagination.total} 条
              </span>
            )}
          </div>

          {isLoadingApplications ? (
            <div className="h-32 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : applications.length > 0 ? (
            <div className="space-y-3">
              {applications.map((app, index) => (
                <ApplicationHistoryItem
                  key={app.id}
                  application={app}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md text-center text-gray-500 dark:text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p>暂无申请记录</p>
              <p className="text-sm mt-1">提交申请后将在这里显示</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* 申请弹窗 */}
      <AnimatePresence>
        {showApplyModal && selectedLevelConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseApplyModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 弹窗头部 */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-xl',
                        selectedLevelConfig.bgColor,
                        'border',
                        selectedLevelConfig.borderColor
                      )}
                    >
                      {selectedLevelConfig.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        申请 Lv.{selectedLevelConfig.value} {selectedLevelConfig.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        需要 {selectedLevelConfig.requiredScore.toLocaleString()} 贡献度
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseApplyModal}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* 弹窗内容 */}
              <div className="p-5">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  申请理由 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  placeholder="请简要说明您申请该等级的理由（10-500字）..."
                  rows={4}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl',
                    'bg-gray-50 dark:bg-gray-800',
                    'border border-gray-200 dark:border-gray-700',
                    'text-gray-900 dark:text-white',
                    'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500',
                    'resize-none transition-colors'
                  )}
                />
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>至少10个字符</span>
                  <span className={applyReason.length > 500 ? 'text-red-500' : ''}>
                    {applyReason.length}/500
                  </span>
                </div>

                {/* 错误提示 */}
                {applyError && (
                  <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{applyError}</span>
                  </div>
                )}
              </div>

              {/* 弹窗底部 */}
              <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                <button
                  onClick={handleCloseApplyModal}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitApplication}
                  disabled={isSubmitting || applyReason.trim().length < 10}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl font-medium',
                    'bg-gradient-to-r from-indigo-500 to-purple-500',
                    'text-white',
                    'hover:from-indigo-600 hover:to-purple-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-all flex items-center justify-center gap-2'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>提交中...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>提交申请</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
