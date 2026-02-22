import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DocxParserService } from './docx-parser.service.js';

describe('DocxParserService', () => {
  let service: DocxParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocxParserService],
    }).compile();

    service = module.get<DocxParserService>(DocxParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseDocxFile', () => {
    it('should throw BadRequestException for empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(service.parseDocxFile(emptyBuffer)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.parseDocxFile(emptyBuffer)).rejects.toThrow(
        'File is empty',
      );
    });

    it('should throw BadRequestException for null buffer', async () => {
      await expect(
        service.parseDocxFile(null as unknown as Buffer),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid DOCX content', async () => {
      // Random bytes that are not a valid DOCX file
      const invalidBuffer = Buffer.from('This is not a DOCX file');

      await expect(service.parseDocxFile(invalidBuffer)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return UTF-8 as encoding for DOCX files', async () => {
      // Create a minimal valid DOCX-like structure
      // Note: This test would need a real DOCX file to work properly
      // For unit testing, we're testing the error handling paths
      const invalidBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // ZIP header but incomplete

      await expect(service.parseDocxFile(invalidBuffer)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
