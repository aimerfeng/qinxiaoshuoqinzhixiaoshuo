'use client';

import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * 离线页面
 *
 * 需求11: 离线与本地存储
 * WHEN 用户处于离线状态 THEN System SHALL 显示离线提示页面
 */
export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
          <WifiOff className="w-10 h-10 text-gray-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          网络连接已断开
        </h1>
        
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          请检查您的网络连接后重试。已缓存的内容仍可离线阅读。
        </p>
        
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          重新连接
        </button>
        
        <div className="mt-8 text-sm text-gray-400">
          <p>提示：您可以访问已下载的章节进行离线阅读</p>
        </div>
      </div>
    </div>
  );
}
