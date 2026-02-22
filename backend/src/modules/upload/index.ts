export { UploadModule } from './upload.module.js';
export {
  NovelParserService,
  SUPPORTED_ENCODINGS,
} from './novel-parser.service.js';
export type { SupportedEncoding } from './novel-parser.service.js';
export { DocxParserService } from './docx-parser.service.js';
export { ChapterDetectorService } from './chapter-detector.service.js';
export {
  BatchImportService,
  SUPPORTED_FILE_TYPES,
} from './batch-import.service.js';
export type { SupportedFileType } from './batch-import.service.js';
export { MangaUploadService } from './manga-upload.service.js';
export { MangaUploadController } from './manga-upload.controller.js';
export { ArchiveParserService } from './archive-parser.service.js';
export type {
  ExtractedImage,
  ArchiveParseResult,
  SupportedArchiveType,
} from './archive-parser.service.js';
export type { ParsedNovelContent } from './interfaces/parsed-novel-content.interface.js';
export type {
  DetectedChapter,
  ChapterDetectionResult,
  ChapterPatternType,
} from './interfaces/detected-chapter.interface.js';
export type {
  BatchImportResult,
  BatchImportOptions,
  ImportedChapterInfo,
  FailedChapterInfo,
} from './interfaces/batch-import.interface.js';
export {
  BatchImportDto,
  BatchImportResponseDto,
  PreviewChaptersDto,
  PreviewChaptersResponseDto,
} from './dto/batch-import.dto.js';
export type { ChapterPreviewItem } from './dto/batch-import.dto.js';
export {
  AddMangaPageDto,
  BatchAddMangaPagesDto,
  ReorderMangaPagesDto,
  ReplaceMangaPageDto,
} from './dto/manga-upload.dto.js';
export type {
  MangaPageUploadResultDto,
  BatchMangaUploadResponseDto,
  ReorderMangaPagesResponseDto,
  DeleteMangaPageResponseDto,
  ReplaceMangaPageResponseDto,
} from './dto/manga-upload.dto.js';
export type {
  ArchiveUploadResponseDto,
  ArchivePreviewResponseDto,
  ArchiveImagePreviewDto,
} from './dto/archive-upload.dto.js';
