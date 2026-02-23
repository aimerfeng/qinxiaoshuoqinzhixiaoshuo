'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Gift,
  Sparkles,
  Coins,
  Award,
  Crown,
  Palette,
  Frame,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type {
  AchievementTier,
  AchievementRewardType,
  AchievementRewardValue,
} from '@/types/achievement';
import {
  ACHIEVEMENT_TIER_COLORS,
  ACHIEVEMENT_REWARD_TYPE_NAMES,
} from '@/types/achievement';

/**
 * 成就领取奖励弹窗组件属性
 */
export interface AchievementClaimRewardModalProps {
  /** 是否显示弹窗 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 成就名称 */
  achievementName: string;
  /** 成就等级 */
  tier: AchievementTier;
  /** 奖励类型 */
  rewardType: AchievementRewardType;
  /** 奖励详情 */
  rewardValue: AchievementRewardValue;
  /** 自动关闭延迟（毫秒，默认5000ms，设为0禁用） */
  autoDismissDelay?: number;
}

/**
 * 粒子数据接口
 */
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
  shape: 'circle' | 'square' | 'star';
}

/**
 * 获取奖励图标组件
 */
function getRewardIcon(rewardType: AchievementRewardType) {
  switch (rewardType) {
    case 'TOKENS':
      return Coins;
    case 'BADGE':
      return Award;
    case 'TITLE':
      return Crown;
    case 'AVATAR_FRAME':
      return Frame;
    case 'THEME':
      return Palette;
    default:
      return Gift;
  }
}

/**
 * 获取奖励显示文本
 */
function getRewardDisplayText(
  rewardType: AchievementRewardType,
  rewardValue: AchievementRewardValue
): { main: string; sub?: string } {
  switch (rewardType) {
    case 'TOKENS':
      return {
        main: `+${rewardValue.amount?.toLocaleString() || 0}`,
        sub: '零芥子',
      };
    case 'BADGE':
      return {
        main: '专属徽章',
        sub: '已添加到徽章墙',
      };
    case 'TITLE':
      return {
        main: `"${rewardValue.title || '专属称号'}"`,
        sub: '称号已解锁',
      };
    case 'AVATAR_FRAME':
      return {
        main: '头像框',
        sub: '可在个人中心装备',
      };
    case 'THEME':
      return {
        main: '主题皮肤',
        sub: '可在设置中切换',
      };
    default:
      return {
        main: ACHIEVEMENT_REWARD_TYPE_NAMES[rewardType],
      };
  }
}

/**
 * 获取等级对应的彩带颜色
 */
function getTierConfettiColors(tier: AchievementTier): string[] {
  switch (tier) {
    case 'BRONZE':
      return ['#CD7F32', '#B87333', '#D4A574', '#FFD700', '#FFA500'];
    case 'SILVER':
      return ['#C0C0C0', '#A8A8A8', '#D3D3D3', '#E8E8E8', '#87CEEB'];
    case 'GOLD':
      return ['#FFD700', '#FFC107', '#FFEB3B', '#FF9800', '#FFF176'];
    case 'PLATINUM':
      return ['#00CED1', '#20B2AA', '#48D1CC', '#7FFFD4', '#40E0D0'];
    case 'DIAMOND':
      return ['#6366F1', '#818CF8', '#A5B4FC', '#60A5FA', '#3B82F6'];
    case 'LEGENDARY':
      return ['#8B5CF6', '#A855F7', '#D946EF', '#F472B6', '#EC4899'];
    default:
      return ['#6366F1', '#8B5CF6', '#A855F7', '#F472B6', '#FFD700'];
  }
}

/**
 * 生成彩带粒子数据
 */
function generateConfetti(tier: AchievementTier, count: number = 60): ConfettiParticle[] {
  const colors = getTierConfettiColors(tier);
  const shapes: ('circle' | 'square' | 'star')[] = ['circle', 'square', 'star'];
  const particles: ConfettiParticle[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      size: Math.random() * 10 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.8,
      duration: Math.random() * 2 + 2,
      rotation: Math.random() * 720 - 360,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    });
  }

  return particles;
}

/**
 * 彩带粒子组件
 */
function ConfettiParticleEffect({ particle }: { particle: ConfettiParticle }) {
  const endY = 110 + Math.random() * 20;
  const swayX = particle.x + (Math.random() - 0.5) * 30;

  return (
    <motion.div
      initial={{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        rotate: 0,
        opacity: 1,
      }}
      animate={{
        left: `${swayX}%`,
        top: `${endY}%`,
        rotate: particle.rotation,
        opacity: [1, 1, 0.8, 0],
      }}
      transition={{
        duration: particle.duration,
        delay: particle.delay,
        ease: 'easeIn',
      }}
      className="absolute pointer-events-none"
      style={{
        width: particle.size,
        height: particle.size,
        backgroundColor: particle.color,
        borderRadius: particle.shape === 'circle' ? '50%' : particle.shape === 'star' ? '2px' : '2px',
        boxShadow: `0 0 ${particle.size}px ${particle.color}40`,
      }}
    />
  );
}

/**
 * 闪光效果组件
 */
function SparkleRing({ delay, tier }: { delay: number; tier: AchievementTier }) {
  const tierColors = ACHIEVEMENT_TIER_COLORS[tier];

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{
        scale: [0.5, 1.5, 2],
        opacity: [0, 0.6, 0],
      }}
      transition={{
        duration: 1.5,
        delay,
        ease: 'easeOut',
      }}
      className={cn(
        'absolute w-32 h-32 rounded-full border-4',
        'pointer-events-none',
        tierColors.border
      )}
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
}

/**
 * 成就领取奖励弹窗组件
 *
 * 需求24: 成就系统
 * 任务24.2.6: 成就领取交互
 *
 * 功能：
 * - Modal that shows after successfully claiming a reward
 * - Display the reward received (tokens amount, badge, title, etc.)
 * - Celebration animation (confetti, sparkles)
 * - "领取成功!" message
 * - Reward icon/preview based on reward type
 * - Close button and auto-dismiss option
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function AchievementClaimRewardModal({
  isOpen,
  onClose,
  achievementName,
  tier,
  rewardType,
  rewardValue,
  autoDismissDelay = 5000,
}: AchievementClaimRewardModalProps) {
  const [confetti] = useState(() => generateConfetti(tier, 60));
  const tierColors = ACHIEVEMENT_TIER_COLORS[tier];
  const RewardIcon = getRewardIcon(rewardType);
  const rewardDisplay = useMemo(
    () => getRewardDisplayText(rewardType, rewardValue),
    [rewardType, rewardValue]
  );

  // Handle escape key press
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Auto-dismiss timer
  useEffect(() => {
    if (isOpen && autoDismissDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoDismissDelay);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, autoDismissDelay, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          className={cn(
            'fixed inset-0 z-[100]',
            'flex items-center justify-center p-4',
            'bg-black/60 backdrop-blur-sm'
          )}
        >
          {/* Confetti particles */}
          {confetti.map((particle) => (
            <ConfettiParticleEffect key={particle.id} particle={particle} />
          ))}

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 30 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
            }}
            className={cn(
              'relative w-full max-w-sm',
              'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl',
              'rounded-3xl shadow-2xl',
              'border border-white/20 dark:border-gray-700/30',
              'overflow-hidden'
            )}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                className={cn(
                  'absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-40',
                  `bg-gradient-to-br ${tierColors.gradient}`
                )}
              />
              <div
                className={cn(
                  'absolute -bottom-16 -left-16 w-40 h-40 rounded-full blur-3xl opacity-30',
                  `bg-gradient-to-br ${tierColors.gradient}`
                )}
              />
            </div>

            {/* Sparkle rings */}
            <SparkleRing delay={0.2} tier={tier} />
            <SparkleRing delay={0.5} tier={tier} />
            <SparkleRing delay={0.8} tier={tier} />

            {/* Close button */}
            <button
              onClick={onClose}
              className={cn(
                'absolute top-3 right-3 z-20',
                'p-2 rounded-xl',
                'bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                'transition-colors duration-200'
              )}
              aria-label="关闭"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>

            {/* Content */}
            <div className="relative z-10 p-8 text-center">
              {/* Success message */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="mb-6"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: 2,
                    ease: 'easeInOut',
                  }}
                  className="inline-flex items-center gap-2"
                >
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    领取成功!
                  </h2>
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                </motion.div>
              </motion.div>

              {/* Reward icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2,
                }}
                className="mb-6"
              >
                <div
                  className={cn(
                    'inline-flex items-center justify-center',
                    'w-24 h-24 rounded-2xl',
                    'bg-gradient-to-br shadow-xl',
                    tierColors.gradient
                  )}
                  style={{
                    boxShadow: `0 0 40px ${tierColors.gradient.includes('purple') ? 'rgba(139, 92, 246, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`,
                  }}
                >
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 0.5,
                      delay: 0.5,
                      repeat: 1,
                    }}
                  >
                    <RewardIcon className="w-12 h-12 text-white" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Reward details */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="mb-4"
              >
                <p className={cn('text-3xl font-bold mb-1', tierColors.text)}>
                  {rewardDisplay.main}
                </p>
                {rewardDisplay.sub && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {rewardDisplay.sub}
                  </p>
                )}
              </motion.div>

              {/* Achievement name */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className={cn(
                  'inline-block px-4 py-2 rounded-xl',
                  'bg-gray-100 dark:bg-gray-800'
                )}
              >
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  来自成就: <span className="font-semibold">{achievementName}</span>
                </p>
              </motion.div>

              {/* Dismiss hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="mt-6 text-xs text-gray-400 dark:text-gray-500"
              >
                点击任意位置关闭
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AchievementClaimRewardModal;
