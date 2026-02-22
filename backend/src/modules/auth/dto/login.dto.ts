import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

/**
 * 用户登录 DTO
 * 验证规则：
 * - email: 有效邮箱格式
 * - password: 必填，最少1个字符
 * - deviceFingerprint: 可选，设备指纹
 */
export class LoginDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email!: string;

  @IsString()
  @MinLength(1, { message: '请输入密码' })
  password!: string;

  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}
