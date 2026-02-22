import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1, { message: '评论内容不能为空' })
  @MaxLength(500, { message: '评论内容不能超过500字' })
  content!: string;

  @IsOptional()
  @IsUUID()
  parentCommentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentionedUsers?: string[];
}

export class UpdateCommentDto {
  @IsString()
  @MinLength(1, { message: '评论内容不能为空' })
  @MaxLength(500, { message: '评论内容不能超过500字' })
  content!: string;
}
