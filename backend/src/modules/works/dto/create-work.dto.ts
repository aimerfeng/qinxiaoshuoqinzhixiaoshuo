import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  ValidateIf,
} from 'class-validator';
import { ContentType } from '@prisma/client';

/**
 * 作品分类枚举
 * 用于作品的内容分类
 */
export enum WorkCategory {
  FANTASY = 'FANTASY', // 奇幻
  ROMANCE = 'ROMANCE', // 言情
  SCIFI = 'SCIFI', // 科幻
  MYSTERY = 'MYSTERY', // 悬疑
  HORROR = 'HORROR', // 恐怖
  COMEDY = 'COMEDY', // 喜剧
  ACTION = 'ACTION', // 动作
  SLICE_OF_LIFE = 'SLICE_OF_LIFE', // 日常
  HISTORICAL = 'HISTORICAL', // 历史
  SPORTS = 'SPORTS', // 体育
  OTHER = 'OTHER', // 其他
}

/**
 * 阅读方向枚举（漫画专用）
 * LTR: 从左到右（西方漫画、韩漫、Webtoon）
 * RTL: 从右到左（日漫）
 */
export enum ReadingDirection {
  LTR = 'LTR',
  RTL = 'RTL',
}

/**
 * 创建作品 DTO
 * 需求2验收标准1: WHEN Creator 创建新作品 THEN System SHALL 初始化 Main_Branch 并生成唯一作品标识
 * 需求2验收标准7: WHEN Creator 设置作品元信息 THEN System SHALL 保存标题、简介、封面、标签等信息
 *
 * 支持小说（NOVEL）和漫画（MANGA）两种类型
 * 漫画类型支持额外的 readingDirection 字段
 */
export class CreateWorkDto {
  @IsString({ message: '标题必须是字符串' })
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(100, { message: '标题不能超过100个字符' })
  title!: string;

  @IsOptional()
  @IsString({ message: '简介必须是字符串' })
  @MaxLength(2000, { message: '简介不能超过2000个字符' })
  description?: string;

  @IsEnum(ContentType, { message: '作品类型无效，必须是 NOVEL 或 MANGA' })
  type!: ContentType;

  @IsOptional()
  @IsEnum(WorkCategory, { message: '作品分类无效' })
  category?: WorkCategory;

  @IsOptional()
  @IsArray({ message: '标签必须是数组' })
  @IsString({ each: true, message: '每个标签必须是字符串' })
  @ArrayMaxSize(10, { message: '标签数量不能超过10个' })
  tags?: string[];

  @IsOptional()
  @IsString({ message: '封面图片URL必须是字符串' })
  @MaxLength(500, { message: '封面图片URL不能超过500个字符' })
  coverImage?: string;

  /**
   * 阅读方向（漫画专用）
   * - LTR: 从左到右（西方漫画、韩漫、Webtoon）
   * - RTL: 从右到左（日漫）
   * 仅当 type 为 MANGA 时有效
   */
  @IsOptional()
  @ValidateIf((o) => o.type === ContentType.MANGA)
  @IsEnum(ReadingDirection, {
    message: '阅读方向无效，必须是 LTR 或 RTL',
  })
  readingDirection?: ReadingDirection;
}
