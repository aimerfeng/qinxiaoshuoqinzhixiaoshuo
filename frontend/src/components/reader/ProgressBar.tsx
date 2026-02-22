'use client';

import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/cn';

interface ProgressBarProps {
  progress: number;
  visible: boolean;
}

/**
 * 阅读进度条
 *
 * 需求4验收标准5: WHEN 用户滚动阅读 THEN System SHALL 记录阅读进度并支持断点续读
 * 任务4.2.6: 阅读进度条
 */
export function ProgressBar({ progress, visible }: ProgressBarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed left-0 right-0 top-14 z-40 h-1 bg-muted"
        >
          <motion.div
            className={cn('h-full bg-gradient-primary', 'transition-all duration-150 ease-out')}
            style={{ width: `${progress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />

          {/* 进度百分比提示 */}
          <motion.div
            className={cn(
              'absolute top-2 rounded-md px-2 py-1',
              'bg-card/90 border border-border backdrop-blur-sm',
              'text-xs text-foreground shadow-sm',
              '-translate-x-1/2 transform'
            )}
            style={{ left: `${Math.min(Math.max(progress, 5), 95)}%` }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {Math.round(progress)}%
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 底部进度指示器（简化版）
 */
export function BottomProgressIndicator({ progress }: { progress: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-primary transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs text-muted-foreground">{Math.round(progress)}%</span>
    </div>
  );
}
