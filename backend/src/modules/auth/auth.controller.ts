import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  AuthService,
  RegisterResponse,
  LoginResponse,
  RefreshTokenResponse,
  LogoutResponse,
} from './auth.service.js';
import {
  EmailVerificationService,
  VerifyEmailResponse,
} from './email-verification.service.js';
import {
  PasswordResetService,
  PasswordResetResponse,
} from './password-reset.service.js';
import {
  DeviceFingerprintService,
  DeviceInfo,
} from './device-fingerprint.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import {
  VerifyEmailDto,
  ResendVerificationDto,
} from './dto/verify-email.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

/**
 * 认证控制器
 * 处理用户认证相关的 HTTP 请求
 *
 * API 路径: /api/v1/auth
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly deviceFingerprintService: DeviceFingerprintService,
  ) {}

  /**
   * 用户注册
   * POST /api/v1/auth/register
   *
   * 需求1验收标准1: WHEN 用户提交有效的邮箱和密码进行注册 THEN System SHALL 创建新账户并发送验证邮件
   *
   * @param registerDto 注册信息
   * @returns 注册结果
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(registerDto);
  }

  /**
   * 用户登录
   * POST /api/v1/auth/login
   *
   * 需求1验收标准2: WHEN 用户使用已验证的凭据登录 THEN System SHALL 生成会话令牌并授予访问权限
   * NFR-3: 会话令牌使用JWT，有效期24小时，支持刷新
   *
   * @param loginDto 登录信息
   * @returns 登录结果（包含 JWT 令牌和用户信息）
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  /**
   * 验证邮箱
   * GET /api/v1/auth/verify-email?token=xxx
   *
   * 需求1验收标准1: 验证邮件中的链接点击后验证用户邮箱
   *
   * @param query 包含验证令牌的查询参数
   * @returns 验证结果
   */
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Query() query: VerifyEmailDto,
  ): Promise<VerifyEmailResponse> {
    return this.emailVerificationService.verifyEmail(query.token);
  }

  /**
   * 重新发送验证邮件
   * POST /api/v1/auth/resend-verification
   *
   * @param resendDto 包含邮箱的请求体
   * @returns 发送结果
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resendVerification(
    @Body() resendDto: ResendVerificationDto,
  ): Promise<VerifyEmailResponse> {
    return this.emailVerificationService.resendVerificationEmail(
      resendDto.email,
    );
  }

  /**
   * 刷新访问令牌
   * POST /api/v1/auth/refresh
   *
   * 需求1验收标准4: WHEN 会话令牌过期 THEN System SHALL 要求用户重新认证
   * NFR-3: 会话令牌使用JWT，有效期24小时，支持刷新
   *
   * @param refreshTokenDto 包含刷新令牌的请求体
   * @returns 新的访问令牌和刷新令牌
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshTokenResponse> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * 用户登出
   * POST /api/v1/auth/logout
   *
   * 撤销刷新令牌，使会话失效
   *
   * @param logoutDto 包含刷新令牌的请求体
   * @returns 登出结果
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async logout(@Body() logoutDto: LogoutDto): Promise<LogoutResponse> {
    return this.authService.logout(logoutDto.refreshToken, logoutDto.logoutAll);
  }

  /**
   * 忘记密码 - 请求密码重置
   * POST /api/v1/auth/forgot-password
   *
   * 需求1验收标准3: WHEN 用户请求密码重置 THEN System SHALL 发送包含重置链接的邮件
   *
   * @param forgotPasswordDto 包含邮箱的请求体
   * @returns 请求结果
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<PasswordResetResponse> {
    return this.passwordResetService.requestPasswordReset(
      forgotPasswordDto.email,
    );
  }

  /**
   * 重置密码
   * POST /api/v1/auth/reset-password
   *
   * 需求1验收标准3: WHEN 用户请求密码重置 THEN System SHALL 发送包含重置链接的邮件
   * NFR-3: 敏感操作（密码修改、提现）需二次验证
   *
   * @param resetPasswordDto 包含重置令牌和新密码的请求体
   * @returns 重置结果
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<PasswordResetResponse> {
    return this.passwordResetService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  // ==================== 设备管理 ====================

  /**
   * 获取用户的所有已知设备
   * GET /api/v1/auth/devices
   *
   * 需求19: 风控与反作弊系统 - 设备指纹采集
   * 需求21: 设置中心 - 登录设备管理
   *
   * @param req 请求对象（包含用户信息）
   * @returns 设备列表
   */
  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserDevices(
    @Request() req: any,
  ): Promise<{ devices: DeviceInfo[] }> {
    const userId = req.user.userId as string;
    const devices = await this.deviceFingerprintService.getUserDevices(userId);
    return { devices };
  }

  /**
   * 移除设备
   * DELETE /api/v1/auth/devices/:deviceId
   *
   * 需求21: 设置中心 - 登录设备管理
   * 允许用户从设置页面移除不再使用的设备
   *
   * @param req 请求对象（包含用户信息）
   * @param deviceId 设备ID
   * @returns 移除结果
   */
  @Delete('devices/:deviceId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeDevice(
    @Request() req: any,
    @Param('deviceId') deviceId: string,
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user.userId as string;
    const success = await this.deviceFingerprintService.removeDevice(
      userId,
      deviceId,
    );

    if (success) {
      return { success: true, message: '设备已成功移除' };
    } else {
      return { success: false, message: '设备不存在或无权移除' };
    }
  }
}
