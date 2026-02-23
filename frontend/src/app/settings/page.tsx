'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * 设置中心主页
 *
 * 需求21: 设置中心
 * 任务21.2.1: 设置中心页面布局
 *
 * 默认重定向到账户安全设置页面
 */
export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // 默认重定向到账户安全设置
    router.replace('/settings/security');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          正在加载设置...
        </p>
      </div>
    </div>
  );
}
