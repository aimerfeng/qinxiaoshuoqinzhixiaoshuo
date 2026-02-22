import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Gender } from '@prisma/client';

/**
 * 更新用户资料 DTO
 * 需求1验收标准6: WHEN 用户更新个人资料信息 THEN System SHALL 验证并保存更改
 *
 * 支持更新的字段：
 * - nickname (displayName): 昵称
 * - bio: 个人简介
 * - gender: 性别
 * - birthday: 生日
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: '昵称必须是字符串' })
  @MaxLength(50, { message: '昵称不能超过50个字符' })
  nickname?: string;

  @IsOptional()
  @IsString({ message: '个人简介必须是字符串' })
  @MaxLength(500, { message: '个人简介不能超过500个字符' })
  bio?: string;

  @IsOptional()
  @IsEnum(Gender, { message: '性别值无效' })
  gender?: Gender;

  @IsOptional()
  @IsDateString({}, { message: '生日格式无效，请使用 YYYY-MM-DD 格式' })
  birthday?: string;
}
