import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * 管理员登录 DTO
 * 用于验证管理员登录请求参数
 */
export class AdminLoginDto {
  /**
   * 管理员邮箱
   */
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email!: string;

  /**
   * 登录密码
   */
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度至少为6位' })
  password!: string;
}
