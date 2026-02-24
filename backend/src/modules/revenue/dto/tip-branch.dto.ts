import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

/**
 * 打赏分支 DTO
 *
 * 需求6验收标准1: WHEN 用户打赏分支内容时，THE Revenue_System SHALL 按以下比例分配：
 * - 平台 30%
 * - 库拥有者 0-30%（可配置）
 * - 分支创作者 40-70%
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
 */
export class TipBranchDto {
  /**
   * 打赏金额（零芥子）
   * 最小值: 1
   * 最大值: 10000
   */
  @IsInt({ message: '打赏金额必须是整数' })
  @Min(1, { message: '打赏金额至少为 1 零芥子' })
  @Max(10000, { message: '打赏金额不能超过 10000 零芥子' })
  amount!: number;

  /**
   * 打赏留言（可选）
   */
  @IsOptional()
  @IsString({ message: '留言必须是字符串' })
  @MaxLength(500, { message: '留言不能超过 500 个字符' })
  message?: string;
}

/**
 * 打赏分支响应 DTO
 *
 * 包含交易ID和收益分配明细
 */
export interface TipBranchResponseDto {
  transactionId: string;
  totalAmount: number;
  platformAmount: number;
  ownerAmount: number;
  creatorAmount: number;
}

/**
 * 打赏结果 DTO
 */
export interface TipResultDto {
  success: boolean;
  message: string;
  data?: TipBranchResponseDto;
}

/**
 * 收益分配计算结果
 */
export interface RevenueDistribution {
  totalAmount: number;
  platformAmount: number;
  ownerAmount: number;
  creatorAmount: number;
  platformPercent: number;
  ownerPercent: number;
  creatorPercent: number;
}
