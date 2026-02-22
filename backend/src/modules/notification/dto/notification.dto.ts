import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '@prisma/client';

/**
 * 创建通知 DTO
 */
export class CreateNotificationDto {
  @IsString()
  userId!: string;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  data?: Record<string, unknown>;
}

/**
 * 通知列表查询 DTO
 */
export class NotificationQueryDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

/**
 * 标记已读 DTO
 */
export class MarkReadDto {
  @IsOptional()
  @IsString({ each: true })
  notificationIds?: string[];

  @IsOptional()
  @IsBoolean()
  markAll?: boolean;
}

/**
 * 通知响应 DTO
 */
export class NotificationResponseDto {
  id!: string;
  type!: NotificationType;
  title!: string;
  content!: string;
  data?: Record<string, unknown> | null;
  isRead!: boolean;
  createdAt!: Date;
}

/**
 * 通知列表响应 DTO
 */
export class NotificationListResponseDto {
  notifications!: NotificationResponseDto[];
  total!: number;
  unreadCount!: number;
}

/**
 * 未读计数响应 DTO
 */
export class UnreadCountResponseDto {
  count!: number;
}
