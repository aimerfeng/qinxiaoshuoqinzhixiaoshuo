'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 赛季倒计时组件
 *
 * 需求25: 赛季排行榜系统
 * 任务25.2.2: 赛季倒计时组件
 *
 * 功能：
 * - 接受 endDate 作为 prop
 * - 显示天、时、分、秒
 * - 每秒自动更新
 * - 处理边缘情况（已过期、无效日期）
 * - 支持不同尺寸（compact, default, large）
 * - 支持不同变体（card, inline, minimal, hero）
 * - 数字变化动画
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */

// ==================== 类型定义 ====================

export type CountdownSize = 'compact' | 'default' | 'large';
export type CountdownVariant = 'card' | 'inline' | 'minimal' | 'hero';

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export interface SeasonCountdownProps {
  /** 结束日期（ISO 8601 格式或 Date 对象） */
  endDate: string | Date;
  /** 组件尺寸 */
  size?: CountdownSize;
  /** 组件变体 */
  variant?: CountdownVariant;
  /** 是否显示标签 */
  showLabel?: boolean;
  /** 自定义标签文本 */
  label?: string;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 过期时的回调 */
  onExpire?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 是否显示秒数（compact 模式下可选隐藏） */
  showSeconds?: boolean;
}

// ==================== 工具函数 ====================

/**
 * 计算剩余时间
 */
function calculateTimeLeft(endDate: Date): TimeLeft | null {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) {
    return null;
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    total: diff,
  };
}

/**
 * 解析日期
 */
function parseDate(date: string | Date): Date | null {
  try {
    const parsed = date instanceof Date ? date : new Date(date);
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// ==================== 尺寸配置 ====================

const sizeConfig = {
  compact: {
    container: 'gap-1.5',
    box: 'w-10 h-10 rounded-lg',
    number: 'text-base font-bold',
    label: 'text-[10px]',
    icon: 'w-3 h-3',
    headerText: 'text-xs',
  },
  default: {
    container: 'gap-3',
    box: 'w-14 h-14 rounded-xl',
    number: 'text-xl font-bold',
    label: 'text-xs',
    icon: 'w-4 h-4',
    headerText: 'text-sm',
  },
  large: {
    container: 'gap-4',
    box: 'w-20 h-20 rounded-2xl',
    number: 'text-3xl font-bold',
    label: 'text-sm',
    icon: 'w-5 h-5',
    headerText: 'text-base',
  },
};

// ==================== 变体配置 ====================

const variantConfig = {
  card: {
    wrapper: cn(
      'p-4 rounded-2xl',
      'bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10',
      'backdrop-blur-md',
      'border border-white/20 dark:border-gray-700/30'
    ),
    boxBg: 'bg-white/20 dark:bg-gray-800/40 backdrop-blur-sm',
    textColor: 'text-gray-900 dark:text-white',
    labelColor: 'text-gray-500 dark:text-gray-400',
    headerColor: 'text-gray-600 dark:text-gray-400',
    iconColor: 'text-indigo-500',
  },
  inline: {
    wrapper: '',
    boxBg: 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30',
    textColor: 'text-gray-900 dark:text-white',
    labelColor: 'text-gray-500 dark:text-gray-400',
    headerColor: 'text-gray-600 dark:text-gray-400',
    iconColor: 'text-indigo-500',
  },
  minimal: {
    wrapper: '',
    boxBg: 'bg-transparent',
    textColor: 'text-gray-900 dark:text-white',
    labelColor: 'text-gray-400 dark:text-gray-500',
    headerColor: 'text-gray-400',
    iconColor: 'text-gray-400',
  },
  hero: {
    wrapper: '',
    boxBg: 'bg-white/10 backdrop-blur-sm',
    textColor: 'text-white',
    labelColor: 'text-white/60',
    headerColor: 'text-white/80',
    iconColor: 'text-white/80',
  },
};

// ==================== 动画数字组件 ====================

interface AnimatedNumberProps {
  value: number;
  className?: string;
}

function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const displayValue = String(value).padStart(2, '0');

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.3,
          }}
          className="tabular-nums inline-block"
        >
          {displayValue}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// ==================== 时间单元组件 ====================

interface TimeUnitProps {
  value: number;
  label: string;
  size: CountdownSize;
  variant: CountdownVariant;
  animate?: boolean;
}

function TimeUnit({ value, label, size, variant, animate = true }: TimeUnitProps) {
  const sizes = sizeConfig[size];
  const variants = variantConfig[variant];

  if (variant === 'minimal') {
    return (
      <div className="flex items-baseline gap-0.5">
        {animate ? (
          <AnimatedNumber value={value} className={cn(sizes.number, variants.textColor)} />
        ) : (
          <span className={cn(sizes.number, variants.textColor, 'tabular-nums')}>
            {String(value).padStart(2, '0')}
          </span>
        )}
        <span className={cn(sizes.label, variants.labelColor)}>{label}</span>
      </div>
    );
  }

  return (
    <div className={cn(sizes.box, variants.boxBg, 'flex flex-col items-center justify-center')}>
      {animate ? (
        <AnimatedNumber value={value} className={cn(sizes.number, variants.textColor)} />
      ) : (
        <span className={cn(sizes.number, variants.textColor, 'tabular-nums')}>
          {String(value).padStart(2, '0')}
        </span>
      )}
      <span className={cn(sizes.label, variants.labelColor)}>{label}</span>
    </div>
  );
}

// ==================== 分隔符组件 ====================

interface SeparatorProps {
  variant: CountdownVariant;
  size: CountdownSize;
}

function Separator({ variant, size }: SeparatorProps) {
  if (variant === 'minimal') {
    return <span className={cn(sizeConfig[size].number, 'text-gray-400 dark:text-gray-500 mx-0.5')}>:</span>;
  }
  return null;
}

// ==================== 过期状态组件 ====================

interface ExpiredStateProps {
  size: CountdownSize;
  variant: CountdownVariant;
  className?: string;
}

function ExpiredState({ size, variant, className }: ExpiredStateProps) {
  const sizes = sizeConfig[size];
  const variants = variantConfig[variant];
  const isHero = variant === 'hero';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(variants.wrapper, className)}
    >
      <div className="flex items-center justify-center gap-2 py-2">
        <AlertCircle className={cn(sizes.icon, isHero ? 'text-white/80' : 'text-amber-500')} />
        <span className={cn(sizes.headerText, isHero ? 'text-white font-medium' : 'text-amber-600 dark:text-amber-400 font-medium')}>
          已结束
        </span>
      </div>
    </motion.div>
  );
}

// ==================== 无效日期状态组件 ====================

interface InvalidDateStateProps {
  size: CountdownSize;
  variant: CountdownVariant;
  className?: string;
}

function InvalidDateState({ size, variant, className }: InvalidDateStateProps) {
  const sizes = sizeConfig[size];
  const variants = variantConfig[variant];
  const isHero = variant === 'hero';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(variants.wrapper, className)}
    >
      <div className="flex items-center justify-center gap-2 py-2">
        <AlertCircle className={cn(sizes.icon, isHero ? 'text-white/80' : 'text-red-500')} />
        <span className={cn(sizes.headerText, isHero ? 'text-white font-medium' : 'text-red-600 dark:text-red-400 font-medium')}>
          无效日期
        </span>
      </div>
    </motion.div>
  );
}


// ==================== 主组件 ====================

export function SeasonCountdown({
  endDate,
  size = 'default',
  variant = 'card',
  showLabel = true,
  label = '赛季倒计时',
  showIcon = true,
  onExpire,
  className,
  showSeconds = true,
}: SeasonCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [hasCalledExpire, setHasCalledExpire] = useState(false);

  // 解析日期
  const parsedDate = useMemo(() => parseDate(endDate), [endDate]);

  // 计算倒计时
  const updateCountdown = useCallback(() => {
    if (!parsedDate) {
      setTimeLeft(null);
      return;
    }

    const remaining = calculateTimeLeft(parsedDate);
    
    if (remaining === null) {
      setTimeLeft(null);
      setIsExpired(true);
      
      // 只调用一次过期回调
      if (!hasCalledExpire && onExpire) {
        setHasCalledExpire(true);
        onExpire();
      }
    } else {
      setTimeLeft(remaining);
      setIsExpired(false);
    }
  }, [parsedDate, onExpire, hasCalledExpire]);

  // 初始化和定时更新
  useEffect(() => {
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [updateCountdown]);

  // 重置过期回调状态（当 endDate 改变时）
  useEffect(() => {
    setHasCalledExpire(false);
  }, [endDate]);

  const sizes = sizeConfig[size];
  const variants = variantConfig[variant];

  // 无效日期
  if (!parsedDate) {
    return <InvalidDateState size={size} variant={variant} className={className} />;
  }

  // 已过期
  if (isExpired) {
    return <ExpiredState size={size} variant={variant} className={className} />;
  }

  // 加载中
  if (!timeLeft) {
    return (
      <div className={cn(variants.wrapper, className)}>
        <div className={cn('flex', sizes.container, 'animate-pulse')}>
          {[...Array(showSeconds ? 4 : 3)].map((_, i) => (
            <div key={i} className={cn(sizes.box, variant === 'hero' ? 'bg-white/10' : 'bg-gray-200 dark:bg-gray-700')} />
          ))}
        </div>
      </div>
    );
  }

  // 时间单元配置
  const timeUnits = [
    { value: timeLeft.days, label: '天' },
    { value: timeLeft.hours, label: '时' },
    { value: timeLeft.minutes, label: '分' },
    ...(showSeconds ? [{ value: timeLeft.seconds, label: '秒' }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(variants.wrapper, className)}
    >
      {/* 标签头部 */}
      {showLabel && variant !== 'minimal' && (
        <div className="flex items-center gap-2 mb-3">
          {showIcon && <Clock className={cn(sizes.icon, variants.iconColor)} />}
          <span className={cn(sizes.headerText, variants.headerColor)}>
            {label}
          </span>
        </div>
      )}

      {/* 倒计时显示 */}
      <div className={cn('flex items-center', sizes.container)}>
        {timeUnits.map((unit, index) => (
          <div key={unit.label} className="flex items-center">
            <TimeUnit
              value={unit.value}
              label={unit.label}
              size={size}
              variant={variant}
            />
            {index < timeUnits.length - 1 && (
              <Separator variant={variant} size={size} />
            )}
          </div>
        ))}
      </div>

      {/* minimal 变体的标签 */}
      {showLabel && variant === 'minimal' && (
        <div className="flex items-center gap-1 mt-1">
          {showIcon && <Clock className={cn(sizes.icon, variants.iconColor)} />}
          <span className={cn(sizes.label, variants.headerColor)}>{label}</span>
        </div>
      )}
    </motion.div>
  );
}

// ==================== 导出 ====================

export default SeasonCountdown;
