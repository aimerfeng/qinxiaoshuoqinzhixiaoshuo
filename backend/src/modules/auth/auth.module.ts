import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { DeviceFingerprintService } from './device-fingerprint.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { AchievementModule } from '../achievement/achievement.module.js';

/**
 * 认证模块
 * 提供用户注册、登录、会话管理、密码重置等认证功能
 *
 * 注意：使用 forwardRef 解决与 AchievementModule 的循环依赖
 */
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    forwardRef(() => AchievementModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: 24 * 60 * 60, // 24 hours in seconds
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailVerificationService,
    PasswordResetService,
    DeviceFingerprintService,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    EmailVerificationService,
    PasswordResetService,
    DeviceFingerprintService,
    JwtAuthGuard,
    JwtModule,
  ],
})
export class AuthModule {}
