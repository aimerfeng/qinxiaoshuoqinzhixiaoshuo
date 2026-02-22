'use client';

import { motion } from 'motion/react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  MemberApplicationStatus,
  APPLICATION_STATUS_NAMES,
  APPLICATION_STATUS_COLORS,
} from '@/types/membership';

export interface ApplicationStatusBadgeProps {
  status: MemberApplicationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: {
    container: 'px-2 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-2.5 py-1 text-sm gap-1.5',
    icon: 'w-4 h-4',
  },
  lg: {
    container: 'px-3 py-1.5 text-base gap-2',
    icon: 'w-5 h-5',
  },
};

const statusIcons = {
  [MemberApplicationStatus.PENDING]: Clock,
  [MemberApplicationStatus.APPROVED]: CheckCircle,
  [MemberApplicationStatus.REJECTED]: XCircle,
};

/**
 * 申请状态徽章组件
 *
 * 需求14: 会员等级体系
 * 任务14.2.4: 会员申请页面
 */
export function ApplicationStatusBadge({
  status,
  size = 'sm',
  showIcon = true,
  animated = true,
  className,
}: ApplicationStatusBadgeProps) {
  const sizes = sizeConfig[size];
  const colors = APPLICATION_STATUS_COLORS[status];
  const statusName = APPLICATION_STATUS_NAMES[status];
  const Icon = statusIcons[status];

  const content = (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        'rounded-lg font-medium',
        'border',
        sizes.container,
        colors.text,
        colors.bg,
        colors.border,
        className
      )}
    >
      {showIcon && <Icon className={sizes.icon} />}
      <span>{statusName}</span>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export default ApplicationStatusBadge;
