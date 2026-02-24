import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { UploadFeeType } from '@prisma/client';

/**
 * 更新小说库设置 DTO
 *
 * 需求1验收标准2: WHEN 库拥有者设置收益分配时，THE Library_System SHALL 允许设置 0-30% 的额外抽成比例
 * 需求1验收标准3: WHEN 库拥有者设置上传费用时，THE Library_System SHALL 支持按千字或按漫画页数两种计费模式
 */
export class UpdateLibrarySettingsDto {
  /**
   * 库拥有者抽成比例 (0-30%)
   * 需求1验收标准2: 允许设置 0-30% 的额外抽成比例
   */
  @IsOptional()
  @IsInt({ message: '抽成比例必须是整数' })
  @Min(0, { message: '抽成比例不能小于0' })
  @Max(30, { message: '抽成比例不能超过30' })
  ownerCutPercent?: number;

  /**
   * 上传费用类型
   * 需求1验收标准3: 支持按千字或按漫画页数两种计费模式
   */
  @IsOptional()
  @IsEnum(UploadFeeType, {
    message: '上传费用类型无效，必须是 PER_THOUSAND_WORDS 或 PER_PAGE',
  })
  uploadFeeType?: UploadFeeType;

  /**
   * 上传费率（分/千字 或 分/页）
   */
  @IsOptional()
  @IsInt({ message: '上传费率必须是整数' })
  @Min(0, { message: '上传费率不能小于0' })
  uploadFeeRate?: number;
}
