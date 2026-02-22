import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordResetService } from './password-reset.service';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from '../../redis/session.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('PasswordResetService', () => {
  let service: PasswordResetService;

  const mockRedisClient = {
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  };

  const mockRedisService = {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn(),
    ttl: jest.fn(),
    getClient: jest.fn().mockReturnValue(mockRedisClient),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockSessionService = {
    deleteUserSessions: jest.fn().mockResolvedValue(2),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestPasswordReset', () => {
    const email = 'test@example.com';
    const userId = 'user-123';

    it('should request password reset successfully for existing user', async () => {
      mockRedisService.get.mockResolvedValue(null); // No rate limit
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isActive: true,
      });

      const result = await service.requestPasswordReset(email);

      expect(result).toEqual({
        success: true,
        message: '如果该邮箱已注册，重置链接将发送到您的邮箱',
      });
      expect(mockRedisService.set).toHaveBeenCalled(); // Token stored
      expect(mockRedisClient.incr).toHaveBeenCalled(); // Rate limit incremented
    });

    it('should return success message for non-existent email (security)', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset(email);

      expect(result).toEqual({
        success: true,
        message: '如果该邮箱已注册，重置链接将发送到您的邮箱',
      });
      // Should still increment rate limit to prevent enumeration
      expect(mockRedisClient.incr).toHaveBeenCalled();
    });

    it('should return success message for inactive account (security)', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isActive: false,
      });

      const result = await service.requestPasswordReset(email);

      expect(result).toEqual({
        success: true,
        message: '如果该邮箱已注册，重置链接将发送到您的邮箱',
      });
    });

    it('should throw HttpException when rate limit exceeded', async () => {
      mockRedisService.get.mockResolvedValue('3'); // Max requests reached
      mockRedisService.ttl.mockResolvedValue(1800); // 30 minutes remaining

      await expect(service.requestPasswordReset(email)).rejects.toThrow(
        HttpException,
      );

      try {
        await service.requestPasswordReset(email);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    });

    it('should normalize email to lowercase', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        isActive: true,
      });

      await service.requestPasswordReset('TEST@EXAMPLE.COM');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('resetPassword', () => {
    const validToken = 'valid-token-123';
    const userId = 'user-123';
    const email = 'test@example.com';
    const newPassword = 'NewPassword123';

    it('should reset password successfully', async () => {
      const tokenData = JSON.stringify({
        userId,
        email,
        createdAt: Date.now(),
      });

      mockRedisService.get.mockResolvedValue(tokenData);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isActive: true,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: userId,
      });

      const result = await service.resetPassword(validToken, newPassword);

      expect(result).toEqual({
        success: true,
        message: '密码重置成功，请使用新密码登录',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { passwordHash: 'hashed-password' },
      });
      expect(mockRedisService.del).toHaveBeenCalled();
      expect(mockSessionService.deleteUserSessions).toHaveBeenCalledWith(
        userId,
      );
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', newPassword),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.resetPassword(validToken, newPassword),
      ).rejects.toThrow('重置链接无效或已过期，请重新申请');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const tokenData = JSON.stringify({
        userId,
        email,
        createdAt: Date.now(),
      });

      mockRedisService.get.mockResolvedValue(tokenData);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword(validToken, newPassword),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for inactive account', async () => {
      const tokenData = JSON.stringify({
        userId,
        email,
        createdAt: Date.now(),
      });

      mockRedisService.get.mockResolvedValue(tokenData);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isActive: false,
      });

      await expect(
        service.resetPassword(validToken, newPassword),
      ).rejects.toThrow('账户已被禁用，无法重置密码');
    });

    it('should invalidate all user sessions after password reset', async () => {
      const tokenData = JSON.stringify({
        userId,
        email,
        createdAt: Date.now(),
      });

      mockRedisService.get.mockResolvedValue(tokenData);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isActive: true,
      });
      mockPrismaService.user.update.mockResolvedValue({ id: userId });

      await service.resetPassword(validToken, newPassword);

      expect(mockSessionService.deleteUserSessions).toHaveBeenCalledWith(
        userId,
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
});
