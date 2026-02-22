import {
  IsInt,
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  IsIn,
} from 'class-validator';

/**
 * 阅读设置 DTO
 *
 * 需求4: 沉浸式阅读器
 * 任务4.1.3: 阅读设置保存 API
 */

/**
 * 保存阅读设置请求 DTO
 */
export class SaveReadingSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(12)
  @Max(32)
  fontSize?: number;

  @IsOptional()
  @IsNumber()
  @Min(1.2)
  @Max(3.0)
  lineHeight?: number;

  @IsOptional()
  @IsString()
  @IsIn([
    'system',
    'serif',
    'sans-serif',
    'noto-serif',
    'source-han-serif',
    'lxgw-wenkai',
  ])
  fontFamily?: string;

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  textColor?: string;

  @IsOptional()
  @IsString()
  @IsIn(['SCROLL', 'PAGINATED'])
  pageMode?: string;

  @IsOptional()
  @IsBoolean()
  nightMode?: boolean;
}

/**
 * 阅读设置响应 DTO
 */
export interface ReadingSettingsResponseDto {
  message: string;
  settings: {
    id: string;
    userId: string;
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    backgroundColor: string;
    textColor: string;
    pageMode: string;
    nightMode: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * 默认阅读设置
 */
export const DEFAULT_READING_SETTINGS = {
  fontSize: 16,
  lineHeight: 1.8,
  fontFamily: 'system',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  pageMode: 'SCROLL',
  nightMode: false,
};
