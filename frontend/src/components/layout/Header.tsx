'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, BookOpen, Menu, X, Library } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/auth';
import { NotificationBell } from '@/components/notification';
import { MessageIcon } from '@/components/message';
import { APP_NAME } from '@/constants';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/', label: '首页', icon: <Home className="w-5 h-5" /> },
  { href: '/plaza', label: '广场', icon: <Compass className="w-5 h-5" /> },
  { href: '/wenku8', label: '文库', icon: <Library className="w-5 h-5" /> },
  { href: '/reading-list', label: '书架', icon: <BookOpen className="w-5 h-5" /> },
];

/**
 * 全局头部导航组件
 *
 * 需求20: 私信系统
 * 任务20.2.1: 私信入口 - Header 中的消息图标
 *
 * 功能:
 * - 显示 Logo 和导航链接
 * - 显示通知图标和未读数
 * - 显示私信图标和未读数
 * - 显示用户头像/登录入口
 * - 响应式移动端菜单
 */
export default function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
          >
            {APP_NAME}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Message Icon */}
                <MessageIcon />

                {/* Notification Bell */}
                <NotificationBell />

                {/* User Avatar */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName || user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {(user?.displayName || user?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  登录
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:shadow-md transition-shadow"
                >
                  注册
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-900"
          >
            <nav className="px-4 py-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
