import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailVerificationService } from './email-verification.service';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;

  const mockRedisService = {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn(),
    ttl: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateVerificationToken', () => {
    it('should generate a token and store it in Redis', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      const token = await service.generateVerificationToken(userId, email);

      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining('email_verification:'),
        expect.stringContaining(userId),
        24 * 60 * 60, // 24 hours
      );
    });

    it('should store email in lowercase', async () => {
      const userId = 'user-123';
      const email = 'TEST@EXAMPLE.COM';

      await service.generateVerificationToken(userId, email);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('test@example.com'),
        expect.any(Number),
      );
    });
  });

  describe('verifyEmail', () => {
    const validToken = 'valid-token-123';
    const userId = 'user-123';
    const email = 'test@example.com';

    it('should verify email successfully', async () => {
      const tokenData = JSON.stringify({
        userId,
        email,
        createdAt: Date.now(),
      });

      mockRedisService.get.mockResolvedValue(tokenData);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isEmailVerified: false,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: userId,
        isEmailVerified: true,
      });

      const result = await service.verifyEmail(validToken);

      expect(result).toEqual({
        success: true,
        message: '邮箱验证成功',
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isEmailVerified: true },
      });
      expect(mockRedisService.del).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(service.verifyEmail(validToken)).rejects.toThrow(
        '验证链接无效或已过期，请重新发送验证邮件',
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const tokenData = JSON.stringify({
        userId,
        email,
        createdAt: Date.now(),
      });

      mockRedisService.get.mockResolvedValue(tokenData);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail(validToken)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when email is already verified', async () => {
      const tokenData = JSON.stringify({
        userId,
        email,
        createdAt: Date.now(),
      });

      mockRedisService.get.mockResolvedValue(tokenData);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isEmailVerified: true,
      });

      await expect(service.verifyEmail(validToken)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('resendVerificationEmail', () => {
    const email = 'test@example.com';
    const userId = 'user-123';

    it('should resend verification email successfully', async () => {
      mockRedisService.exists.mockResolvedValue(0); // No cooldown
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isEmailVerified: false,
      });

      const result = await service.resendVerificationEmail(email);

      expect(result).toEqual({
        success: true,
        message: '验证邮件已发送，请查收',
      });
      expect(mockRedisService.set).toHaveBeenCalledTimes(2); // Token + cooldown
    });

    it('should throw BadRequestException when in cooldown period', async () => {
      mockRedisService.exists.mockResolvedValue(1);
      mockRedisService.ttl.mockResolvedValue(45);

      await expect(service.resendVerificationEmail(email)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return success message for non-existent email (security)', async () => {
      mockRedisService.exists.mockResolvedValue(0);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.resendVerificationEmail(email);

      expect(result).toEqual({
        success: true,
        message: '如果该邮箱已注册，验证邮件将发送到您的邮箱',
      });
    });

    it('should throw ConflictException when email is already verified', async () => {
      mockRedisService.exists.mockResolvedValue(0);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isEmailVerified: true,
      });

      await expect(service.resendVerificationEmail(email)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('isTokenValid', () => {
    it('should return true for valid token', async () => {
      mockRedisService.exists.mockResolvedValue(1);

      const result = await service.isTokenValid('valid-token');

      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      mockRedisService.exists.mockResolvedValue(0);

      const result = await service.isTokenValid('invalid-token');

      expect(result).toBe(false);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should log verification email details in development mode', () => {
      const logSpy = jest.spyOn(service['logger'], 'log');

      service.sendVerificationEmail(
        'test@example.com',
        'token-123',
        'user-123',
      );

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('验证邮件'));
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com'),
      );
    });
  });
});
