import { Injectable } from '@nestjs/common';
import { SeasonTier } from './dto/leaderboard.dto.js';

@Injectable()
export class SeasonConfigService {
  readonly DEFAULT_SEASON_DURATION = 90;

  readonly TIER_CONFIG: Record<
    SeasonTier,
    {
      displayName: string;
      description: string;
      minPoints: number;
      color: string;
      sortValue: number;
    }
  > = {
    [SeasonTier.NOVICE]: {
      displayName: '新秀',
      description: '刚刚开始的旅程',
      minPoints: 0,
      color: '#9CA3AF',
      sortValue: 0,
    },
    [SeasonTier.BRONZE]: {
      displayName: '青铜',
      description: '初露锋芒',
      minPoints: 100,
      color: '#CD7F32',
      sortValue: 1,
    },
    [SeasonTier.SILVER]: {
      displayName: '白银',
      description: '稳步前进',
      minPoints: 300,
      color: '#C0C0C0',
      sortValue: 2,
    },
    [SeasonTier.GOLD]: {
      displayName: '黄金',
      description: '实力不凡',
      minPoints: 600,
      color: '#FFD700',
      sortValue: 3,
    },
    [SeasonTier.PLATINUM]: {
      displayName: '铂金',
      description: '精英之选',
      minPoints: 1000,
      color: '#E5E4E2',
      sortValue: 4,
    },
    [SeasonTier.DIAMOND]: {
      displayName: '钻石',
      description: '璀璨夺目',
      minPoints: 1500,
      color: '#B9F2FF',
      sortValue: 5,
    },
    [SeasonTier.MASTER]: {
      displayName: '大师',
      description: '登峰造极',
      minPoints: 2500,
      color: '#9B59B6',
      sortValue: 6,
    },
    [SeasonTier.GRANDMASTER]: {
      displayName: '宗师',
      description: '一代宗师',
      minPoints: 4000,
      color: '#E74C3C',
      sortValue: 7,
    },
    [SeasonTier.KING]: {
      displayName: '王者',
      description: '至高无上',
      minPoints: 6000,
      color: '#F1C40F',
      sortValue: 8,
    },
  };

  getTierConfig(tier: SeasonTier) {
    return this.TIER_CONFIG[tier];
  }

  getTierByPoints(points: number): SeasonTier {
    const tiers = Object.entries(this.TIER_CONFIG).sort(
      (a, b) => b[1].minPoints - a[1].minPoints,
    );
    for (const [tier, config] of tiers) {
      if (points >= config.minPoints) {
        return tier as SeasonTier;
      }
    }
    return SeasonTier.NOVICE;
  }

  getAllTiers() {
    return Object.entries(this.TIER_CONFIG)
      .map(([tier, config]) => ({
        tier: tier as SeasonTier,
        ...config,
      }))
      .sort((a, b) => a.sortValue - b.sortValue);
  }

  calculateSoftResetPoints(previousPoints: number): number {
    return Math.max(Math.floor(previousPoints * 0.5), 100);
  }
}
