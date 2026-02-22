import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

/**
 * 重置密码 DTO
 * 需求1验收标准3: WHEN 用户请求密码重置 THEN System SHALL 发送包含重置链接的邮件
 * NFR-3: 敏感操作（密码修改、提现）需二次验证
 *
 * 验证规则：
 * - token: 必填，重置令牌
 * - newPassword: 最少8位，含大小写+数字
 */
export class ResetPasswordDto {
  @IsString({ message: '重置令牌不能为空' })
  @MinLength(1, { message: '重置令牌不能为空' })
  token!: string;

  @IsString()
  @MinLength(8, { message: '密码至少需要8个字符' })
  @MaxLength(72, { message: '密码不能超过72个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: '密码必须包含大写字母、小写字母和数字',
  })
  newPassword!: string;
}
