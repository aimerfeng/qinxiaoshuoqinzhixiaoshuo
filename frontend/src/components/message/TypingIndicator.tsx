'use client';

import { motion } from 'motion/react';
import { cn } from '@/utils/cn';

interface TypingIndicatorProps {
  username?: string;
  className?: string;
}

/**
 * 输入中指示器组件
 *
 * 需求20: 私信系统
 * 任务20.2.3: 聊天界面 - 输入中指示器（可选）
 */
export default function TypingIndicator({
  username,
  className,
}: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn('flex items-center gap-2 px-4 py-2', className)}
    >
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -4, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
            }}
            className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
          />
        ))}
      </div>
      {username && (
        <span className="text-xs text-gray-400">
          {username} 正在输入...
        </span>
      )}
    </motion.div>
  );
}
