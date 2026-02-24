import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { BranchType, DerivativeType } from '@prisma/client';

/**
 * 创建分支 DTO
 *
 * 需求2验收标准1: WHEN 用户创建正文分支时，THE Branch_System SHALL 记录分支点（基于哪个章节/段落分叉）和分支创作者
 * 需求3验收标准1: WHEN 用户创建改写分支时，THE Branch_System SHALL 要求选择分支类型（同人/IF线/改编）
 * 需求4验收标准1: WHEN 用户创建漫画分支时，THE Branch_System SHALL 要求上传漫画页面图片并设置阅读方向
 */
export class CreateBranchDto {
  /**
   * 分支类型
   * - MAIN: 正文分支（原创内容或续写）
   * - DERIVATIVE: 改写分支（同人/IF线/改编）
   * - MANGA: 漫画分支（漫画改编版本）
   */
  @IsEnum(BranchType, {
    message: '分支类型无效，必须是 MAIN、DERIVATIVE 或 MANGA',
  })
  branchType!: BranchType;

  /**
   * 改写分支子类型（仅 DERIVATIVE 类型必填）
   * - FANFIC: 同人
   * - IF_LINE: IF线
   * - ADAPTATION: 改编
   */
  @IsOptional()
  @IsEnum(DerivativeType, {
    message: '改写类型无效，必须是 FANFIC、IF_LINE 或 ADAPTATION',
  })
  derivativeType?: DerivativeType;

  /**
   * 分支点章节ID（从哪个章节分叉）
   */
  @IsOptional()
  @IsUUID('4', { message: '章节ID必须是有效的UUID' })
  forkFromChapterId?: string;

  /**
   * 分支点段落ID（从哪个段落分叉）
   */
  @IsOptional()
  @IsUUID('4', { message: '段落ID必须是有效的UUID' })
  forkFromParagraphId?: string;

  /**
   * 分支标题
   */
  @IsString({ message: '标题必须是字符串' })
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(100, { message: '标题不能超过100个字符' })
  title!: string;

  /**
   * 分支描述
   */
  @IsOptional()
  @IsString({ message: '描述必须是字符串' })
  @MaxLength(2000, { message: '描述不能超过2000个字符' })
  description?: string;

  /**
   * 分支封面图片URL
   */
  @IsOptional()
  @IsString({ message: '封面图片URL必须是字符串' })
  @MaxLength(500, { message: '封面图片URL不能超过500个字符' })
  coverImage?: string;

  /**
   * 漫画阅读方向（仅 MANGA 类型使用）
   * - LTR: 从左到右
   * - RTL: 从右到左
   */
  @IsOptional()
  @IsEnum(['LTR', 'RTL'], {
    message: '阅读方向无效，必须是 LTR 或 RTL',
  })
  readingDirection?: 'LTR' | 'RTL';

  /**
   * 分支内容字数（用于计算上传费用）
   * 文字分支（DERIVATIVE）必填
   */
  @IsOptional()
  @IsInt({ message: '字数必须是整数' })
  @Min(0, { message: '字数不能为负数' })
  wordCount?: number;

  /**
   * 漫画页数（用于计算上传费用）
   * 漫画分支（MANGA）必填
   */
  @IsOptional()
  @IsInt({ message: '页数必须是整数' })
  @Min(1, { message: '页数至少为1' })
  pageCount?: number;

  /**
   * 漫画页面图片URL列表（仅 MANGA 类型使用）
   * 按顺序排列，用于创建 MangaPage 实体
   */
  @IsOptional()
  @IsArray({ message: '页面URL列表必须是数组' })
  @ArrayMinSize(1, { message: '漫画分支至少需要1页' })
  @IsString({ each: true, message: '每个页面URL必须是字符串' })
  @MaxLength(500, { each: true, message: '页面URL不能超过500个字符' })
  pageUrls?: string[];
}
