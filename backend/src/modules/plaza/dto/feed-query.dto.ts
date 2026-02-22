import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum FeedType {
  RECOMMEND = 'recommend',
  FOLLOWING = 'following',
  TRENDING = 'trending',
}

export class FeedQueryDto {
  @IsOptional()
  @IsEnum(FeedType)
  type?: FeedType = FeedType.RECOMMEND;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class CardQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
