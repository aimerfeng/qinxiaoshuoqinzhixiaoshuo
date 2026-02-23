import { IsUUID } from 'class-validator';

/**
 * 结算状态枚举
 * 需求25.1.10: 赛季结算服务
 */
export enum SettlementStatus {
  NOT_STARTED = 'NOT_STARTED', // 未开始
  IN_PROGRESS = 'IN_PROGRESS', // 进行中
  FINALIZING_RANKINGS = 'FINALIZING_RANKINGS', // 正在同步排名
  DETERMINING_TIERS = 'DETERMINING_TIERS', // 正在确定段位
  DISTRIBUTING_REWARDS = 'DISTRIBUTING_REWARDS', // 正在发放奖励
  COMPLETED = 'COMPLETED', // 已完成
  FAILED = 'FAILED', // 失败
}

/**
 * 启动赛季结算 DTO
 */
export class StartSettlementDto {
  /** 赛季ID */
  @IsUUID()
  seasonId!: string;
}
