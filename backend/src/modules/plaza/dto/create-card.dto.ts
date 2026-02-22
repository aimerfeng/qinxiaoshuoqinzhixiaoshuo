import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
  IsDateString,
} from 'class-validator';

export class CreateCardDto {
  @IsString()
  @MinLength(1, { message: '内容不能为空' })
  @MaxLength(2000, { message: '内容不能超过2000字' })
  content!: string;

  @IsOptional()
  @IsString()
  quoteAnchorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mood?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsDateString()
  scheduledTime?: string;
}

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: '内容不能为空' })
  @MaxLength(2000, { message: '内容不能超过2000字' })
  content?: string;
}
