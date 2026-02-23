'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Eye,
  Bell,
  BookOpen,
  Palette,
  UserX,
  ChevronLeft,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SettingsNavItem } from '@/types/settings';

/**
 * 设置中心布局
 *
 * 需求21: 设置中心
 * 任务21.2.1: 设置中心页面布局
 *
 * 需求21验收标准1: WHEN 用户进入设置中心 THEN System SHALL 显示分类设置菜单
 *
 * 功能:
 * - 左侧边栏导航（设置分类）
 * - 主内容区域
 * - 响应式设计（移动端侧边栏折叠）
 */

interface SettingsLayoutProps {
  children: ReactNode;
}

/**
 * 设置导航项配置
 */
const settingsNavItems: SettingsNavItem[] = [
  {
    id: 'security',
    label: '账户安全',
    description: '密码、邮箱、登录设备',
    href: '/settings/security',
    icon: 'Shield',
  },
  {
    id: 'privacy',
    label: '隐私设置',
    description: '主页可见性、在线状态',
    href: '/settings/privacy',
    icon: 'Eye',
  },
  {
    id: 'notifications',
    label: '通知设置',
    description: '通知开关、免打扰时段',
    href: '/settings/notifications',
    icon: 'Bell',
  },
  {
    id: 'reading',
    label: '阅读设置',
    description: '字体、行距、背景色',
    href: '/settings/reading',
    icon: 'BookOpen',
  },
  {
    id: 'theme',
    label: '主题设置',
    description: '主题切换、自定义配色',
    href: '/settings/theme',
    icon: 'Palette',
  },
  {
    id: 'blacklist',
    label: '黑名单管理',
    description: '拉黑用户列表',
    href: '/settings/blacklist',
    icon: 'UserX',
  },
];

/**
 * 图标映射
 */
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Eye,
  Bell,
  BookOpen,
  Palette,
  UserX,
};

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  /**
   * 检查导航项是否激活
   */
  const isNavItemActive = (href: string) => {
    if (href === '/settings/security' && pathname === '/settings') {
      return true;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  /**
   * 渲染导航项
   */
  const renderNavItem = (item: SettingsNavItem, onClick?: () => void) => {
    const Icon = iconMap[item.icon];
    const isActive = isNavItemActive(item.href);

    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={onClick}
        className={cn(
          'flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-200',
          'group relative',
          isActive
            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        )}
      >
        {/* 激活指示器 */}
        {isActive && (
          <motion.div
            layoutId="settings-nav-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}

        {/* 图标 */}
        <div
          className={cn(
            'flex-shrink-0 p-2 rounded-lg transition-colors',
            isActive
              ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
          )}
        >
          {Icon && <Icon className="w-5 h-5" />}
        </div>

        {/* 文字 */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium transition-colors',
              isActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-900 dark:text-white'
            )}
          >
            {item.label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {item.description}
          </p>
        </div>
      </Link>
    );
  };

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

          <h1 className="text-base font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            设置中心
          </h1>

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
            <nav className="p-4 space-y-1">
              {settingsNavItems.map((item) =>
                renderNavItem(item, () => setIsMobileSidebarOpen(false))
              )}
            </nav>
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
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            设置中心
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            管理您的账户和偏好设置
          </p>
        </div>

        {/* 导航菜单 */}
        <nav className="px-3 py-2 space-y-1">
          {settingsNavItems.map((item) => renderNavItem(item))}
        </nav>
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
