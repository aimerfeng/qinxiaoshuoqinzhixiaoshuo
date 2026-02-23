'use client';

import { Eye, Globe, MessageCircle, Activity, Users } from 'lucide-react';
import {
  SettingsPageHeader,
  SettingsSection,
  SettingsItem,
  SettingsToggle,
  SettingsRadioGroup,
} from '@/components/settings';
import type { RadioOption } from '@/components/settings';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import type { ProfileVisibility, DirectMessagePermission } from '@/types/settings';

/**
 * 隐私设置页面
 *
 * 需求21: 设置中心
 * 任务21.2.3: 隐私设置
 *
 * 需求21验收标准5: WHEN 用户设置主页隐私 THEN System SHALL 支持"公开/仅关注者/仅自己"三级
 *
 * 功能:
 * - 主页可见性（公开/仅关注者/仅自己）
 * - 在线状态显示开关
 * - 私信权限（所有人/仅关注者/不允许）
 * - 阅读动态显示开关
 */

/**
 * 主页可见性选项
 */
const profileVisibilityOptions: RadioOption<ProfileVisibility>[] = [
  {
    value: 'PUBLIC',
    label: '公开',
    description: '所有人都可以查看您的主页',
  },
  {
    value: 'FOLLOWERS_ONLY',
    label: '仅关注者',
    description: '只有关注您的人可以查看您的主页',
  },
  {
    value: 'PRIVATE',
    label: '仅自己',
    description: '只有您自己可以查看主页内容',
  },
];

/**
 * 私信权限选项
 */
const directMessageOptions: RadioOption<DirectMessagePermission>[] = [
  {
    value: 'EVERYONE',
    label: '所有人',
    description: '任何人都可以给您发送私信',
  },
  {
    value: 'FOLLOWERS_ONLY',
    label: '仅关注者',
    description: '只有关注您的人可以发送私信',
  },
  {
    value: 'NOBODY',
    label: '不允许',
    description: '不接收任何人的私信',
  },
];

export default function PrivacySettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettingsMutation = useUpdateSettings();

  /**
   * 处理主页可见性变更
   */
  const handleProfileVisibilityChange = async (value: ProfileVisibility) => {
    try {
      await updateSettingsMutation.mutateAsync({
        profileVisibility: value,
      });
    } catch (error) {
      console.error('Failed to update profile visibility:', error);
    }
  };

  /**
   * 处理在线状态开关
   */
  const handleOnlineStatusToggle = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({
        showOnlineStatus: enabled,
      });
    } catch (error) {
      console.error('Failed to update online status setting:', error);
    }
  };

  /**
   * 处理私信权限变更
   */
  const handleDirectMessageChange = async (value: DirectMessagePermission) => {
    try {
      await updateSettingsMutation.mutateAsync({
        allowDirectMessages: value,
      });
    } catch (error) {
      console.error('Failed to update direct message setting:', error);
    }
  };

  /**
   * 处理阅读动态开关
   */
  const handleReadingActivityToggle = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({
        showReadingActivity: enabled,
      });
    } catch (error) {
      console.error('Failed to update reading activity setting:', error);
    }
  };

  const isPending = updateSettingsMutation.isPending;

  return (
    <div className="max-w-2xl">
      <SettingsPageHeader
        title="隐私设置"
        description="控制您的个人信息和动态的可见范围"
        icon={<Eye className="w-6 h-6" />}
      />

      {/* 主页可见性 */}
      <SettingsSection
        title="主页可见性"
        description="设置谁可以查看您的个人主页"
      >
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                选择主页可见范围
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                控制谁可以看到您的个人资料、动态和收藏
              </p>
            </div>
          </div>
          <SettingsRadioGroup
            options={profileVisibilityOptions}
            value={settings?.profileVisibility ?? 'PUBLIC'}
            onChange={handleProfileVisibilityChange}
            disabled={isLoading || isPending}
          />
        </div>
      </SettingsSection>

      {/* 在线状态 */}
      <SettingsSection
        title="在线状态"
        description="控制是否显示您的在线状态"
      >
        <SettingsItem
          label="显示在线状态"
          description="其他用户可以看到您是否在线"
          icon={<Users className="w-5 h-5" />}
          disabled={isLoading}
        >
          <SettingsToggle
            checked={settings?.showOnlineStatus ?? true}
            onChange={handleOnlineStatusToggle}
            disabled={isLoading || isPending}
          />
        </SettingsItem>
      </SettingsSection>

      {/* 私信权限 */}
      <SettingsSection
        title="私信权限"
        description="设置谁可以给您发送私信"
      >
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                选择私信接收范围
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                控制谁可以向您发送私信消息
              </p>
            </div>
          </div>
          <SettingsRadioGroup
            options={directMessageOptions}
            value={settings?.allowDirectMessages ?? 'EVERYONE'}
            onChange={handleDirectMessageChange}
            disabled={isLoading || isPending}
          />
        </div>
      </SettingsSection>

      {/* 阅读动态 */}
      <SettingsSection
        title="阅读动态"
        description="控制是否公开您的阅读活动"
      >
        <SettingsItem
          label="显示阅读动态"
          description="其他用户可以看到您正在阅读的作品"
          icon={<Activity className="w-5 h-5" />}
          disabled={isLoading}
        >
          <SettingsToggle
            checked={settings?.showReadingActivity ?? true}
            onChange={handleReadingActivityToggle}
            disabled={isLoading || isPending}
          />
        </SettingsItem>
      </SettingsSection>

      {/* 隐私提示 */}
      <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>隐私提示：</strong>
        </p>
        <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
          <li>设置为"仅自己"后，其他用户将无法查看您的主页内容</li>
          <li>关闭在线状态后，您也将无法看到其他用户的在线状态</li>
          <li>私信权限设置不影响系统通知的接收</li>
          <li>您可以随时在黑名单中屏蔽特定用户</li>
        </ul>
      </div>
    </div>
  );
}
