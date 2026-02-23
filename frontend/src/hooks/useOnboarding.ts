'use client';

import { useState, useCallback } from 'react';
import type {
  GuideType,
  OnboardingProgress,
  GetProgressResponse,
  GetAllProgressResponse,
  UpdateProgressResponse,
  CompleteGuideResponse,
  ResetProgressResponse,
} from '@/types/onboarding';

/**
 * 新手引导 Hook
 *
 * 需求22: 新手引导系统
 * 任务22.2.1: 引导组件（高亮遮罩、气泡）
 *
 * 功能：
 * - 获取引导进度
 * - 更新引导进度
 * - 完成引导
 * - 重置引导
 *
 * 验收标准:
 * - 22.5: WHEN 用户再次触发引导场景 THEN System SHALL 检查是否已完成，已完成则不再显示
 * - 22.6: WHEN 用户主动查看帮助 THEN System SHALL 提供重新观看引导的入口
 * - 22.7: WHEN 用户完成所有引导 THEN System SHALL 发放"新手毕业"成就徽章
 */

const API_BASE = '/api/v1/onboarding';

/**
 * 获取认证 token
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

/**
 * 创建请求头
 */
function createHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function useOnboarding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [allProgress, setAllProgress] = useState<OnboardingProgress[]>([]);

  /**
   * 获取特定引导类型的进度
   */
  const getProgress = useCallback(async (guideType: GuideType | string): Promise<OnboardingProgress | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${guideType}`, {
        method: 'GET',
        headers: createHeaders(),
      });

      if (!response.ok) {
        throw new Error(`获取引导进度失败: ${response.status}`);
      }

      const data: GetProgressResponse = await response.json();
      setProgress(data.progress);
      return data.progress;
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取引导进度失败';
      setError(message);
      console.error('[useOnboarding] getProgress error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取所有引导进度
   */
  const getAllProgress = useCallback(async (): Promise<OnboardingProgress[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_BASE, {
        method: 'GET',
        headers: createHeaders(),
      });

      if (!response.ok) {
        throw new Error(`获取所有引导进度失败: ${response.status}`);
      }

      const data: GetAllProgressResponse = await response.json();
      setAllProgress(data.progress);
      return data.progress;
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取所有引导进度失败';
      setError(message);
      console.error('[useOnboarding] getAllProgress error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 更新引导进度
   */
  const updateProgress = useCallback(async (
    guideType: GuideType | string,
    step: number
  ): Promise<OnboardingProgress | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${guideType}`, {
        method: 'PATCH',
        headers: createHeaders(),
        body: JSON.stringify({ step }),
      });

      if (!response.ok) {
        throw new Error(`更新引导进度失败: ${response.status}`);
      }

      const data: UpdateProgressResponse = await response.json();
      setProgress(data.progress);
      return data.progress;
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新引导进度失败';
      setError(message);
      console.error('[useOnboarding] updateProgress error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 完成引导
   */
  const completeGuide = useCallback(async (
    guideType: GuideType | string
  ): Promise<CompleteGuideResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${guideType}/complete`, {
        method: 'POST',
        headers: createHeaders(),
      });

      if (!response.ok) {
        throw new Error(`完成引导失败: ${response.status}`);
      }

      const data: CompleteGuideResponse = await response.json();
      setProgress(data.progress);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '完成引导失败';
      setError(message);
      console.error('[useOnboarding] completeGuide error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 重置引导进度
   */
  const resetProgress = useCallback(async (
    guideType: GuideType | string
  ): Promise<OnboardingProgress | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${guideType}/reset`, {
        method: 'POST',
        headers: createHeaders(),
      });

      if (!response.ok) {
        throw new Error(`重置引导进度失败: ${response.status}`);
      }

      const data: ResetProgressResponse = await response.json();
      setProgress(data.progress);
      return data.progress;
    } catch (err) {
      const message = err instanceof Error ? err.message : '重置引导进度失败';
      setError(message);
      console.error('[useOnboarding] resetProgress error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 检查引导是否已完成
   */
  const isGuideCompleted = useCallback(async (guideType: GuideType | string): Promise<boolean> => {
    const progressData = await getProgress(guideType);
    return progressData?.completedAt !== null;
  }, [getProgress]);

  /**
   * 检查是否应该显示引导
   * 如果引导未完成，返回 true
   */
  const shouldShowGuide = useCallback(async (guideType: GuideType | string): Promise<boolean> => {
    const progressData = await getProgress(guideType);
    // 如果没有进度记录或未完成，应该显示引导
    return !progressData || progressData.completedAt === null;
  }, [getProgress]);

  return {
    // 状态
    loading,
    error,
    progress,
    allProgress,

    // 方法
    getProgress,
    getAllProgress,
    updateProgress,
    completeGuide,
    resetProgress,
    isGuideCompleted,
    shouldShowGuide,
  };
}
