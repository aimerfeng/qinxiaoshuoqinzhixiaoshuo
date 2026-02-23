import { IsInt, Min, Max } from 'class-validator';

/**
 * 更新引导进度请求 DTO
 */
export class UpdateProgressDto {
  /**
   * 当前步骤
   * 必须是非负整数
   */
  @IsInt({ message: '步骤必须是整数' })
  @Min(0, { message: '步骤不能小于0' })
  @Max(100, { message: '步骤不能超过100' })
  step!: number;
}
