'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Type, AlignJustify, Palette, Moon, Clock } from 'lucide-react';
import {
  SettingsPageHeader,
  SettingsSection,
  SettingsItem,
  SettingsToggle,
  SettingsRadioGroup,
  SettingsSlider,
  SettingsTimePicker,
} from '@/components/settings';
import type { RadioOption } from '@/components/settings';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { cn } from '@/utils/cn';

/**
 * 阅读设置页面
 *
 * 需求21: 设置中心
 * 任务21.2.5: 阅读设置
 *
 * 需求21验收标准8: WHEN 用户修改阅读设置 THEN System SHALL 保存为默认配置并同步到云端
 *
 * 功能:
 * - 字体大小 (12-32)
 * - 行高 (1.2-3.0)
 * - 阅读主题 (默认/护眼/暗黑)
 * - 自动夜间模式
 * - 夜间模式时段
 * - 预览效果
 */

/** 阅读主题选项 */
const readingThemeOptions: RadioOption[] = [
  {
    value: 'default',
    label: '默认',
    description: '白色背景，适合日间阅读',
  },
  {
    value: 'sepia',
    label: '护眼',
    description: '米黄色背景，减少眼睛疲劳',
  },
  {
    value: 'dark',
    label: '暗黑',
    description: '深色背景，适合夜间阅读',
  },
];

/** 主题样式映射 */
const themeStyles: Record<string, { bg: string; text: string; name: string }> = {
  default: {
    bg: 'bg-white',
    text: 'text-gray-800',
    name: '默认',
  },
  sepia: {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    name: '护眼',
  },
  dark: {
    bg: 'bg-gray-900',
    text: 'text-gray-200',
    name: '暗黑',
  },
};

export default function ReadingSettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const isPending = updateSettingsMutation.isPending;

  // 本地状态用于即时预览
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [theme, setTheme] = useState('default');
  const [autoNightMode, setAutoNightMode] = useState(false);
  const [nightModeStartTime, setNightModeStartTime] = useState<string | null>('22:00');
  const [nightModeEndTime, setNightModeEndTime] = useState<string | null>('07:00');

  // 从服务器同步设置
  useEffect(() => {
    if (settings) {
      setFontSize(settings.defaultFontSize || 16);
      setLineHeight(settings.defaultLineHeight || 1.8);
      setTheme(settings.defaultTheme || 'default');
      setAutoNightMode(settings.autoNightMode || false);
      setNightModeStartTime(settings.nightModeStartTime || '22:00');
      setNightModeEndTime(settings.nightModeEndTime || '07:00');
    }
  }, [settings]);

  // 更新字体大小
  const handleFontSizeChange = async (value: number) => {
    setFontSize(value);
    try {
      await updateSettingsMutation.mutateAsync({ defaultFontSize: value });
    } catch (error) {
      console.error('Failed to update font size:', error);
    }
  };

  // 更新行高
  const handleLineHeightChange = async (value: number) => {
    setLineHeight(value);
    try {
      await updateSettingsMutation.mutateAsync({ defaultLineHeight: value });
    } catch (error) {
      console.error('Failed to update line height:', error);
    }
  };

  // 更新阅读主题
  const handleThemeChange = async (value: string) => {
    setTheme(value);
    try {
      await updateSettingsMutation.mutateAsync({ defaultTheme: value });
    } catch (error) {
      console.error('Failed to update reading theme:', error);
    }
  };

  // 更新自动夜间模式
  const handleAutoNightModeToggle = async (enabled: boolean) => {
    setAutoNightMode(enabled);
    try {
      await updateSettingsMutation.mutateAsync({ autoNightMode: enabled });
    } catch (error) {
      console.error('Failed to update auto night mode:', error);
    }
  };

  // 更新夜间模式开始时间
  const handleNightModeStartTimeChange = async (value: string | null) => {
    setNightModeStartTime(value);
    try {
      await updateSettingsMutation.mutateAsync({ nightModeStartTime: value });
    } catch (error) {
      console.error('Failed to update night mode start time:', error);
    }
  };

  // 更新夜间模式结束时间
  const handleNightModeEndTimeChange = async (value: string | null) => {
    setNightModeEndTime(value);
    try {
      await updateSettingsMutation.mutateAsync({ nightModeEndTime: value });
    } catch (error) {
      console.error('Failed to update night mode end time:', error);
    }
  };

  // 获取当前主题样式
  const currentThemeStyle = themeStyles[theme] || themeStyles.default;

  return (
    <div className="max-w-2xl">
      <SettingsPageHeader
        title="阅读设置"
        description="自定义您的阅读体验，设置将同步到所有设备"
        icon={<BookOpen className="w-6 h-6" />}
      />

      {/* 字体设置 */}
      <SettingsSection title="字体设置" description="调整阅读器的字体大小和行距">
        <div className="p-4 space-y-6">
          {/* 字体大小 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                字体大小
              </span>
              <span className="ml-auto text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                {fontSize}px
              </span>
            </div>
            <SettingsSlider
              value={fontSize}
              onChange={handleFontSizeChange}
              min={12}
              max={32}
              step={1}
              unit="px"
              disabled={isLoading || isPending}
              showMarks
              marks={[
                { value: 12, label: '12' },
                { value: 16, label: '16' },
                { value: 20, label: '20' },
                { value: 24, label: '24' },
                { value: 28, label: '28' },
                { value: 32, label: '32' },
              ]}
            />
          </div>

          {/* 行高 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlignJustify className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                行高
              </span>
              <span className="ml-auto text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                {lineHeight.toFixed(1)}
              </span>
            </div>
            <SettingsSlider
              value={lineHeight}
              onChange={handleLineHeightChange}
              min={1.2}
              max={3.0}
              step={0.1}
              disabled={isLoading || isPending}
              formatValue={(v) => v.toFixed(1)}
              showMarks
              marks={[
                { value: 1.2, label: '1.2' },
                { value: 1.5, label: '1.5' },
                { value: 1.8, label: '1.8' },
                { value: 2.2, label: '2.2' },
                { value: 2.6, label: '2.6' },
                { value: 3.0, label: '3.0' },
              ]}
            />
          </div>
        </div>
      </SettingsSection>

      {/* 阅读主题 */}
      <SettingsSection title="阅读主题" description="选择阅读器的默认主题">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              主题选择
            </span>
          </div>
          <SettingsRadioGroup
            options={readingThemeOptions}
            value={theme}
            onChange={handleThemeChange}
            disabled={isLoading || isPending}
            direction="horizontal"
          />
        </div>
      </SettingsSection>

      {/* 夜间模式 */}
      <SettingsSection title="夜间模式" description="设置自动切换夜间模式的时间">
        <SettingsItem
          label="自动夜间模式"
          description="根据设定时间自动切换到暗黑主题"
          icon={<Moon className="w-5 h-5" />}
          disabled={isLoading}
        >
          <SettingsToggle
            checked={autoNightMode}
            onChange={handleAutoNightModeToggle}
            disabled={isLoading || isPending}
          />
        </SettingsItem>

        {/* 夜间模式时段 */}
        {autoNightMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4"
          >
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    开始时间
                  </span>
                </div>
                <SettingsTimePicker
                  value={nightModeStartTime}
                  onChange={handleNightModeStartTimeChange}
                  disabled={isLoading || isPending}
                  placeholder="22:00"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    结束时间
                  </span>
                </div>
                <SettingsTimePicker
                  value={nightModeEndTime}
                  onChange={handleNightModeEndTimeChange}
                  disabled={isLoading || isPending}
                  placeholder="07:00"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                在 {nightModeStartTime || '22:00'} 至 {nightModeEndTime || '07:00'} 期间，阅读器将自动切换到暗黑主题
              </p>
            </div>
          </motion.div>
        )}
      </SettingsSection>

      {/* 预览效果 */}
      <SettingsSection title="预览效果" description="查看当前设置的阅读效果">
        <div className="p-4">
          <motion.div
            layout
            className={cn(
              'p-6 rounded-xl transition-colors duration-300',
              currentThemeStyle.bg,
              'border border-gray-200 dark:border-gray-700'
            )}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className={cn(
                  'text-xs font-medium px-2 py-1 rounded-full',
                  theme === 'default' && 'bg-gray-100 text-gray-600',
                  theme === 'sepia' && 'bg-amber-100 text-amber-700',
                  theme === 'dark' && 'bg-gray-700 text-gray-300'
                )}
              >
                {currentThemeStyle.name}主题
              </span>
              <span
                className={cn(
                  'text-xs',
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                )}
              >
                {fontSize}px · 行高 {lineHeight.toFixed(1)}
              </span>
            </div>
            <p className={cn(currentThemeStyle.text, 'transition-colors duration-300')}>
              这是一段示例文字，用于预览您的阅读设置效果。您可以调整字体大小和行距，找到最舒适的阅读体验。
            </p>
            <p className={cn(currentThemeStyle.text, 'mt-4 transition-colors duration-300')}>
              良好的阅读设置可以减少眼睛疲劳，让您更专注于内容本身。不同的主题适合不同的阅读环境，护眼模式适合长时间阅读，暗黑模式适合夜间使用。
            </p>
          </motion.div>
        </div>
      </SettingsSection>

      {/* 提示信息 */}
      <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>阅读设置提示：</strong>
        </p>
        <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
          <li>设置会自动保存并同步到您的所有设备</li>
          <li>在阅读器中也可以临时调整这些设置</li>
          <li>护眼模式使用暖色调背景，可减少蓝光对眼睛的刺激</li>
          <li>建议根据环境光线选择合适的主题</li>
        </ul>
      </div>
    </div>
  );
}
