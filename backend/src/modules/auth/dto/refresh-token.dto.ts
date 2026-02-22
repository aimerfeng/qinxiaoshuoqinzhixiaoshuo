import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Token 刷新 DTO
 * 需求1验收标准4: WHEN 会话令牌过期 THEN System SHALL 要求用户重新认证
 * NFR-3: 会话令牌使用JWT，有效期24小时，支持刷新
 *
 * 验证规则：
 * - refreshToken: 必填，有效的刷新令牌字符串
 */
export class RefreshTokenDto {
  @IsString({ message: '刷新令牌必须是字符串' })
  @IsNotEmpty({ message: '刷新令牌不能为空' })
  refreshToken!: string;
}
