/**
 * 账户安全设置页面
 *
 * 需求21: 设置中心
 * 任务21.2.2: 账户安全设置
 *
 * 需求21验收标准2: WHEN 用户查看登录设备 THEN System SHALL 显示设备名称、登录时间、IP地址
 * 需求21验收标准3: WHEN 用户移除登录设备 THEN System SHALL 使该设备的会话失效
 *
 * 功能:
 * - 修改密码
 * - 两步验证开关
 * - 登录通知开关
 * - 登录设备管理
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Key,
  Smartphone,
  Bell,
  Monitor,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  SettingsPageHeader,
  SettingsSection,
  SettingsItem,
  SettingsToggle,
  ChangePasswordForm,
  LoginDeviceList,
} from '@/components/settings';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';

/**
 * 弹窗组件
 */
function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* 弹窗内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
              'w-full max-w-md mx-4',
              'bg-white dark:bg-gray-900',
              'rounded-2xl shadow-2xl',
              'overflow-hidden'
            )}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function SecuritySettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettingsMutation = useUpdateSettings();

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDevicesModal, setShowDevicesModal] = useState(false);

  /**
   * 处理两步验证开关
   */
  const handleTwoFactorToggle = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({
        twoFactorEnabled: enabled,
      });
    } catch (error) {
      console.error('Failed to update two-factor setting:', error);
    }
  };

  /**
   * 处理登录通知开关
   */
  const handleLoginNotificationToggle = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({
        loginNotificationEnabled: enabled,
      });
    } catch (error) {
      console.error('Failed to update login notification setting:', error);
    }
  };

  return (
    <div className="max-w-2xl">
      <SettingsPageHeader
        title="账户安全"
        description="管理您的密码、登录设备和安全设置，保护账户安全"
        icon={<Shield className="w-6 h-6" />}
      />

      {/* 密码设置 */}
      <SettingsSection title="密码" description="定期更换密码可以提高账户安全性">
        <SettingsItem
          label="修改密码"
          description="建议定期更换密码以保护账户安全"
          icon={<Key className="w-5 h-5" />}
          showArrow
          onClick={() => setShowChangePasswordModal(true)}
        />
      </SettingsSection>

      {/* 两步验证 */}
      <SettingsSection title="两步验证" description="为账户添加额外的安全保护">
        <SettingsItem
          label="启用两步验证"
          description="登录时需要输入手机验证码"
          icon={<Smartphone className="w-5 h-5" />}
          disabled={isLoading}
        >
          <SettingsToggle
            checked={settings?.twoFactorEnabled ?? false}
            onChange={handleTwoFactorToggle}
            disabled={isLoading || updateSettingsMutation.isPending}
          />
        </SettingsItem>
      </SettingsSection>

      {/* 登录通知 */}
      <SettingsSection title="登录通知" description="在新设备登录时收到通知">
        <SettingsItem
          label="登录通知"
          description="当有新设备登录您的账户时发送通知"
          icon={<Bell className="w-5 h-5" />}
          disabled={isLoading}
        >
          <SettingsToggle
            checked={settings?.loginNotificationEnabled ?? false}
            onChange={handleLoginNotificationToggle}
            disabled={isLoading || updateSettingsMutation.isPending}
          />
        </SettingsItem>
      </SettingsSection>

      {/* 登录设备管理 */}
      <SettingsSection title="登录设备" description="查看和管理已登录的设备">
        <SettingsItem
          label="设备管理"
          description="查看所有登录设备，移除可疑设备"
          icon={<Monitor className="w-5 h-5" />}
          showArrow
          onClick={() => setShowDevicesModal(true)}
        />
      </SettingsSection>

      {/* 安全提示 */}
      <div className="mt-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
        <p className="text-sm text-indigo-800 dark:text-indigo-200">
          <strong>安全提示：</strong>
        </p>
        <ul className="text-sm text-indigo-700 dark:text-indigo-300 mt-2 space-y-1 list-disc list-inside">
          <li>使用强密码，包含大小写字母、数字和特殊字符</li>
          <li>不要在多个网站使用相同的密码</li>
          <li>定期检查登录设备，移除不认识的设备</li>
          <li>开启两步验证可以大幅提高账户安全性</li>
        </ul>
      </div>

      {/* 修改密码弹窗 */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        title="修改密码"
      >
        <ChangePasswordForm
          onSuccess={() => setShowChangePasswordModal(false)}
          onCancel={() => setShowChangePasswordModal(false)}
        />
      </Modal>

      {/* 设备管理弹窗 */}
      <Modal
        isOpen={showDevicesModal}
        onClose={() => setShowDevicesModal(false)}
        title="登录设备管理"
      >
        <div className="-mx-6 -mb-6">
          <LoginDeviceList />
        </div>
      </Modal>
    </div>
  );
}
