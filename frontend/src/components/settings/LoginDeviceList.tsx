/**
 * 登录设备列表组件
 *
 * 需求21: 设置中心
 * 任务21.2.2: 账户安全设置
 *
 * 需求21验收标准2: WHEN 用户查看登录设备 THEN System SHALL 显示设备名称、登录时间、IP地址
 * 需求21验收标准3: WHEN 用户移除登录设备 THEN System SHALL 使该设备的会话失效
 *
 * 功能:
 * - 显示设备名称、类型、浏览器、操作系统
 * - 显示IP地址和位置
 * - 显示最后活跃时间
 * - 当前设备标识
 * - 移除设备按钮
 * - 移除所有其他设备
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  MapPin,
  Clock,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  LogOut,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  useLoginDevices,
  useRemoveDevice,
  useRemoveAllOtherDevices,
} from '@/hooks/useLoginDevices';
import type { LoginDevice } from '@/types/settings';

interface LoginDeviceListProps {
  className?: string;
}

/**
 * 设备类型图标映射
 */
const deviceTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  mobile: Smartphone,
  desktop: Monitor,
  tablet: Tablet,
  unknown: Globe,
};

/**
 * 格式化时间
 */
function formatLastActive(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(date).toLocaleDateString('zh-CN');
}

/**
 * 单个设备项组件
 */
function DeviceItem({
  device,
  onRemove,
  isRemoving,
}: {
  device: LoginDevice;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const DeviceIcon = deviceTypeIcons[device.deviceType] || deviceTypeIcons.unknown;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        'flex items-start gap-4 p-4',
        'border-b border-gray-100 dark:border-gray-800 last:border-b-0',
        device.isCurrentDevice && 'bg-indigo-50/50 dark:bg-indigo-900/10'
      )}
    >
      {/* 设备图标 */}
      <div
        className={cn(
          'flex-shrink-0 p-3 rounded-xl',
          device.isCurrentDevice
            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        )}
      >
        <DeviceIcon className="w-6 h-6" />
      </div>

      {/* 设备信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {device.deviceName || '未知设备'}
          </p>
          {device.isCurrentDevice && (
            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
              当前设备
            </span>
          )}
        </div>

        {/* 浏览器和操作系统 */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {device.browser} · {device.os}
        </p>

        {/* IP地址和位置 */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
          {device.ipAddress && (
            <div className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              <span>{device.ipAddress}</span>
            </div>
          )}
          {device.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{device.location}</span>
            </div>
          )}
        </div>

        {/* 最后活跃时间 */}
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 dark:text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {device.isCurrentDevice
              ? '当前在线'
              : `最后活跃：${formatLastActive(device.lastActiveAt)}`}
          </span>
        </div>
      </div>

      {/* 移除按钮 */}
      {!device.isCurrentDevice && (
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className={cn(
            'flex-shrink-0 p-2 rounded-lg',
            'text-gray-400 hover:text-red-500',
            'hover:bg-red-50 dark:hover:bg-red-900/20',
            'transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="移除此设备"
        >
          {isRemoving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Trash2 className="w-5 h-5" />
          )}
        </button>
      )}
    </motion.div>
  );
}

export default function LoginDeviceList({ className }: LoginDeviceListProps) {
  const { data, isLoading, error } = useLoginDevices();
  const removeDeviceMutation = useRemoveDevice();
  const removeAllOthersMutation = useRemoveAllOtherDevices();
  const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null);
  const [showConfirmRemoveAll, setShowConfirmRemoveAll] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRemoveDevice = async (deviceId: string) => {
    setRemovingDeviceId(deviceId);
    try {
      await removeDeviceMutation.mutateAsync(deviceId);
      setSuccessMessage('设备已移除');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      // Error handled by mutation
    } finally {
      setRemovingDeviceId(null);
    }
  };

  const handleRemoveAllOthers = async () => {
    try {
      await removeAllOthersMutation.mutateAsync();
      setShowConfirmRemoveAll(false);
      setSuccessMessage('已移除所有其他设备');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      // Error handled by mutation
    }
  };

  const devices = data?.devices || [];
  const otherDevicesCount = devices.filter((d) => !d.isCurrentDevice).length;

  // 加载状态
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          加载设备列表失败
        </p>
      </div>
    );
  }

  // 空状态
  if (devices.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Monitor className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          暂无登录设备记录
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 成功提示 */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          >
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-600 dark:text-green-400">
              {successMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 移除所有其他设备按钮 */}
      {otherDevicesCount > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          {showConfirmRemoveAll ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between gap-4"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">
                确定要移除所有其他设备吗？
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmRemoveAll(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleRemoveAllOthers}
                  disabled={removeAllOthersMutation.isPending}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                    'text-sm font-medium text-white',
                    'bg-red-500 hover:bg-red-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-colors'
                  )}
                >
                  {removeAllOthersMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  确认移除
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowConfirmRemoveAll(true)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                'text-sm font-medium',
                'text-red-600 dark:text-red-400',
                'hover:bg-red-50 dark:hover:bg-red-900/20',
                'transition-colors'
              )}
            >
              <LogOut className="w-4 h-4" />
              移除所有其他设备 ({otherDevicesCount})
            </button>
          )}
        </div>
      )}

      {/* 设备列表 */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        <AnimatePresence mode="popLayout">
          {devices.map((device) => (
            <DeviceItem
              key={device.id}
              device={device}
              onRemove={() => handleRemoveDevice(device.id)}
              isRemoving={removingDeviceId === device.id}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* 提示信息 */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          移除设备后，该设备上的登录状态将失效，需要重新登录。
        </p>
      </div>
    </div>
  );
}
