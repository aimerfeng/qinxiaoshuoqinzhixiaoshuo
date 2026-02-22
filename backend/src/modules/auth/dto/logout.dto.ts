import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * 登出 DTO
 * 用于使刷新令牌失效
 *
 * 验证规则：
 * - refreshToken: 必填，要撤销的刷新令牌
 * - logoutAll: 可选，是否登出所有设备
 */
export class LogoutDto {
  @IsString({ message: '刷新令牌必须是字符串' })
  @IsNotEmpty({ message: '刷新令牌不能为空' })
  refreshToken!: string;

  @IsOptional()
  logoutAll?: boolean;
}
