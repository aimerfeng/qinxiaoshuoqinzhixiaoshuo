'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Save,
  Loader2,
  Bell,
  Shield,
  Coins,
  Users,
  FileText,
} from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 系统配置页面
 *
 * 需求18: 管理后台
 * 任务18.2.7: 系统配置页面
 *
 * 基础配置项
 */

interface ConfigSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: ConfigItem[];
}

interface ConfigItem {
  key: string;
  label: string;
  description: string;
  type: 'toggle' | 'number' | 'text';
  value: boolean | number | string;
}

const initialConfig: ConfigSection[] = [
  {
    id: 'general',
    title: '通用设置',
    icon: <Settings className="w-5 h-5" />,
    items: [
      {
        key: 'siteName',
        label: '站点名称',
        description: '显示在页面标题和品牌位置',
        type: 'text',
        value: 'Project Anima',
      },
      {
        key: 'maintenanceMode',
        label: '维护模式',
        description: '开启后普通用户无法访问',
        type: 'toggle',
        value: false,
      },
    ],
  },
  {
    id: 'user',
    title: '用户设置',
    icon: <Users className="w-5 h-5" />,
    items: [
      {
        key: 'allowRegistration',
        label: '开放注册',
        description: '是否允许新用户注册',
        type: 'toggle',
        value: true,
      },
      {
        key: 'emailVerificationRequired',
        label: '邮箱验证',
        description: '注册时是否需要验证邮箱',
        type: 'toggle',
        value: true,
      },
      {
        key: 'defaultDailyTokens',
        label: '每日签到奖励',
        description: '用户每日签到获得的零芥子数量',
        type: 'number',
        value: 10,
      },
    ],
  },
  {
    id: 'content',
    title: '内容设置',
    icon: <FileText className="w-5 h-5" />,
    items: [
      {
        key: 'contentReviewRequired',
        label: '内容审核',
        description: '发布内容是否需要审核',
        type: 'toggle',
        value: false,
      },
      {
        key: 'maxChapterLength',
        label: '章节字数上限',
        description: '单章节最大字数限制',
        type: 'number',
        value: 50000,
      },
      {
        key: 'minCommentLength',
        label: '评论字数下限',
        description: '评论最小字数要求',
        type: 'number',
        value: 1,
      },
    ],
  },
  {
    id: 'token',
    title: '代币设置',
    icon: <Coins className="w-5 h-5" />,
    items: [
      {
        key: 'tipMinAmount',
        label: '打赏最小金额',
        description: '单次打赏的最小零芥子数量',
        type: 'number',
        value: 1,
      },
      {
        key: 'tipMaxAmount',
        label: '打赏最大金额',
        description: '单次打赏的最大零芥子数量',
        type: 'number',
        value: 1000,
      },
      {
        key: 'activityRewardMax',
        label: '活动奖励上限',
        description: '单个活动单人最大奖励',
        type: 'number',
        value: 100,
      },
    ],
  },
  {
    id: 'notification',
    title: '通知设置',
    icon: <Bell className="w-5 h-5" />,
    items: [
      {
        key: 'emailNotifications',
        label: '邮件通知',
        description: '是否发送邮件通知',
        type: 'toggle',
        value: true,
      },
      {
        key: 'pushNotifications',
        label: '推送通知',
        description: '是否发送浏览器推送通知',
        type: 'toggle',
        value: true,
      },
    ],
  },
  {
    id: 'security',
    title: '安全设置',
    icon: <Shield className="w-5 h-5" />,
    items: [
      {
        key: 'maxLoginAttempts',
        label: '最大登录尝试',
        description: '连续登录失败后锁定账户的次数',
        type: 'number',
        value: 5,
      },
      {
        key: 'sessionTimeout',
        label: '会话超时(分钟)',
        description: '用户无操作后自动登出的时间',
        type: 'number',
        value: 1440,
      },
      {
        key: 'enableCaptcha',
        label: '验证码',
        description: '登录和注册时是否需要验证码',
        type: 'toggle',
        value: true,
      },
    ],
  },
];

export default function AdminSettingsPage() {
  const [config, setConfig] = useState(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (sectionId: string, key: string, value: boolean | number | string) => {
    setConfig((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.key === key ? { ...item, value } : item
              ),
            }
          : section
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // 模拟保存
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
            <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">系统设置</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">配置平台基础参数</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all',
            hasChanges
              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          )}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          保存更改
        </button>
      </div>

      {/* 配置区块 */}
      <div className="grid gap-6">
        {config.map((section, sectionIndex) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.05 }}
            className={cn(
              'p-6 rounded-2xl',
              'bg-white/60 dark:bg-gray-900/60',
              'backdrop-blur-xl border border-white/20 dark:border-gray-700/30'
            )}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                {section.icon}
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{section.title}</h2>
            </div>

            <div className="space-y-4">
              {section.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {item.type === 'toggle' && (
                      <button
                        onClick={() => handleChange(section.id, item.key, !item.value)}
                        className={cn(
                          'relative w-12 h-6 rounded-full transition-colors',
                          item.value
                            ? 'bg-indigo-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                            item.value ? 'left-7' : 'left-1'
                          )}
                        />
                      </button>
                    )}
                    {item.type === 'number' && (
                      <input
                        type="number"
                        value={item.value as number}
                        onChange={(e) => handleChange(section.id, item.key, parseInt(e.target.value) || 0)}
                        className={cn(
                          'w-24 px-3 py-2 rounded-xl text-right',
                          'bg-gray-50 dark:bg-gray-800',
                          'border border-gray-200 dark:border-gray-700',
                          'text-gray-900 dark:text-white',
                          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
                        )}
                      />
                    )}
                    {item.type === 'text' && (
                      <input
                        type="text"
                        value={item.value as string}
                        onChange={(e) => handleChange(section.id, item.key, e.target.value)}
                        className={cn(
                          'w-48 px-3 py-2 rounded-xl',
                          'bg-gray-50 dark:bg-gray-800',
                          'border border-gray-200 dark:border-gray-700',
                          'text-gray-900 dark:text-white',
                          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
                        )}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
