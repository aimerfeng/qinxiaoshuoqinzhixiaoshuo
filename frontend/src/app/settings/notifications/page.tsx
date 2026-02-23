'use client';

import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Heart,
  UserPlus,
  AtSign,
  RefreshCw,
} from 'lucide-react';
import {
  SettingsPageHeader,
  SettingsSection,
  SettingsItem,
  SettingsToggle,
} from '@/components/settings';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';

export default function NotificationsSettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const isPending = updateSettingsMutation.isPending;

  const handleEmailNotificationsToggle = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({ emailNotifications: enabled });
    } catch (error) {
      console.error('Failed to update email notifications setting:', error);
    }
  };

  const handlePushNotificationsToggle = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({ pushNotifications: enabled });
    } catch (error) {
      console.error('Failed to update push notifications setting:', error);
    }
  };

  const handleCommentNotificationsToggle = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({ commentNotifications: enabled });
    } catch (error) {
      console.error('Failed to update comment notifications setting:', error);
    }
  };

  const handleLikeNotificationsToggle = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({ likeNotifications: enabled });
    } catch (error) {
      console.error('Failed to update like notifications setting:', error);
    }
  };

  const handleFollowNotificationsToggle = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({ followNotifications: enabled });
    } catch (error) {
      console.error('Failed to update follow notifications setting:', error);
    }
  };

  const handleMentionNotificationsToggle = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({ mentionNotifications: enabled });
    } catch (error) {
      console.error('Failed to update mention notifications setting:', error);
    }
  };

  const handleUpdateNotificationsToggle = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({ updateNotifications: enabled });
    } catch (error) {
      console.error('Failed to update update notifications setting:', error);
    }
  };

  return (
    <div className="max-w-2xl">
      <SettingsPageHeader
        title="通知设置"
        description="管理您接收通知的方式和类型"
        icon={<Bell className="w-6 h-6" />}
      />
      <SettingsSection title="通知渠道" description="选择接收通知的方式">
        <SettingsItem
          label="邮件通知"
          description="通过邮件接收重要通知"
          icon={<Mail className="w-5 h-5" />}
          disabled={isLoading}
        >
          <SettingsToggle
            checked={settings?.emailNotifications ?? true}
            onChange={handleEmailNotificationsToggle}
            disabled={isLoading || isPending}
          />
        </SettingsItem>
        <SettingsItem
          label="推送通知"
          description="通过浏览器推送接收实时通知"
          icon={<Smartphone className="w-5 h-5" />}
          disabled={isLoading}
        >
          <SettingsToggle
            checked={settings?.pushNotifications ?? true}
            onChange={handlePushNotificationsToggle}
            disabled={isLoading || isPending}
          />
        </SettingsItem>
      </SettingsSection>
      <SettingsSection title="通知类型" description="选择您想要接收的通知类型">
        <SettingsItem
          label="评论通知"
          description="当有人评论您的作品或动态时通知您"
          icon={<MessageSquare className="w-5 h-5" />}
          disabled={isLoading}
        >
          <SettingsToggle
            checked={settings?.commentNotifications ?? true}
            onChange={handleCommentNotificationsToggle}
            disabled={isLoading || isPending}
          />
        </SettingsItem>
        <SettingsItem
          label="点赞通知"
          description="当有人点赞您的内容时通知您"
          icon={<Heart className="w-5 h-5" />}
          disabled={isLoading}
        >
          <SettingsToggle
            checked={settings?.likeNotifications ?? true}
            onChange={handleLikeNotificationsToggle}
            disabled={isLoading || isPending}
          />
        </SettingsItem>
        <SettingsItem
          label="关注通知"
          description="当有人关注您时通知您"
          icon={<UserPlus className="w-5 h-5" />}
          disabled={isLoading}
        >
          <SettingsToggle
            checked={settings?.followNotifications ?? true}
            onChange={handleFollowNotificationsToggle}
            disabled={isLoading || isPending}
          />
        </SettingsItem>
        <SettingsItem
          label="@提及通知"
          description="当有人在评论或动态中@您时通知您"
          icon={<AtSign className="w-5 h-5" />}
          disabled={isLoading}
        >
          <SettingsToggle
            checked={settings?.mentionNotifications ?? true}
            onChange={handleMentionNotificationsToggle}
            disabled={isLoading || isPending}
          />
        </SettingsItem>
        <SettingsItem
          label="更新通知"
          description="当您关注的作品有更新时通知您"
          icon={<RefreshCw className="w-5 h-5" />}
          disabled={isLoading}
        >
          <SettingsToggle
            checked={settings?.updateNotifications ?? true}
            onChange={handleUpdateNotificationsToggle}
            disabled={isLoading || isPending}
          />
        </SettingsItem>
      </SettingsSection>
      <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>通知提示：</strong>
        </p>
        <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
          <li>关闭邮件通知后，您仍可在站内查看所有通知</li>
          <li>推送通知需要浏览器授权，首次开启时会弹出授权请求</li>
          <li>系统通知（如账户安全相关）不受此设置影响</li>
          <li>您可以在通知中心查看和管理所有历史通知</li>
        </ul>
      </div>
    </div>
  );
}
