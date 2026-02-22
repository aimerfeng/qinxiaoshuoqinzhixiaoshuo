import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UploadService } from '../../storage/upload.service.js';
import { Gender } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    avatar: null,
    bio: 'Hello world',
    isEmailVerified: true,
    createdAt: new Date('2024-01-01'),
    profile: {
      backgroundImage: null,
      website: null,
      location: null,
      birthday: new Date('1990-01-01'),
      gender: Gender.MALE,
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUploadService = {
    uploadAvatar: jest.fn(),
    deleteImageWithThumbnails: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    // Note: prismaService and uploadService are available for future test extensions
    // prismaService = module.get<PrismaService>(PrismaService);
    // uploadService = module.get<UploadService>(UploadService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile when user exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-123');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          bio: true,
          isEmailVerified: true,
          createdAt: true,
          profile: {
            select: {
              backgroundImage: true,
              website: true,
              location: true,
              birthday: true,
              gender: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getProfile('user-123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile with nickname', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            user: {
              update: jest.fn().mockResolvedValue(mockUser),
              findUnique: jest.fn().mockResolvedValue({
                ...mockUser,
                displayName: 'New Nickname',
              }),
            },
            userProfile: {
              upsert: jest.fn().mockResolvedValue(mockUser.profile),
            },
          });
        },
      );

      const result = await service.updateProfile('user-123', {
        nickname: 'New Nickname',
      });

      expect(result.message).toBe('资料更新成功');
      expect(result.user.displayName).toBe('New Nickname');
    });

    it('should update user profile with bio', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            user: {
              update: jest.fn().mockResolvedValue(mockUser),
              findUnique: jest.fn().mockResolvedValue({
                ...mockUser,
                bio: 'New bio',
              }),
            },
            userProfile: {
              upsert: jest.fn().mockResolvedValue(mockUser.profile),
            },
          });
        },
      );

      const result = await service.updateProfile('user-123', {
        bio: 'New bio',
      });

      expect(result.message).toBe('资料更新成功');
      expect(result.user.bio).toBe('New bio');
    });

    it('should update user profile with gender', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            user: {
              update: jest.fn().mockResolvedValue(mockUser),
              findUnique: jest.fn().mockResolvedValue({
                ...mockUser,
                profile: {
                  ...mockUser.profile,
                  gender: Gender.FEMALE,
                },
              }),
            },
            userProfile: {
              upsert: jest.fn().mockResolvedValue({
                ...mockUser.profile,
                gender: Gender.FEMALE,
              }),
            },
          });
        },
      );

      const result = await service.updateProfile('user-123', {
        gender: Gender.FEMALE,
      });

      expect(result.message).toBe('资料更新成功');
      expect(result.user.profile?.gender).toBe(Gender.FEMALE);
    });

    it('should update user profile with birthday', async () => {
      const newBirthday = '1995-06-15';
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            user: {
              update: jest.fn().mockResolvedValue(mockUser),
              findUnique: jest.fn().mockResolvedValue({
                ...mockUser,
                profile: {
                  ...mockUser.profile,
                  birthday: new Date(newBirthday),
                },
              }),
            },
            userProfile: {
              upsert: jest.fn().mockResolvedValue({
                ...mockUser.profile,
                birthday: new Date(newBirthday),
              }),
            },
          });
        },
      );

      const result = await service.updateProfile('user-123', {
        birthday: newBirthday,
      });

      expect(result.message).toBe('资料更新成功');
    });

    it('should update multiple fields at once', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            user: {
              update: jest.fn().mockResolvedValue(mockUser),
              findUnique: jest.fn().mockResolvedValue({
                ...mockUser,
                displayName: 'Updated Name',
                bio: 'Updated bio',
                profile: {
                  ...mockUser.profile,
                  gender: Gender.OTHER,
                  birthday: new Date('2000-01-01'),
                },
              }),
            },
            userProfile: {
              upsert: jest.fn().mockResolvedValue({
                ...mockUser.profile,
                gender: Gender.OTHER,
                birthday: new Date('2000-01-01'),
              }),
            },
          });
        },
      );

      const result = await service.updateProfile('user-123', {
        nickname: 'Updated Name',
        bio: 'Updated bio',
        gender: Gender.OTHER,
        birthday: '2000-01-01',
      });

      expect(result.message).toBe('资料更新成功');
      expect(result.user.displayName).toBe('Updated Name');
      expect(result.user.bio).toBe('Updated bio');
      expect(result.user.profile?.gender).toBe(Gender.OTHER);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent-user', { nickname: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.updateProfile('user-123', { nickname: 'Test' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('uploadAvatar', () => {
    const mockFile = {
      buffer: Buffer.from('fake-image-data'),
      originalname: 'avatar.jpg',
      mimetype: 'image/jpeg',
      size: 1024 * 100, // 100KB
    };

    const mockUploadResult = {
      key: 'avatars/user-123/1234567890_avatar.webp',
      url: 'http://localhost:9000/project-anima/avatars/user-123/1234567890_avatar.webp',
      publicUrl:
        'http://localhost:9000/project-anima/avatars/user-123/1234567890_avatar.webp',
      size: 50000,
      contentType: 'image/webp',
      thumbnails: [
        {
          key: 'avatars/user-123/1234567890_avatar_128.webp',
          url: 'http://localhost:9000/project-anima/avatars/user-123/1234567890_avatar_128.webp',
          publicUrl:
            'http://localhost:9000/project-anima/avatars/user-123/1234567890_avatar_128.webp',
          width: 128,
          height: 128,
          size: 10000,
          suffix: '_128',
        },
        {
          key: 'avatars/user-123/1234567890_avatar_256.webp',
          url: 'http://localhost:9000/project-anima/avatars/user-123/1234567890_avatar_256.webp',
          publicUrl:
            'http://localhost:9000/project-anima/avatars/user-123/1234567890_avatar_256.webp',
          width: 256,
          height: 256,
          size: 25000,
          suffix: '_256',
        },
      ],
      originalWidth: 500,
      originalHeight: 500,
    };

    it('should upload avatar successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ avatar: null });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        avatar: mockUploadResult.publicUrl,
      });
      mockUploadService.uploadAvatar.mockResolvedValue(mockUploadResult);

      const result = await service.uploadAvatar('user-123', mockFile);

      expect(result.message).toBe('头像上传成功');
      expect(result.avatar.url).toBe(mockUploadResult.publicUrl);
      expect(result.avatar.thumbnails.small).toBe(
        mockUploadResult.thumbnails[0].publicUrl,
      );
      expect(result.avatar.thumbnails.medium).toBe(
        mockUploadResult.thumbnails[1].publicUrl,
      );
      expect(mockUploadService.uploadAvatar).toHaveBeenCalledWith(
        'user-123',
        mockFile,
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { avatar: mockUploadResult.publicUrl },
      });
    });

    it('should delete old avatar when uploading new one', async () => {
      const oldAvatarUrl =
        'http://localhost:9000/project-anima/avatars/user-123/old_avatar.webp';
      mockPrismaService.user.findUnique.mockResolvedValue({
        avatar: oldAvatarUrl,
      });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        avatar: mockUploadResult.publicUrl,
      });
      mockUploadService.uploadAvatar.mockResolvedValue(mockUploadResult);
      mockUploadService.deleteImageWithThumbnails.mockResolvedValue(undefined);

      const result = await service.uploadAvatar('user-123', mockFile);

      expect(result.message).toBe('头像上传成功');
      expect(mockUploadService.deleteImageWithThumbnails).toHaveBeenCalledWith(
        oldAvatarUrl,
        'avatar',
      );
    });

    it('should continue even if deleting old avatar fails', async () => {
      const oldAvatarUrl =
        'http://localhost:9000/project-anima/avatars/user-123/old_avatar.webp';
      mockPrismaService.user.findUnique.mockResolvedValue({
        avatar: oldAvatarUrl,
      });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        avatar: mockUploadResult.publicUrl,
      });
      mockUploadService.uploadAvatar.mockResolvedValue(mockUploadResult);
      mockUploadService.deleteImageWithThumbnails.mockRejectedValue(
        new Error('Delete failed'),
      );

      const result = await service.uploadAvatar('user-123', mockFile);

      expect(result.message).toBe('头像上传成功');
      expect(result.avatar.url).toBe(mockUploadResult.publicUrl);
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/pdf',
      };

      await expect(
        service.uploadAvatar('user-123', invalidFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for file too large', async () => {
      const largeFile = {
        ...mockFile,
        size: 10 * 1024 * 1024, // 10MB
      };

      await expect(service.uploadAvatar('user-123', largeFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadAvatar('nonexistent-user', mockFile),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on upload error', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ avatar: null });
      mockUploadService.uploadAvatar.mockRejectedValue(
        new Error('Upload failed'),
      );

      await expect(service.uploadAvatar('user-123', mockFile)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
