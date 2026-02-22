import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { DanmakuType } from '@prisma/client';

/**
 * 创建弹幕 DTO
 *
 * 需求24.1: 弹幕输入框限制内容在100字以内
 * 需求24.2: 弹幕绑定到对应 Anchor_ID
 */
export class CreateDanmakuDto {
  @IsString()
  @IsNotEmpty({ message: '锚点ID不能为空' })
  anchorId!: string;

  @IsString()
  @IsNotEmpty({ message: '弹幕内容不能为空' })
  @MaxLength(100, { message: '弹幕内容不能超过100字' })
  content!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: '颜色格式必须为 #RRGGBB' })
  color?: string;

  @IsOptional()
  @IsEnum(DanmakuType, { message: '弹幕类型必须是 SCROLL、TOP 或 BOTTOM' })
  type?: DanmakuType;

  @IsOptional()
  @IsInt()
  @Min(12, { message: '字体大小最小为12' })
  @Max(36, { message: '字体大小最大为36' })
  fontSize?: number;
}
