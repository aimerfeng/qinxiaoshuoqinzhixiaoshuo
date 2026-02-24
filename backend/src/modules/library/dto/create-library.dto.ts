import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';
import { LibraryType, UploadFeeType } from '@prisma/client';

/**
 * 创建小说库 DTO
 *
 * 需求1验收标准1: WHEN 用户创建新小说库时，THE Library_System SHALL 创建一个包含标题、描述、封面图和库类型的 Library 实体
 * 需求1验收标准2: WHEN 库拥有者设置收益分配时，THE Library_System SHALL 允许设置 0-30% 的额外抽成比例
 * 需求1验收标准3: WHEN 库拥有者设置上传费用时，THE Library_System SHALL 支持按千字或按漫画页数两种计费模式
 */
export class CreateLibraryDto {
  @IsUUID('4', { message: '作品ID必须是有效的UUID' })
  workId!: string;

  @IsString({ message: '标题必须是字符串' })
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(100, { message: '标题不能超过100个字符' })
  title!: string;

  @IsOptional()
  @IsString({ message: '描述必须是字符串' })
  @MaxLength(2000, { message: '描述不能超过2000个字符' })
  description?: string;

  @IsOptional()
  @IsString({ message: '封面图片URL必须是字符串' })
  @MaxLength(500, { message: '封面图片URL不能超过500个字符' })
  coverImage?: string;

  @IsEnum(LibraryType, { message: '库类型无效，必须是 ORIGINAL 或 SHARED' })
  libraryType!: LibraryType;

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
