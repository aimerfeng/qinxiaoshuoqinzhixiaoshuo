'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Shield,
  Eye,
  Bell,
  BookOpen,
  Palette,
  UserX,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SettingsCategory, SettingsNavItem } from '@/types/settings';

/**
 * 设置侧边栏组件
 *
 * 需求21: 设置中心
 * 任务21.2.1: 设置中心页面布局
 *
 * 需求21验收标准1: WHEN 用户进入设置中心 THEN System SHALL 显示分类设置菜单
 *
 * 设置分类:
 * - 账户安全 (Account Security) - /settings/security
 * - 隐私设置 (Privacy) - /settings/privacy
 * - 通知设置 (Notifications) - /settings/notifications
 * - 阅读设置 (Reading) - /settings/reading
 * - 主题设置 (Theme) - /settings/theme
 * - 黑名单管理 (Blacklist) - /settings/blacklist
 */

interface SettingsSidebarProps {
  className?: string;
  onItemClick?: () => void;
}

/**
 * 设置导航项配置
 */
export const settingsNavItems: SettingsNavItem[] = [
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

/**
 * 获取当前激活的设置分类
 */
export function getActiveCategory(pathname: string): SettingsCategory | null {
  for (const item of settingsNavItems) {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      return item.id;
    }
  }
  // 默认返回 security
  if (pathname === '/settings') {
    return 'security';
  }
  return null;
}

export default function SettingsSidebar({
  className,
  onItemClick,
}: SettingsSidebarProps) {
  const pathname = usePathname();

  /**
   * 检查导航项是否激活
   */
  const isNavItemActive = (href: string) => {
    if (href === '/settings/security' && pathname === '/settings') {
      return true;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav className={cn('space-y-1', className)}>
      {settingsNavItems.map((item) => {
        const Icon = iconMap[item.icon];
        const isActive = isNavItemActive(item.href);

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onItemClick}
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
                layoutId="settings-sidebar-indicator"
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
      })}
    </nav>
  );
}
