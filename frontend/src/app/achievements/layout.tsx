'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  ChevronLeft,
  Menu,
  X,
  Award,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { AchievementCategoryNav } from '@/components/achievement';
import { useUserAchievementStats } from '@/hooks/useAchievements';

/**
 * 成就中心布局
 *
 * 需求24: 成就系统
 * 任务24.2.1: 成就中心页面布局
 *
 * 功能:
 * - 左侧边栏导航（成就分类）
 * - 主内容区域
 * - 响应式设计（移动端侧边栏折叠）
 * - 渐变紫蓝主题色
 * - 毛玻璃效果
 */

interface AchievementsLayoutProps {
  children: ReactNode;
}

export default function AchievementsLayout({ children }: AchievementsLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // 获取成就统计数据用于显示类别计数
  const { data: stats } = useUserAchievementStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/20">
      {/* 移动端顶部栏 */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between px-4 h-14">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">返回</span>
          </Link>

          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500" />
            <h1 className="text-base font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              成就中心
            </h1>
          </div>

          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="切换菜单"
          >
            {isMobileSidebarOpen ? (
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* 移动端侧边栏遮罩 */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* 移动端侧边栏 */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'lg:hidden fixed left-0 top-14 bottom-0 w-72 z-50',
              'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl',
              'border-r border-gray-200/50 dark:border-gray-700/50',
              'overflow-y-auto'
            )}
          >
            <div className="p-4">
              <AchievementCategoryNav
                orientation="vertical"
                useLinks
                showDescription
                showCounts
                stats={stats}
                basePath="/achievements"
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 桌面端侧边栏 */}
      <aside
        className={cn(
          'hidden lg:block fixed left-0 top-0 h-full w-72',
          'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl',
          'border-r border-gray-200/50 dark:border-gray-700/50',
          'z-40'
        )}
      >
        {/* 返回按钮 */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">返回首页</span>
          </Link>
        </div>

        {/* 标题 */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                成就中心
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                探索并解锁成就
              </p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <div className="px-3 py-2">
          <AchievementCategoryNav
            orientation="vertical"
            useLinks
            showDescription
            showCounts
            stats={stats}
            basePath="/achievements"
          />
        </div>

        {/* 底部装饰 */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-indigo-50/50 dark:from-indigo-950/20 to-transparent pointer-events-none" />
      </aside>

      {/* 主内容区 */}
      <main className="lg:ml-72 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 lg:p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
