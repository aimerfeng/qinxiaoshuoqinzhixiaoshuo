import { DanmakuType } from '@prisma/client';

/**
 * 弹幕响应 DTO
 */
export class DanmakuResponseDto {
  id!: string;
  anchorId!: string;
  authorId!: string;
  authorName?: string;
  content!: string;
  color!: string;
  type!: DanmakuType;
  fontSize!: number;
  likeCount!: number;
  createdAt!: Date;
}

/**
 * 弹幕列表响应 DTO
 */
export class DanmakuListResponseDto {
  items!: DanmakuResponseDto[];
  total!: number;
  anchorId!: string;
}
