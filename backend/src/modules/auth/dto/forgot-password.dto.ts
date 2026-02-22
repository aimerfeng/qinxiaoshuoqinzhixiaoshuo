import { IsEmail } from 'class-validator';

/**
 * 忘记密码 DTO
 * 需求1验收标准3: WHEN 用户请求密码重置 THEN System SHALL 发送包含重置链接的邮件
 *
 * 验证规则：
 * - email: 有效邮箱格式
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email!: string;
}
