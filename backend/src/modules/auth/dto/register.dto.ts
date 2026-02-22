import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

/**
 * 用户注册 DTO
 * 验证规则：
 * - email: 有效邮箱格式
 * - password: 最少8位，含大小写+数字
 * - username: 2-20字符，字母数字下划线
 */
export class RegisterDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email!: string;

  @IsString()
  @MinLength(8, { message: '密码至少需要8个字符' })
  @MaxLength(72, { message: '密码不能超过72个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: '密码必须包含大写字母、小写字母和数字',
  })
  password!: string;

  @IsString()
  @MinLength(2, { message: '用户名至少需要2个字符' })
  @MaxLength(20, { message: '用户名不能超过20个字符' })
  @Matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, {
    message: '用户名只能包含字母、数字、下划线和中文',
  })
  username!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '昵称不能超过50个字符' })
  displayName?: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}
