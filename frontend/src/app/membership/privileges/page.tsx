'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Loader2,
  ChevronLeft,
  Crown,
  Star,
  Sparkles,
  Shield,
  Gift,
  Zap,
  BookOpen,
  MessageCircle,
  Award,
  ArrowRight,
  Check,
  X,
  Info,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/auth';
import { membershipService } from '@/services/membership';
import { MemberLevelBadge } from '@/components/membership/MemberLevelBadge';
import { ContributionProgressBar } from '@/components/membership/ContributionProgressBar';
import {
  MemberLevel,
  getLevelByScore,
  MEMBER_LEVEL_CONFIGS,
  type UserContribution,
} from '@/types/membership';

/**
 * 会员特权说明页面
 *
 * 需求14: 会员等级体系
 * 任务14.2.5: 会员特权说明页面
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */

/**
 * 特权项定义
 */
interface Privilege {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  levels: Record<MemberLevel, boolean | string>;
}

/**
 * 特权列表配置
 */
const PRIVILEGES: Privilege[] = [
  {
    id: 'basic_access',
    name: '基础阅读',
    description: '阅读平台上的所有公开作品',
    icon: <BookOpen className="w-5 h-5" />,
    levels: {
      [MemberLevel.LEVEL_0]: true,
      [MemberLevel.LEVEL_1]: true,
      [MemberLevel.LEVEL_2]: true,
      [MemberLevel.LEVEL_3]: true,
    },
  },
  {
    id: 'comment',
    name: '评论互动',
    description: '对作品和卡片发表评论',
    icon: <MessageCircle className="w-5 h-5" />,
    levels: {
      [MemberLevel.LEVEL_0]: true,
      [MemberLevel.LEVEL_1]: true,
      [MemberLevel.LEVEL_2]: true,
      [MemberLevel.LEVEL_3]: true,
    },
  },
  {
    id: 'badge',
    name: '专属徽章',
    description: '展示会员等级的专属徽章',
    icon: <Award className="w-5 h-5" />,
    levels: {
      [MemberLevel.LEVEL_0]: false,
      [MemberLevel.LEVEL_1]: '初级徽章',
      [MemberLevel.LEVEL_2]: '特别徽章',
      [MemberLevel.LEVEL_3]: '尊贵徽章',
    },
  },
  {
    id: 'priority_support',
    name: '优先客服',
    description: '享受优先客服支持服务',
    icon: <Shield className="w-5 h-5" />,
    levels: {
      [MemberLevel.LEVEL_0]: false,
      [MemberLevel.LEVEL_1]: true,
      [MemberLevel.LEVEL_2]: true,
      [MemberLevel.LEVEL_3]: true,
    },
  },
  {
    id: 'exclusive_themes',
    name: '专属主题',
    description: '解锁会员专属阅读主题',
    icon: <Sparkles className="w-5 h-5" />,
    levels: {
      [MemberLevel.LEVEL_0]: false,
      [MemberLevel.LEVEL_1]: false,
      [MemberLevel.LEVEL_2]: '3款主题',
      [MemberLevel.LEVEL_3]: '全部主题',
    },
  },
  {
    id: 'early_access',
    name: '抢先体验',
    description: '优先体验新功能和新作品',
    icon: <Zap className="w-5 h-5" />,
    levels: {
      [MemberLevel.LEVEL_0]: false,
      [MemberLevel.LEVEL_1]: false,
      [MemberLevel.LEVEL_2]: false,
      [MemberLevel.LEVEL_3]: true,
    },
  },
  {
    id: 'mustard_seed',
    name: '每日零芥子',
    description: '每日领取免费零芥子代币',
    icon: <Gift className="w-5 h-5" />,
    levels: {
      [MemberLevel.LEVEL_0]: false,
      [MemberLevel.LEVEL_1]: '10/日',
      [MemberLevel.LEVEL_2]: '20/日',
      [MemberLevel.LEVEL_3]: '50/日',
    },
  },
  {
    id: 'activity',
    name: '发起活动',
    description: '发起社区互动活动',
    icon: <Star className="w-5 h-5" />,
    levels: {
      [MemberLevel.LEVEL_0]: false,
      [MemberLevel.LEVEL_1]: true,
      [MemberLevel.LEVEL_2]: true,
      [MemberLevel.LEVEL_3]: true,
    },
  },
  {
    id: 'governance',
    name: '社区治理',
    description: '参与社区治理和决策投票',
    icon: <Crown className="w-5 h-5" />,
    levels: {
      [MemberLevel.LEVEL_0]: false,
      [MemberLevel.LEVEL_1]: false,
      [MemberLevel.LEVEL_2]: false,
      [MemberLevel.LEVEL_3]: true,
    },
  },
];

/**
 * 贡献度获取方式
 */
const CONTRIBUTION_WAYS = [
  { action: '完整阅读1章节', points: '+2', limit: '每日上限20' },
  { action: '累计阅读30分钟', points: '+5', limit: '每日上限15' },
  { action: '发布有效评论（≥20字）', points: '+3', limit: '每日上限15' },
  { action: '评论被点赞', points: '+1', limit: '每日上限10' },
  { action: '引用被互动', points: '+2', limit: '每日上限20' },
  { action: '发布章节', points: '+20', limit: '每日上限60' },
  { action: '作品被收藏', points: '+5', limit: '每日上限50' },
  { action: '段落被引用', points: '+3', limit: '每日上限30' },
  { action: '举报有效违规', points: '+10', limit: '每日上限30' },
  { action: '参与官方活动', points: '+15', limit: '无上限' },
];

export default function MembershipPrivilegesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // 数据状态
  const [contribution, setContribution] = useState<UserContribution | null>(null);
  const [isLoadingContribution, setIsLoadingContribution] = useState(true);

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

  // 加载数据（仅登录用户）
  useEffect(() => {
    if (isAuthenticated) {
      loadContribution();
    } else {
      setIsLoadingContribution(false);
    }
  }, [isAuthenticated, loadContribution]);

  const currentLevel = contribution ? getLevelByScore(contribution.totalScore) : null;
  const levelConfigs = Object.values(MEMBER_LEVEL_CONFIGS);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
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
              会员特权说明
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              了解各等级会员的专属权益
            </p>
          </div>
        </motion.div>

        {/* 当前等级卡片（仅登录用户显示） */}
        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            {authLoading || isLoadingContribution ? (
              <div className="h-32 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : contribution && currentLevel ? (
              <div className="p-5 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <MemberLevelBadge
                      level={currentLevel}
                      score={contribution.totalScore}
                      showScore
                      size="lg"
                      variant="glass"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      您当前的等级
                    </span>
                  </div>
                  <button
                    onClick={() => router.push('/membership/apply')}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium',
                      'bg-gradient-to-r from-indigo-500 to-purple-500',
                      'text-white hover:from-indigo-600 hover:to-purple-600',
                      'transition-all flex items-center gap-2'
                    )}
                  >
                    <span>申请升级</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <ContributionProgressBar
                  score={contribution.totalScore}
                  size="sm"
                  variant="minimal"
                />
              </div>
            ) : null}
          </motion.div>
        )}

        {/* 等级概览 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              会员等级概览
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {levelConfigs.map((config, index) => {
              const isCurrentLevel = currentLevel === config.level;
              return (
                <motion.div
                  key={config.level}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className={cn(
                    'relative p-4 rounded-2xl',
                    'bg-white/60 dark:bg-gray-900/60',
                    'backdrop-blur-xl',
                    'border-2 transition-all',
                    isCurrentLevel
                      ? 'border-indigo-400 dark:border-indigo-500 shadow-lg shadow-indigo-500/20'
                      : 'border-white/20 dark:border-gray-700/30'
                  )}
                >
                  {isCurrentLevel && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-medium">
                      当前
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-3xl mb-2">{config.icon}</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Lv.{config.value}
                    </div>
                    <div className={cn('text-sm font-medium', config.color)}>
                      {config.name}
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {config.requiredScore === 0
                        ? '注册即得'
                        : `${config.requiredScore.toLocaleString()} 贡献度`}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* 特权对比表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              特权对比
            </h2>
          </div>

          <div className="rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
            {/* 表头 */}
            <div className="grid grid-cols-5 gap-2 p-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                特权项目
              </div>
              {levelConfigs.map((config) => (
                <div
                  key={config.level}
                  className="text-center"
                >
                  <div className="text-lg">{config.icon}</div>
                  <div className={cn('text-xs font-medium', config.color)}>
                    Lv.{config.value}
                  </div>
                </div>
              ))}
            </div>

            {/* 特权行 */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {PRIVILEGES.map((privilege, index) => (
                <motion.div
                  key={privilege.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="grid grid-cols-5 gap-2 p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-indigo-500">{privilege.icon}</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {privilege.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                        {privilege.description}
                      </div>
                    </div>
                  </div>
                  {levelConfigs.map((config) => {
                    const value = privilege.levels[config.level];
                    const isCurrentLevel = currentLevel === config.level;
                    return (
                      <div
                        key={config.level}
                        className={cn(
                          'flex items-center justify-center',
                          isCurrentLevel && 'bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg'
                        )}
                      >
                        {value === true ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : value === false ? (
                          <X className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                        ) : (
                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            {value}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 贡献度获取方式 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                如何获取贡献度
              </h2>
            </div>
            <button
              onClick={() => router.push('/membership/contribution')}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>查看详情</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800">
              {/* 左列 */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {CONTRIBUTION_WAYS.slice(0, 5).map((way, index) => (
                  <motion.div
                    key={way.action}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="flex items-center justify-between p-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {way.action}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {way.points}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {way.limit}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
              {/* 右列 */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {CONTRIBUTION_WAYS.slice(5).map((way, index) => (
                  <motion.div
                    key={way.action}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * (index + 5) }}
                    className="flex items-center justify-between p-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {way.action}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {way.points}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {way.limit}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 底部行动按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          {isAuthenticated ? (
            <>
              <button
                onClick={() => router.push('/membership/apply')}
                className={cn(
                  'flex-1 px-6 py-3 rounded-xl font-medium',
                  'bg-gradient-to-r from-indigo-500 to-purple-500',
                  'text-white hover:from-indigo-600 hover:to-purple-600',
                  'transition-all flex items-center justify-center gap-2',
                  'shadow-lg shadow-indigo-500/25'
                )}
              >
                <Award className="w-5 h-5" />
                <span>申请会员升级</span>
              </button>
              <button
                onClick={() => router.push('/membership/contribution')}
                className={cn(
                  'flex-1 px-6 py-3 rounded-xl font-medium',
                  'bg-white/60 dark:bg-gray-800/60',
                  'backdrop-blur-md',
                  'border border-white/20 dark:border-gray-700/30',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-white/80 dark:hover:bg-gray-800/80',
                  'transition-all flex items-center justify-center gap-2'
                )}
              >
                <BookOpen className="w-5 h-5" />
                <span>查看贡献度明细</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/auth/login?redirect=/membership/privileges')}
              className={cn(
                'w-full px-6 py-3 rounded-xl font-medium',
                'bg-gradient-to-r from-indigo-500 to-purple-500',
                'text-white hover:from-indigo-600 hover:to-purple-600',
                'transition-all flex items-center justify-center gap-2',
                'shadow-lg shadow-indigo-500/25'
              )}
            >
              <span>登录查看您的会员等级</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
