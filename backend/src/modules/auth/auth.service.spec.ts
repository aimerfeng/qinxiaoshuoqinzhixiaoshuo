import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { DeviceFingerprintService } from './device-fingerprint.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from '../../redis/session.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userProfile: {
      create: jest.fn(),
    },
  };

  const mockEmailVerificationService = {
    generateVerificationToken: jest
      .fn()
      .mockResolvedValue('mock-verification-token'),
    sendVerificationEmail: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockSessionService = {
    isAccountLocked: jest.fn().mockResolvedValue(false),
    getAccountLockoutRemaining: jest.fn().mockResolvedValue(0),
    trackLoginAttempt: jest.fn().mockResolvedValue(1),
    clearLoginAttempts: jest.fn().mockResolvedValue(undefined),
    createSession: jest.fn().mockResolvedValue({
      sessionId: 'mock-session-id',
      userId: 'user-uuid-123',
    }),
    storeRefreshToken: jest.fn().mockResolvedValue(undefined),
    validateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn().mockResolvedValue(true),
    getSession: jest.fn(),
    updateSessionActivity: jest.fn().mockResolvedValue(true),
    deleteSession: jest.fn().mockResolvedValue(true),
    deleteUserSessions: jest.fn().mockResolvedValue(3),
  };

  const mockDeviceFingerprintService = {
    recordDeviceFingerprint: jest.fn().mockResolvedValue(true),
    isKnownDevice: jest.fn().mockResolvedValue(false),
    getUserDevices: jest.fn().mockResolvedValue([]),
    removeDevice: jest.fn().mockResolvedValue(true),
    getDeviceCount: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: DeviceFingerprintService,
          useValue: mockDeviceFingerprintService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const validRegisterDto: RegisterDto = {
      email: 'test@example.com',
      password: 'Password123',
      username: 'testuser',
      displayName: 'Test User',
    };

    it('should successfully register a new user', async () => {
      const mockUser = {
        id: 'user-uuid-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.create.mockResolvedValue({
        id: 'profile-uuid-123',
        userId: mockUser.id,
      });

      const result = await service.register(validRegisterDto);

      expect(result).toEqual({
        userId: mockUser.id,
        message: '注册成功，验证邮件已发送到您的邮箱',
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.userProfile.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'test@example.com',
      });

      await expect(service.register(validRegisterDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException with correct message when email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'test@example.com',
      });

      await expect(service.register(validRegisterDto)).rejects.toThrow(
        '该邮箱已被注册',
      );
    });

    it('should throw ConflictException when username already exists', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'existing-user', username: 'testuser' }); // username check

      await expect(service.register(validRegisterDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should convert email to lowercase', async () => {
      const dtoWithUppercaseEmail: RegisterDto = {
        ...validRegisterDto,
        email: 'TEST@EXAMPLE.COM',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.create.mockResolvedValue({
        id: 'profile-uuid-123',
        userId: mockUser.id,
      });

      await service.register(dtoWithUppercaseEmail);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should use username as displayName when displayName is not provided', async () => {
      const dtoWithoutDisplayName: RegisterDto = {
        email: 'test@example.com',
        password: 'Password123',
        username: 'testuser',
      };

      const mockUser = {
        id: 'user-uuid-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'testuser',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.create.mockResolvedValue({
        id: 'profile-uuid-123',
        userId: mockUser.id,
      });

      await service.register(dtoWithoutDisplayName);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayName: 'testuser',
          }),
        }),
      );
    });

    it('should hash password with bcrypt cost factor >= 12', async () => {
      const mockUser = {
        id: 'user-uuid-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.create.mockResolvedValue({
        id: 'profile-uuid-123',
        userId: mockUser.id,
      });

      await service.register(validRegisterDto);

      // Verify that the password hash was created (starts with $2b$ for bcrypt)
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: expect.stringMatching(/^\$2[aby]\$\d{2}\$/),
          }),
        }),
      );
    });

    it('should throw InternalServerErrorException when database error occurs', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.register(validRegisterDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should generate verification token and send verification email', async () => {
      const mockUser = {
        id: 'user-uuid-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.create.mockResolvedValue({
        id: 'profile-uuid-123',
        userId: mockUser.id,
      });

      await service.register(validRegisterDto);

      expect(
        mockEmailVerificationService.generateVerificationToken,
      ).toHaveBeenCalledWith(mockUser.id, mockUser.email);
      expect(
        mockEmailVerificationService.sendVerificationEmail,
      ).toHaveBeenCalledWith(
        mockUser.email,
        'mock-verification-token',
        mockUser.id,
      );
    });
  });

  describe('login', () => {
    const validLoginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    const mockUser = {
      id: 'user-uuid-123',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      passwordHash:
        '$2b$12$dwk5UnOqdJOlAS0lRhUkO.ScQ4hKGP/yke.fK3ITlkh.CnZTIPAHK', // bcrypt hash of 'Password123'
      isEmailVerified: true,
      isActive: true,
      profile: {
        avatar: 'https://example.com/avatar.jpg',
      },
    };

    beforeEach(() => {
      // Reset session service mocks
      mockSessionService.isAccountLocked.mockResolvedValue(false);
      mockSessionService.getAccountLockoutRemaining.mockResolvedValue(0);
      mockSessionService.trackLoginAttempt.mockResolvedValue(1);
    });

    it('should successfully login with valid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login(validLoginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.isNewDevice).toBe(true);
      expect(mockSessionService.clearLoginAttempts).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSessionService.trackLoginAttempt).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$12$differenthash',
      });

      await expect(service.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSessionService.trackLoginAttempt).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when account is locked', async () => {
      mockSessionService.isAccountLocked.mockResolvedValue(true);
      mockSessionService.getAccountLockoutRemaining.mockResolvedValue(600); // 10 minutes

      await expect(service.login(validLoginDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when account is disabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(validLoginDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should include email verification warning when email is not verified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isEmailVerified: false,
      });

      const result = await service.login(validLoginDto);

      expect(result.emailVerificationWarning).toBeDefined();
      expect(result.emailVerificationWarning).toContain('邮箱尚未验证');
    });

    it('should convert email to lowercase', async () => {
      const dtoWithUppercaseEmail: LoginDto = {
        email: 'TEST@EXAMPLE.COM',
        password: 'Password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.login(dtoWithUppercaseEmail);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        }),
      );
    });

    it('should create session and store refresh token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.login(validLoginDto);

      expect(mockSessionService.createSession).toHaveBeenCalledWith({
        userId: mockUser.id,
        deviceInfo: undefined,
      });
      expect(mockSessionService.storeRefreshToken).toHaveBeenCalled();
    });

    it('should generate JWT tokens with correct payload', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.login(validLoginDto);

      // Access token should include sub, email, and sessionId
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          sessionId: 'mock-session-id',
        }),
        expect.objectContaining({
          expiresIn: 24 * 60 * 60, // 24 hours in seconds
        }),
      );

      // Refresh token should include sub, sessionId, and type
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          sessionId: 'mock-session-id',
          type: 'refresh',
        }),
        expect.objectContaining({
          expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
        }),
      );
    });

    it('should show remaining attempts when password is wrong', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$12$differenthash',
      });
      mockSessionService.trackLoginAttempt.mockResolvedValue(3);

      await expect(service.login(validLoginDto)).rejects.toThrow(
        /还剩 2 次尝试机会/,
      );
    });

    it('should lock account after 5 failed attempts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$12$differenthash',
      });
      mockSessionService.trackLoginAttempt.mockResolvedValue(5);

      await expect(service.login(validLoginDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('refreshToken', () => {
    const mockRefreshToken = 'mock-refresh-token';
    const mockTokenData = {
      userId: 'user-uuid-123',
      sessionId: 'mock-session-id',
    };

    const mockUser = {
      id: 'user-uuid-123',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      passwordHash: '$2b$12$hash',
      isEmailVerified: true,
      isActive: true,
    };

    const mockSession = {
      sessionId: 'mock-session-id',
      userId: 'user-uuid-123',
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    beforeEach(() => {
      mockSessionService.validateRefreshToken.mockResolvedValue(mockTokenData);
      mockSessionService.getSession.mockResolvedValue(mockSession);
      mockJwtService.verify = jest.fn().mockReturnValue({
        sub: 'user-uuid-123',
        sessionId: 'mock-session-id',
        type: 'refresh',
      });
    });

    it('should successfully refresh tokens with valid refresh token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.refreshToken(mockRefreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockSessionService.revokeRefreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
      );
      expect(mockSessionService.storeRefreshToken).toHaveBeenCalled();
      expect(mockSessionService.updateSessionActivity).toHaveBeenCalledWith(
        'mock-session-id',
      );
    });

    it('should throw UnauthorizedException when refresh token is not in Redis', async () => {
      mockSessionService.validateRefreshToken.mockResolvedValue(null);

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when JWT verification fails', async () => {
      mockJwtService.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSessionService.revokeRefreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
      );
    });

    it('should throw UnauthorizedException when token type is not refresh', async () => {
      mockJwtService.verify = jest.fn().mockReturnValue({
        sub: 'user-uuid-123',
        sessionId: 'mock-session-id',
        type: 'access', // Wrong type
      });

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSessionService.revokeRefreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
      );
    });

    it('should throw ForbiddenException when user is not active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockSessionService.revokeRefreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
      );
    });

    it('should throw UnauthorizedException when session does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockSessionService.getSession.mockResolvedValue(null);

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockSessionService.revokeRefreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
      );
    });

    it('should implement token rotation (revoke old, create new)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.refreshToken(mockRefreshToken);

      // Old token should be revoked
      expect(mockSessionService.revokeRefreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
      );
      // New token should be stored
      expect(mockSessionService.storeRefreshToken).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    const mockRefreshToken = 'mock-refresh-token';
    const mockTokenData = {
      userId: 'user-uuid-123',
      sessionId: 'mock-session-id',
    };

    beforeEach(() => {
      mockSessionService.validateRefreshToken.mockResolvedValue(mockTokenData);
    });

    it('should successfully logout and revoke refresh token', async () => {
      const result = await service.logout(mockRefreshToken);

      expect(result.message).toBe('已成功登出');
      expect(mockSessionService.revokeRefreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
      );
      expect(mockSessionService.deleteSession).toHaveBeenCalledWith(
        'mock-session-id',
      );
    });

    it('should return success even when token is invalid (idempotent)', async () => {
      mockSessionService.validateRefreshToken.mockResolvedValue(null);

      const result = await service.logout(mockRefreshToken);

      expect(result.message).toBe('已成功登出');
    });

    it('should logout from all devices when logoutAll is true', async () => {
      const result = await service.logout(mockRefreshToken, true);

      expect(result.message).toBe('已成功从所有设备登出');
      expect(result.sessionsRevoked).toBe(3);
      expect(mockSessionService.deleteUserSessions).toHaveBeenCalledWith(
        'user-uuid-123',
      );
    });

    it('should only logout current session when logoutAll is false', async () => {
      const result = await service.logout(mockRefreshToken, false);

      expect(result.message).toBe('已成功登出');
      expect(mockSessionService.deleteUserSessions).not.toHaveBeenCalled();
      expect(mockSessionService.deleteSession).toHaveBeenCalledWith(
        'mock-session-id',
      );
    });
  });
});
