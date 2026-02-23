'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Palette, Sun, Moon, Monitor, Heart, MessageCircle, Share2 } from 'lucide-react';
import {
  SettingsPageHeader,
  SettingsSection,
  SettingsRadioGroup,
  SettingsColorPicker,
} from '@/components/settings';
import type { RadioOption, PresetColor } from '@/components/settings';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { cn } from '@/utils/cn';

/**
 * 主题设置页面
 *
 * 需求21: 设置中心
 * 任务21.2.6: 主题设置
 *
 * 需求21验收标准9: WHEN 用户切换主题 THEN System SHALL 即时应用并保存偏好
 *
 * 功能:
 * - 系统主题 (跟随系统/浅色/深色)
 * - 强调色 (预设颜色 + 自定义)
 * - 预览效果
 */

/** 系统主题选项 */
const themeOptions: RadioOption[] = [
  {
    value: 'system',
    label: '跟随系统',
    description: '自动跟随系统的深色/浅色模式设置',
  },
  {
    value: 'light',
    label: '浅色',
    description: '始终使用明亮的浅色主题',
  },
  {
    value: 'dark',
    label: '深色',
    description: '始终使用护眼的深色主题',
  },
];

/** 预设强调色 */
const presetAccentColors: PresetColor[] = [
  { id: 'default', name: '默认紫蓝', color: '#6366F1' },
  { id: 'rose', name: '玫瑰红', color: '#F43F5E' },
  { id: 'emerald', name: '翠绿', color: '#10B981' },
  { id: 'amber', name: '琥珀', color: '#F59E0B' },
  { id: 'sky', name: '天蓝', color: '#0EA5E9' },
];

/** 主题样式映射 */
const themePreviewStyles: Record<string, { bg: string; card: string; text: string; subtext: string }> = {
  light: {
    bg: 'bg-gray-50',
    card: 'bg-white',
    text: 'text-gray-900',
    subtext: 'text-gray-500',
  },
  dark: {
    bg: 'bg-gray-900',
    card: 'bg-gray-800',
    text: 'text-white',
    subtext: 'text-gray-400',
  },
  system: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    card: 'bg-white dark:bg-gray-800',
    text: 'text-gray-900 dark:text-white',
    subtext: 'text-gray-500 dark:text-gray-400',
  },
};

export default function ThemeSettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const isPending = updateSettingsMutation.isPending;

  // 本地状态用于即时预览
  const [theme, setTheme] = useState('system');
  const [accentColor, setAccentColor] = useState<string | null>('#6366F1');

  // 从服务器同步设置
  useEffect(() => {
    if (settings) {
      setTheme(settings.theme || 'system');
      setAccentColor(settings.accentColor || '#6366F1');
    }
  }, [settings]);

  /**
   * 更新系统主题
   */
  const handleThemeChange = async (value: string) => {
    setTheme(value);
    
    // 即时应用主题到 DOM
    applyTheme(value);
    
    try {
      await updateSettingsMutation.mutateAsync({ theme: value });
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  /**
   * 更新强调色
   */
  const handleAccentColorChange = async (color: string | null) => {
    setAccentColor(color);
    
    // 即时应用强调色到 CSS 变量
    applyAccentColor(color);
    
    try {
      await updateSettingsMutation.mutateAsync({ accentColor: color });
    } catch (error) {
      console.error('Failed to update accent color:', error);
    }
  };

  /**
   * 应用主题到 DOM
   */
  const applyTheme = (themeValue: string) => {
    const root = document.documentElement;
    
    if (themeValue === 'dark') {
      root.classList.add('dark');
    } else if (themeValue === 'light') {
      root.classList.remove('dark');
    } else {
      // 跟随系统
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  /**
   * 应用强调色到 CSS 变量
   */
  const applyAccentColor = (color: string | null) => {
    if (!color) return;
    
    const root = document.documentElement;
    root.style.setProperty('--color-accent', color);
    
    // 计算 RGB 值用于透明度变体
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    root.style.setProperty('--color-accent-rgb', `${r}, ${g}, ${b}`);
  };

  // 获取当前预览样式
  const previewStyle = themePreviewStyles[theme] || themePreviewStyles.system;
  const currentAccentColor = accentColor || '#6366F1';

  return (
    <div className="max-w-2xl">
      <SettingsPageHeader
        title="主题设置"
        description="个性化您的界面外观，设置将即时应用并同步到所有设备"
        icon={<Palette className="w-6 h-6" />}
      />

      {/* 系统主题 */}
      <SettingsSection title="系统主题" description="选择界面的深色/浅色模式">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
            {theme === 'dark' && <Moon className="w-4 h-4 text-indigo-400" />}
            {theme === 'system' && <Monitor className="w-4 h-4 text-gray-500" />}
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              主题模式
            </span>
          </div>
          <SettingsRadioGroup
            options={themeOptions}
            value={theme}
            onChange={handleThemeChange}
            disabled={isLoading || isPending}
          />
        </div>
      </SettingsSection>

      {/* 强调色 */}
      <SettingsSection title="强调色" description="选择界面的主色调，影响按钮、链接等元素">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: currentAccentColor }}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              选择颜色
            </span>
          </div>
          <SettingsColorPicker
            value={accentColor}
            onChange={handleAccentColorChange}
            presetColors={presetAccentColors}
            disabled={isLoading || isPending}
          />
        </div>
      </SettingsSection>

      {/* 预览效果 */}
      <SettingsSection title="预览效果" description="查看当前主题和强调色的实际效果">
        <div className="p-4">
          <motion.div
            layout
            className={cn(
              'p-4 rounded-xl transition-colors duration-300',
              previewStyle.bg,
              'border border-gray-200 dark:border-gray-700'
            )}
          >
            {/* 模拟卡片 */}
            <div
              className={cn(
                'p-4 rounded-xl transition-colors duration-300',
                previewStyle.card,
                'border border-gray-200/50 dark:border-gray-700/50',
                'shadow-sm'
              )}
            >
              {/* 用户信息 */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${currentAccentColor}, ${adjustColor(currentAccentColor, 30)})`,
                  }}
                />
                <div>
                  <p className={cn('text-sm font-medium', previewStyle.text)}>
                    示例用户
                  </p>
                  <p className={cn('text-xs', previewStyle.subtext)}>
                    刚刚发布
                  </p>
                </div>
              </div>

              {/* 内容 */}
              <p className={cn('text-sm mb-3', previewStyle.text)}>
                这是一个预览卡片，展示当前主题和强调色的效果。您可以看到文字、按钮和交互元素如何呈现。
              </p>

              {/* 引用预览 */}
              <div
                className="p-3 rounded-lg mb-3 border-l-4 transition-colors duration-300"
                style={{
                  borderLeftColor: currentAccentColor,
                  backgroundColor: `${currentAccentColor}10`,
                }}
              >
                <p className={cn('text-xs', previewStyle.subtext)}>
                  引用自《示例作品》第一章
                </p>
                <p className={cn('text-sm mt-1', previewStyle.text)}>
                  "这是一段被引用的精彩内容..."
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-4">
                <button
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: currentAccentColor }}
                >
                  <Heart className="w-4 h-4" />
                  <span>点赞</span>
                </button>
                <button
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: currentAccentColor }}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>评论</span>
                </button>
                <button
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: currentAccentColor }}
                >
                  <Share2 className="w-4 h-4" />
                  <span>分享</span>
                </button>
              </div>
            </div>

            {/* 按钮预览 */}
            <div className="mt-4 flex items-center gap-3">
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: currentAccentColor }}
              >
                主要按钮
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
                style={{
                  color: currentAccentColor,
                  borderColor: currentAccentColor,
                  backgroundColor: `${currentAccentColor}10`,
                }}
              >
                次要按钮
              </button>
              <span
                className="text-sm font-medium transition-colors"
                style={{ color: currentAccentColor }}
              >
                链接文字
              </span>
            </div>
          </motion.div>
        </div>
      </SettingsSection>

      {/* 提示信息 */}
      <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>主题设置提示：</strong>
        </p>
        <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
          <li>主题设置会即时应用并自动保存</li>
          <li>选择"跟随系统"可以自动适应您设备的深色/浅色模式</li>
          <li>强调色会影响按钮、链接、高亮等交互元素的颜色</li>
          <li>您可以选择预设颜色或输入自定义的十六进制颜色值</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * 调整颜色亮度
 * @param color 十六进制颜色
 * @param amount 调整量（正数变亮，负数变暗）
 */
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.min(255, Math.max(0, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.substring(4, 6), 16) + amount));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
