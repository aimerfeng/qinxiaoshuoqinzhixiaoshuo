import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CreatorController } from './creator.controller.js';
import { CreatorService } from './creator.service.js';
import { UploadService } from '../../storage/upload.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

/**
 * 创作者控制台控制器测试
 *
 * 任务 8.1.4: 图片上传 API
 */
describe('CreatorController', () => {
  let controller: CreatorController;
  let uploadService: UploadService;

  // Mock CreatorService
  const mockCreatorService = {
    getDashboard: jest.fn(),
    getWorkStats: jest.fn(),
    createOrUpdateDraft: jest.fn(),
    getDraftList: jest.fn(),
    getDraft: jest.fn(),
    deleteDraft: jest.fn(),
  };

  // Mock UploadService
  const mockUploadService = {
    uploadChapterImage: jest.fn(),
  };

  // Mock JwtAuthGuard
  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreatorController],
      providers: [
        {
          provide: CreatorService,
          useValue: mockCreatorService,
        },
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<CreatorController>(CreatorController);
    uploadService = module.get<UploadService>(UploadService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('uploadImage', () => {
    const userId = 'test-user-id';
    const mockRequest = { user: { userId } };

    it('should upload image successfully', async () => {
      // Arrange
      const mockFile = {
        buffer: Buffer.from('fake image data'),
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const mockUploadResult = {
        key: 'chapter-images/test-user-id/123456_test-image.jpg',
        url: 'http://localhost:9000/bucket/chapter-images/test-user-id/123456_test-image.jpg',
        publicUrl:
          'http://localhost:9000/bucket/chapter-images/test-user-id/123456_test-image.jpg',
        size: 1024,
        contentType: 'image/jpeg',
      };

      mockUploadService.uploadChapterImage.mockResolvedValue(mockUploadResult);

      // Act
      const result = await controller.uploadImage(mockFile, mockRequest);

      // Assert
      expect(mockUploadService.uploadChapterImage).toHaveBeenCalledWith(
        userId,
        {
          buffer: mockFile.buffer,
          originalname: mockFile.originalname,
          mimetype: mockFile.mimetype,
          size: mockFile.size,
        },
      );
      expect(result.success).toBe(true);
      expect(result.url).toBe(mockUploadResult.publicUrl);
      expect(result.size).toBe(mockUploadResult.size);
      expect(result.contentType).toBe(mockUploadResult.contentType);
    });

    it('should throw BadRequestException when no file provided', async () => {
      // Act & Assert
      await expect(
        controller.uploadImage(undefined as any, mockRequest),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.uploadImage(undefined as any, mockRequest),
      ).rejects.toThrow('请选择要上传的图片文件');
    });

    it('should handle PNG image upload', async () => {
      // Arrange
      const mockFile = {
        buffer: Buffer.from('fake png data'),
        originalname: 'test-image.png',
        mimetype: 'image/png',
        size: 2048,
      } as Express.Multer.File;

      const mockUploadResult = {
        key: 'chapter-images/test-user-id/123456_test-image.png',
        url: 'http://localhost:9000/bucket/chapter-images/test-user-id/123456_test-image.png',
        publicUrl:
          'http://localhost:9000/bucket/chapter-images/test-user-id/123456_test-image.png',
        size: 2048,
        contentType: 'image/png',
      };

      mockUploadService.uploadChapterImage.mockResolvedValue(mockUploadResult);

      // Act
      const result = await controller.uploadImage(mockFile, mockRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.contentType).toBe('image/png');
    });

    it('should handle GIF image upload', async () => {
      // Arrange
      const mockFile = {
        buffer: Buffer.from('fake gif data'),
        originalname: 'animation.gif',
        mimetype: 'image/gif',
        size: 5000,
      } as Express.Multer.File;

      const mockUploadResult = {
        key: 'chapter-images/test-user-id/123456_animation.gif',
        url: 'http://localhost:9000/bucket/chapter-images/test-user-id/123456_animation.gif',
        publicUrl:
          'http://localhost:9000/bucket/chapter-images/test-user-id/123456_animation.gif',
        size: 5000,
        contentType: 'image/gif',
      };

      mockUploadService.uploadChapterImage.mockResolvedValue(mockUploadResult);

      // Act
      const result = await controller.uploadImage(mockFile, mockRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.contentType).toBe('image/gif');
    });

    it('should handle WebP image upload', async () => {
      // Arrange
      const mockFile = {
        buffer: Buffer.from('fake webp data'),
        originalname: 'modern-image.webp',
        mimetype: 'image/webp',
        size: 3000,
      } as Express.Multer.File;

      const mockUploadResult = {
        key: 'chapter-images/test-user-id/123456_modern-image.webp',
        url: 'http://localhost:9000/bucket/chapter-images/test-user-id/123456_modern-image.webp',
        publicUrl:
          'http://localhost:9000/bucket/chapter-images/test-user-id/123456_modern-image.webp',
        size: 3000,
        contentType: 'image/webp',
      };

      mockUploadService.uploadChapterImage.mockResolvedValue(mockUploadResult);

      // Act
      const result = await controller.uploadImage(mockFile, mockRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.contentType).toBe('image/webp');
    });
  });
});
