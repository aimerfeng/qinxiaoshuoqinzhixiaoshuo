import { Injectable } from '@nestjs/common';

/**
 * 敏感词过滤服务
 *
 * 需求24.7: IF 弹幕内容包含违规词汇 THEN System SHALL 拦截发送并提示修改
 */
@Injectable()
export class SensitiveWordService {
  // 基础敏感词列表（实际项目中应从数据库或配置文件加载）
  private sensitiveWords: string[] = [
    // 这里只是示例，实际应用中需要更完整的敏感词库
    '违禁词1',
    '违禁词2',
    // 可以从外部文件或数据库加载
  ];

  // 敏感词正则表达式（预编译提高性能）
  private sensitiveRegex: RegExp | null = null;

  constructor() {
    this.buildRegex();
  }

  /**
   * 构建敏感词正则表达式
   */
  private buildRegex(): void {
    if (this.sensitiveWords.length === 0) {
      this.sensitiveRegex = null;
      return;
    }

    // 转义特殊字符并构建正则
    const escapedWords = this.sensitiveWords.map((word) =>
      word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    );
    this.sensitiveRegex = new RegExp(escapedWords.join('|'), 'gi');
  }

  /**
   * 检查文本是否包含敏感词
   * @param text 待检查的文本
   * @returns 包含敏感词返回 true，否则返回 false
   */
  containsSensitiveWord(text: string): boolean {
    if (!this.sensitiveRegex) {
      return false;
    }
    return this.sensitiveRegex.test(text);
  }

  /**
   * 获取文本中的敏感词列表
   * @param text 待检查的文本
   * @returns 敏感词数组
   */
  findSensitiveWords(text: string): string[] {
    if (!this.sensitiveRegex) {
      return [];
    }
    const matches = text.match(this.sensitiveRegex);
    return matches ? [...new Set(matches)] : [];
  }

  /**
   * 过滤敏感词（替换为 *）
   * @param text 待过滤的文本
   * @returns 过滤后的文本
   */
  filterSensitiveWords(text: string): string {
    if (!this.sensitiveRegex) {
      return text;
    }
    return text.replace(this.sensitiveRegex, (match) =>
      '*'.repeat(match.length),
    );
  }

  /**
   * 添加敏感词
   * @param words 敏感词数组
   */
  addSensitiveWords(words: string[]): void {
    this.sensitiveWords.push(...words);
    this.buildRegex();
  }

  /**
   * 移除敏感词
   * @param words 要移除的敏感词数组
   */
  removeSensitiveWords(words: string[]): void {
    this.sensitiveWords = this.sensitiveWords.filter((w) => !words.includes(w));
    this.buildRegex();
  }
}
