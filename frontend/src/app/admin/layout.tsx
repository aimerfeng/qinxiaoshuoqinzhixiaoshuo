'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  AlertTriangle,
  BarChart3,
  Settings,
  ChevronLeft,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 管理后台布局
 *
 * 需求18: 管理后台
 * 需求19: 风控与反作弊系统 - 风控管理前端
 *
 * 提供管理后台的侧边栏导航和布局结构
 */

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  {
    label: '数据看板',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: '用户管理',
    href: '/admin/users',
    icon: Users,
  },
  {
    label: '内容审核',
    href: '/admin/content',
    icon: FileText,
  },
  {
    label: '会员审核',
    href: '/admin/membership',
    icon: UserCheck,
  },
  {
    label: '活动管理',
    href: '/admin/activities',
    icon: Calendar,
  },
  {
    label: '风控中心',
    href: '/admin/risk-control',
    icon: Shield,
    children: [
      {
        label: '风控告警',
        href: '/admin/risk-control/alerts',
        icon: AlertTriangle,
      },
      {
        label: '风控报告',
        href: '/admin/risk-control/reports',
        icon: BarChart3,
      },
    ],
  },
  {
    label: '系统设置',
    href: '/admin/settings',
    icon: Settings,
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/20">
      {/* 侧边栏 */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64',
          'bg-white/80 dark:bg-gray-900/80',
          'backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50',
          'z-40'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">返回前台</span>
          </Link>
        </div>

        {/* 标题 */}
        <div className="px-6 py-4">
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            管理后台
          </h1>
        </div>

        {/* 导航 */}
        <nav className="px-3 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const hasChildren = item.children && item.children.length > 0;
            const isChildActive = hasChildren && item.children.some(
              (child) => pathname === child.href || pathname.startsWith(child.href + '/')
            );

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1',
                    'text-sm font-medium transition-all duration-200',
                    isActive || isChildActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>

                {/* 子菜单 */}
                {hasChildren && (isActive || isChildActive) && (
                  <div className="ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                    {item.children.map((child) => {
                      const isChildItemActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg mb-1',
                            'text-sm transition-all duration-200',
                            isChildItemActive
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          )}
                        >
                          <child.icon className="w-4 h-4" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="ml-64 min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="p-6"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
