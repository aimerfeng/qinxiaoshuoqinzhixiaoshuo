'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useClaimReward, useClaimAllRewards } from '@/hooks/useAchievements';
import { AchievementClaimRewardModal } from './AchievementClaimRewardModal';
import type {
  AchievementTier,
  AchievementRewardType,
  AchievementRewardValue,
  AchievementWithProgress,
} from '@/types/achievement';

/**
 * 领取状态
 */
export type ClaimStatus = 'idle' | 'claiming' | 'success' | 'error';

/**
 * 领取结果数据
 */
export interface ClaimResult {
  achievementName: string;
  tier: AchievementTier;
  rewardType: AchievementRewardType;
  rewardValue: AchievementRewardValue;
}

/**
 * 成就领取上下文值
 */
export interface AchievementClaimContextValue {
  /** 当前领取状态 */
  status: ClaimStatus;
  /** 正在领取的成就ID */
  claimingId: string | null;
  /** 领取单个成就奖励 */
  claimReward: (achievement: AchievementWithProgress) => Promise<void>;
  /** 批量领取所有奖励 */
  claimAllRewards: () => Promise<void>;
  /** 是否正在领取中 */
  isClaiming: boolean;
  /** 检查特定成就是否正在领取 */
  isClaimingAchievement: (achievementId: string) => boolean;
  /** 错误信息 */
  error: string | null;
  /** 清除错误 */
  clearError: () => void;
}

/**
 * 成就领取上下文
 */
const AchievementClaimContext = createContext<AchievementClaimContextValue | null>(null);

/**
 * 成就领取 Provider 属性
 */
export interface AchievementClaimProviderProps {
  children: ReactNode;
  /** 领取成功后的回调 */
  onClaimSuccess?: (result: ClaimResult) => void;
  /** 领取失败后的回调 */
  onClaimError?: (error: string) => void;
  /** 奖励弹窗自动关闭延迟（毫秒） */
  rewardModalAutoDismissDelay?: number;
}

/**
 * 成就领取 Provider 组件
 *
 * 需求24: 成就系统
 * 任务24.2.6: 成就领取交互
 *
 * 功能：
 * - Track claiming state
 * - Show loading during claim
 * - Show success modal after claim
 * - Handle errors with toast/notification
 */
export function AchievementClaimProvider({
  children,
  onClaimSuccess,
  onClaimError,
  rewardModalAutoDismissDelay = 5000,
}: AchievementClaimProviderProps) {
  // 状态
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);

  // Mutations
  const claimRewardMutation = useClaimReward();
  const claimAllRewardsMutation = useClaimAllRewards();

  // 领取单个成就奖励
  const claimReward = useCallback(
    async (achievement: AchievementWithProgress) => {
      if (status === 'claiming') return;

      setStatus('claiming');
      setClaimingId(achievement.id);
      setError(null);

      try {
        await claimRewardMutation.mutateAsync(achievement.id);

        // 设置领取结果
        const result: ClaimResult = {
          achievementName: achievement.displayName,
          tier: achievement.tier,
          rewardType: achievement.rewardType,
          rewardValue: achievement.rewardValue,
        };
        setClaimResult(result);
        setStatus('success');
        setShowRewardModal(true);

        // 触发成功回调
        onClaimSuccess?.(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '领取失败，请稍后重试';
        setError(errorMessage);
        setStatus('error');
        onClaimError?.(errorMessage);
      } finally {
        setClaimingId(null);
      }
    },
    [status, claimRewardMutation, onClaimSuccess, onClaimError]
  );

  // 批量领取所有奖励
  const claimAllRewards = useCallback(async () => {
    if (status === 'claiming') return;

    setStatus('claiming');
    setError(null);

    try {
      await claimAllRewardsMutation.mutateAsync();
      setStatus('success');
      // 批量领取不显示单个奖励弹窗，可以通过回调处理
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量领取失败，请稍后重试';
      setError(errorMessage);
      setStatus('error');
      onClaimError?.(errorMessage);
    }
  }, [status, claimAllRewardsMutation, onClaimError]);

  // 检查特定成就是否正在领取
  const isClaimingAchievement = useCallback(
    (achievementId: string) => {
      return claimingId === achievementId;
    },
    [claimingId]
  );

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error') {
      setStatus('idle');
    }
  }, [status]);

  // 关闭奖励弹窗
  const handleCloseRewardModal = useCallback(() => {
    setShowRewardModal(false);
    setClaimResult(null);
    setStatus('idle');
  }, []);

  // Context value
  const contextValue = useMemo<AchievementClaimContextValue>(
    () => ({
      status,
      claimingId,
      claimReward,
      claimAllRewards,
      isClaiming: status === 'claiming',
      isClaimingAchievement,
      error,
      clearError,
    }),
    [
      status,
      claimingId,
      claimReward,
      claimAllRewards,
      isClaimingAchievement,
      error,
      clearError,
    ]
  );

  return (
    <AchievementClaimContext.Provider value={contextValue}>
      {children}

      {/* 奖励领取成功弹窗 */}
      {claimResult && (
        <AchievementClaimRewardModal
          isOpen={showRewardModal}
          onClose={handleCloseRewardModal}
          achievementName={claimResult.achievementName}
          tier={claimResult.tier}
          rewardType={claimResult.rewardType}
          rewardValue={claimResult.rewardValue}
          autoDismissDelay={rewardModalAutoDismissDelay}
        />
      )}
    </AchievementClaimContext.Provider>
  );
}

/**
 * 使用成就领取上下文 Hook
 */
export function useAchievementClaim(): AchievementClaimContextValue {
  const context = useContext(AchievementClaimContext);

  if (!context) {
    throw new Error(
      'useAchievementClaim must be used within an AchievementClaimProvider'
    );
  }

  return context;
}

export default AchievementClaimProvider;
