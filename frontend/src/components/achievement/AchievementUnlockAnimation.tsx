'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AchievementTier } from '@/types/achievement';
import {
  ACHIEVEMENT_TIER_NAMES,
  ACHIEVEMENT_TIER_COLORS,
} from '@/types/achievement';

/**
 * 成就解锁动画组件属性
 */
export interface AchievementUnlockAnimationProps {
  /** 是否显示动画 */
  isVisible: boolean;
  /** 成就名称 */
  achievementName: string;
  /** 成就等级 */
  tier: AchievementTier;
  /** 成就图标URL（可选） */
  iconUrl?: string | null;
  /** 关闭回调 */
  onClose: () => void;
  /** 音效触发回调（可选） */
  onSoundTrigger?: () => void;
  /** 自动关闭延迟（毫秒，默认4000ms） */
  autoDismissDelay?: number;
  /** 是否禁用自动关闭 */
  disableAutoDismiss?: boolean;
}

/**
 * 粒子数据接口
 */
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  angle: number;
  distance: number;
}

/**
 * 获取等级对应的粒子颜色
 */
function getTierParticleColors(tier: AchievementTier): string[] {
  switch (tier) {
    case 'BRONZE':
      return ['#CD7F32', '#B87333', '#D4A574', '#E8C39E', '#FFD700'];
    case 'SILVER':
      return ['#C0C0C0', '#A8A8A8', '#D3D3D3', '#E8E8E8', '#FFFFFF'];
    case 'GOLD':
      return ['#FFD700', '#FFC107', '#FFEB3B', '#FFF176', '#FFFFFF'];
    case 'PLATINUM':
      return ['#00CED1', '#20B2AA', '#48D1CC', '#7FFFD4', '#FFFFFF'];
    case 'DIAMOND':
      return ['#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE', '#FFFFFF'];
    case 'LEGENDARY':
      return ['#8B5CF6', '#A855F7', '#D946EF', '#F472B6', '#FFFFFF'];
    default:
      return ['#6366F1', '#8B5CF6', '#A855F7', '#FFFFFF', '#FFD700'];
  }
}

/**
 * 获取等级对应的光晕颜色
 */
function getTierGlowColor(tier: AchievementTier): string {
  switch (tier) {
    case 'BRONZE':
      return 'rgba(205, 127, 50, 0.6)';
    case 'SILVER':
      return 'rgba(192, 192, 192, 0.6)';
    case 'GOLD':
      return 'rgba(255, 215, 0, 0.6)';
    case 'PLATINUM':
      return 'rgba(0, 206, 209, 0.6)';
    case 'DIAMOND':
      return 'rgba(99, 102, 241, 0.6)';
    case 'LEGENDARY':
      return 'rgba(139, 92, 246, 0.6)';
    default:
      return 'rgba(99, 102, 241, 0.6)';
  }
}

/**
 * 生成粒子数据
 */
function generateParticles(tier: AchievementTier, count: number = 40): Particle[] {
  const colors = getTierParticleColors(tier);
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: 50 + (Math.random() - 0.5) * 10, // 中心附近
      y: 50 + (Math.random() - 0.5) * 10,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.3,
      duration: Math.random() * 1.5 + 1.5,
      angle: Math.random() * 360,
      distance: Math.random() * 40 + 20,
    });
  }

  return particles;
}

/**
 * 粒子组件
 */
function ParticleEffect({ particle }: { particle: Particle }) {
  const endX = particle.x + Math.cos((particle.angle * Math.PI) / 180) * particle.distance;
  const endY = particle.y + Math.sin((particle.angle * Math.PI) / 180) * particle.distance;

  return (
    <motion.div
      initial={{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        scale: 0,
        opacity: 1,
      }}
      animate={{
        left: `${endX}%`,
        top: `${endY}%`,
        scale: [0, 1.5, 1, 0],
        opacity: [1, 1, 0.8, 0],
      }}
      transition={{
        duration: particle.duration,
        delay: particle.delay + 0.5,
        ease: 'easeOut',
      }}
      className="absolute pointer-events-none"
      style={{
        width: particle.size,
        height: particle.size,
        backgroundColor: particle.color,
        borderRadius: '50%',
        boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
      }}
    />
  );
}

/**
 * 星星闪烁组件
 */
function SparkleEffect({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotate: 0 }}
      animate={{
        scale: [0, 1.2, 0],
        opacity: [0, 1, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration: 1.2,
        delay: delay + 0.8,
        ease: 'easeInOut',
      }}
      className="absolute pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <Sparkles
        className="text-yellow-400"
        style={{
          width: size,
          height: size,
          filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))',
        }}
      />
    </motion.div>
  );
}

/**
 * 成就解锁动画组件
 *
 * 需求24: 成就系统
 * 任务24.2.5: 成就解锁动画效果
 *
 * 功能：
 * - Full-screen overlay celebration animation when achievement is unlocked
 * - Particle/confetti effects using Motion
 * - Achievement icon with scale-up and glow animation
 * - Achievement name and tier badge reveal
 * - "成就解锁!" title with animation
 * - Sound effect trigger callback (optional)
 * - Auto-dismiss after animation completes (configurable duration)
 * - Click to dismiss early
 * - Tier-based color theming for particles/glow
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function AchievementUnlockAnimation({
  isVisible,
  achievementName,
  tier,
  iconUrl,
  onClose,
  onSoundTrigger,
  autoDismissDelay = 4000,
  disableAutoDismiss = false,
}: AchievementUnlockAnimationProps) {
  const [particles] = useState(() => generateParticles(tier, 50));
  const tierColors = ACHIEVEMENT_TIER_COLORS[tier];
  const glowColor = useMemo(() => getTierGlowColor(tier), [tier]);

  // Trigger sound effect when animation starts
  useEffect(() => {
    if (isVisible && onSoundTrigger) {
      // Small delay to sync with visual animation
      const timer = setTimeout(() => {
        onSoundTrigger();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible, onSoundTrigger]);

  // Auto-dismiss timer
  useEffect(() => {
    if (isVisible && !disableAutoDismiss && autoDismissDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoDismissDelay);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible, autoDismissDelay, disableAutoDismiss, onClose]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isVisible, handleKeyDown]);

  // Handle click to dismiss
  const handleClick = () => {
    onClose();
  };

  // Generate sparkle positions
  const sparkles = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: 30 + Math.random() * 40,
      y: 25 + Math.random() * 50,
      size: 16 + Math.random() * 16,
      delay: Math.random() * 0.5,
    }));
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleClick}
          className={cn(
            'fixed inset-0 z-[100]',
            'flex items-center justify-center',
            'bg-black/70 backdrop-blur-md',
            'cursor-pointer'
          )}
        >
          {/* Particles */}
          {particles.map((particle) => (
            <ParticleEffect key={particle.id} particle={particle} />
          ))}

          {/* Sparkles */}
          {sparkles.map((sparkle) => (
            <SparkleEffect
              key={sparkle.id}
              delay={sparkle.delay}
              x={sparkle.x}
              y={sparkle.y}
              size={sparkle.size}
            />
          ))}

          {/* Central Content */}
          <div className="relative flex flex-col items-center">
            {/* Glow Ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.5, 1.2],
                opacity: [0, 0.8, 0.4],
              }}
              transition={{
                duration: 1,
                ease: 'easeOut',
              }}
              className="absolute w-48 h-48 rounded-full"
              style={{
                background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
              }}
            />

            {/* Second Glow Ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 2, 1.8],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 1.5,
                delay: 0.2,
                ease: 'easeOut',
              }}
              className="absolute w-48 h-48 rounded-full"
              style={{
                background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
              }}
            />

            {/* Achievement Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
              className={cn(
                'relative w-28 h-28 rounded-3xl flex items-center justify-center mb-6',
                'bg-gradient-to-br shadow-2xl',
                tierColors.gradient
              )}
              style={{
                boxShadow: `0 0 60px ${glowColor}, 0 0 100px ${glowColor}`,
              }}
            >
              {/* Inner glow */}
              <motion.div
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 rounded-3xl bg-white/20"
              />

              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt={achievementName}
                  className="w-16 h-16 relative z-10"
                />
              ) : (
                <Trophy className="w-16 h-16 text-white relative z-10" />
              )}
            </motion.div>

            {/* "成就解锁!" Title */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.5,
                ease: 'easeOut',
              }}
              className="mb-4"
            >
              <motion.h2
                animate={{
                  textShadow: [
                    `0 0 20px ${glowColor}`,
                    `0 0 40px ${glowColor}`,
                    `0 0 20px ${glowColor}`,
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={cn(
                  'text-3xl md:text-4xl font-bold text-white',
                  'tracking-wider'
                )}
              >
                🎉 成就解锁! 🎉
              </motion.h2>
            </motion.div>

            {/* Achievement Name */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.7,
                ease: 'easeOut',
              }}
              className="text-center mb-4"
            >
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {achievementName}
              </h3>
            </motion.div>

            {/* Tier Badge */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: 0.9,
              }}
            >
              <div
                className={cn(
                  'px-6 py-2 rounded-full text-lg font-bold',
                  'bg-gradient-to-r shadow-lg',
                  tierColors.gradient,
                  'text-white'
                )}
                style={{
                  boxShadow: `0 0 30px ${glowColor}`,
                }}
              >
                {ACHIEVEMENT_TIER_NAMES[tier]}
              </div>
            </motion.div>

            {/* Dismiss hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 2, duration: 0.5 }}
              className="mt-8 text-sm text-white/60"
            >
              点击任意位置关闭
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AchievementUnlockAnimation;
