import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ParsedParagraph, ParagraphChangesSummary } from './dto/index.js';
import * as crypto from 'crypto';

/**
 * 段落服务
 * 处理段落解析、锚点生成等业务逻辑
 *
 * 需求3: 段落锚点精准引用体系（Anchor Network）
 */
@Injectable()
export class ParagraphsService {
  private readonly logger = new Logger(ParagraphsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 计算文本字数
   * 中文字符按1个字计算，英文单词按1个字计算
   * 与 ChaptersService.calculateWordCount 保持一致
   */
  static calculateWordCount(content: string): number {
    if (!content || content.trim().length === 0) {
      return 0;
    }

    // Remove HTML tags if any
    const text = content.replace(/<[^>]*>/g, '');

    // Count Chinese characters
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;

    // Count English words (sequences of latin letters/numbers)
    const englishWords = (
      text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9]+/g) || []
    ).length;

    return chineseChars + englishWords;
  }

  /**
   * 计算内容的 SHA-256 哈希值
   * 用于检测段落内容变更
   */
  static calculateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * 生成锚点ID
   * 格式: {work_id}:{chapter_id}:{paragraph_index}
   *
   * 需求3验收标准1: WHEN Chapter 发布 THEN System SHALL 为每个 Paragraph 生成格式为
   * `{work_id}:{chapter_id}:{paragraph_index}` 的 Anchor_ID
   */
  static generateAnchorId(
    workId: string,
    chapterId: string,
    paragraphIndex: number,
  ): string {
    return `${workId}:${chapterId}:${paragraphIndex}`;
  }

  /**
   * 解析章节内容为段落数组
   *
   * 段落解析规则：
   * 1. 按双换行符(\n\n)分割内容
   * 2. 去除每个段落的首尾空白
   * 3. 过滤掉空段落
   * 4. 为每个段落计算字数
   *
   * @param content 章节内容
   * @returns 解析后的段落数组
   */
  parseChapterContent(content: string): ParsedParagraph[] {
    if (!content || content.trim().length === 0) {
      return [];
    }

    // Split by double newlines
    const rawParagraphs = content.split(/\n\n+/);

    const parsedParagraphs: ParsedParagraph[] = [];
    let index = 0;

    for (const rawParagraph of rawParagraphs) {
      // Trim whitespace from each paragraph
      const trimmedContent = rawParagraph.trim();

      // Filter out empty paragraphs
      if (trimmedContent.length === 0) {
        continue;
      }

      // Calculate word count for each paragraph
      const wordCount = ParagraphsService.calculateWordCount(trimmedContent);

      parsedParagraphs.push({
        index,
        content: trimmedContent,
        wordCount,
      });

      index++;
    }

    return parsedParagraphs;
  }

  /**
   * 为已发布章节创建段落和锚点记录
   *
   * 需求2验收标准2: WHEN Creator 发布章节到 Main_Branch THEN System SHALL 为每个 Paragraph 自动生成 Anchor_ID
   * 需求3验收标准1: WHEN Chapter 发布 THEN System SHALL 为每个 Paragraph 生成格式为
   * `{work_id}:{chapter_id}:{paragraph_index}` 的 Anchor_ID
   *
   * @param workId 作品ID
   * @param chapterId 章节ID
   * @param content 章节内容
   * @returns 创建的段落数量
   */
  async createParagraphsForChapter(
    workId: string,
    chapterId: string,
    content: string,
  ): Promise<number> {
    // Parse content into paragraphs
    const parsedParagraphs = this.parseChapterContent(content);

    if (parsedParagraphs.length === 0) {
      this.logger.log(
        `No paragraphs to create for chapter: ${chapterId} (empty content)`,
      );
      return 0;
    }

    // Delete existing paragraphs for this chapter (in case of re-publish)
    await this.prisma.paragraph.deleteMany({
      where: { chapterId },
    });

    // Create paragraph records with anchor IDs
    const paragraphData = parsedParagraphs.map((p) => ({
      chapterId,
      anchorId: ParagraphsService.generateAnchorId(workId, chapterId, p.index),
      content: p.content,
      contentHash: ParagraphsService.calculateContentHash(p.content),
      orderIndex: p.index,
    }));

    await this.prisma.paragraph.createMany({
      data: paragraphData,
    });

    this.logger.log(
      `Created ${parsedParagraphs.length} paragraphs for chapter: ${chapterId}`,
    );

    return parsedParagraphs.length;
  }

  /**
   * 删除章节的所有段落记录
   * 用于章节删除或取消发布时清理段落数据
   *
   * @param chapterId 章节ID
   * @returns 删除的段落数量
   */
  async deleteParagraphsForChapter(chapterId: string): Promise<number> {
    const result = await this.prisma.paragraph.deleteMany({
      where: { chapterId },
    });

    this.logger.log(
      `Deleted ${result.count} paragraphs for chapter: ${chapterId}`,
    );

    return result.count;
  }

  /**
   * 更新已发布章节的段落记录
   *
   * 需求3验收标准6: WHEN 被引用的 Paragraph 内容更新 THEN System SHALL 在 Card 中标记"内容已更新"提示
   * 需求3验收标准7: IF 被引用的 Paragraph 被删除 THEN System SHALL 在 Card 中显示"原文已不存在"提示
   *
   * 变更检测逻辑：
   * - 按 orderIndex（段落位置）比较
   * - 如果同一位置的 contentHash 不同 → 修改
   * - 如果新索引在旧数据中不存在 → 新增
   * - 如果旧索引在新数据中不存在 → 删除（软删除）
   * - 如果 contentHash 相同 → 未变更
   *
   * @param workId 作品ID
   * @param chapterId 章节ID
   * @param content 新的章节内容
   * @returns 段落变更摘要
   */
  async updateParagraphsForChapter(
    workId: string,
    chapterId: string,
    content: string,
  ): Promise<ParagraphChangesSummary> {
    // Parse new content into paragraphs
    const newParagraphs = this.parseChapterContent(content);

    // Get existing paragraphs for this chapter
    const existingParagraphs = await this.prisma.paragraph.findMany({
      where: { chapterId, isDeleted: false },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        orderIndex: true,
        contentHash: true,
        anchorId: true,
      },
    });

    // Build a map of existing paragraphs by orderIndex
    const existingByIndex = new Map(
      existingParagraphs.map((p) => [p.orderIndex, p]),
    );

    const summary: ParagraphChangesSummary = {
      added: 0,
      modified: 0,
      deleted: 0,
      unchanged: 0,
    };

    // Track which existing paragraphs are still present
    const processedIndices = new Set<number>();

    // Process each new paragraph
    for (const newParagraph of newParagraphs) {
      const newContentHash = ParagraphsService.calculateContentHash(
        newParagraph.content,
      );
      const existing = existingByIndex.get(newParagraph.index);

      if (existing) {
        // Paragraph exists at this index
        processedIndices.add(newParagraph.index);

        if (existing.contentHash === newContentHash) {
          // Content unchanged
          summary.unchanged++;
        } else {
          // Content modified - update the paragraph
          await this.prisma.paragraph.update({
            where: { id: existing.id },
            data: {
              content: newParagraph.content,
              contentHash: newContentHash,
            },
          });

          // 需求3验收标准6: 标记引用该段落的 Quote 为"内容已更新"
          await this.prisma.quote.updateMany({
            where: {
              paragraphId: existing.id,
              contentUpdated: false,
            },
            data: {
              contentUpdated: true,
            },
          });

          summary.modified++;
        }
      } else {
        // New paragraph at this index - create it
        await this.prisma.paragraph.create({
          data: {
            chapterId,
            anchorId: ParagraphsService.generateAnchorId(
              workId,
              chapterId,
              newParagraph.index,
            ),
            content: newParagraph.content,
            contentHash: newContentHash,
            orderIndex: newParagraph.index,
          },
        });
        summary.added++;
      }
    }

    // Soft delete paragraphs that no longer exist in new content
    for (const existing of existingParagraphs) {
      if (!processedIndices.has(existing.orderIndex)) {
        await this.prisma.paragraph.update({
          where: { id: existing.id },
          data: { isDeleted: true },
        });

        // 需求3验收标准7: 标记引用该段落的 Quote 为"原文已不存在"
        await this.prisma.quote.updateMany({
          where: {
            paragraphId: existing.id,
            contentDeleted: false,
          },
          data: {
            contentDeleted: true,
          },
        });

        summary.deleted++;
      }
    }

    this.logger.log(
      `Updated paragraphs for chapter: ${chapterId} - ` +
        `added: ${summary.added}, modified: ${summary.modified}, ` +
        `deleted: ${summary.deleted}, unchanged: ${summary.unchanged}`,
    );

    return summary;
  }
}
