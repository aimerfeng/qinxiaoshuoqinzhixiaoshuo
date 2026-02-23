import { Module, forwardRef } from '@nestjs/common';
import { NovelParserService } from './novel-parser.service.js';
import { DocxParserService } from './docx-parser.service.js';
import { ChapterDetectorService } from './chapter-detector.service.js';
import { BatchImportService } from './batch-import.service.js';
import { MangaUploadService } from './manga-upload.service.js';
import { MangaUploadController } from './manga-upload.controller.js';
import { ArchiveParserService } from './archive-parser.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ParagraphsModule } from '../paragraphs/paragraphs.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 上传模块
 * Module for handling file uploads and parsing
 *
 * Features:
 * - TXT file parsing with encoding detection
 * - Support for UTF-8, GBK, GB2312 encodings
 * - DOCX file parsing with text extraction
 * - Automatic chapter detection and splitting
 * - Batch chapter import from uploaded files
 * - Manga page batch upload and management
 * - Archive (ZIP/CBZ) parsing for manga uploads
 */
@Module({
  imports: [PrismaModule, forwardRef(() => ParagraphsModule), AuthModule],
  controllers: [MangaUploadController],
  providers: [
    NovelParserService,
    DocxParserService,
    ChapterDetectorService,
    BatchImportService,
    MangaUploadService,
    ArchiveParserService,
  ],
  exports: [
    NovelParserService,
    DocxParserService,
    ChapterDetectorService,
    BatchImportService,
    MangaUploadService,
    ArchiveParserService,
  ],
})
export class UploadModule {}
