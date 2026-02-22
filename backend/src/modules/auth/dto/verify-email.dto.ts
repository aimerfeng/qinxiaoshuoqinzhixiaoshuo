import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

/**
 * 邮箱验证 DTO
 * 用于验证邮箱的请求参数
 */
export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: '验证令牌不能为空' })
  token!: string;
}

/**
 * 重新发送验证邮件 DTO
 */
export class ResendVerificationDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email!: string;
}
