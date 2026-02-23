import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 敏感词过滤模式
 */
export enum FilterMode {
  /** 替换模式：将敏感词替换为星号 */
  REPLACE = 'replace',
  /** 阻止模式：如果包含敏感词则阻止发送 */
  BLOCK = 'block',
}

/**
 * 敏感词过滤结果
 */
export interface FilterResult {
  /** 是否包含敏感词 */
  containsSensitiveWords: boolean;
  /** 过滤后的内容（仅在替换模式下有效） */
  filteredContent: string;
  /** 检测到的敏感词列表 */
  detectedWords: string[];
  /** 原始内容 */
  originalContent: string;
}

/**
 * Trie 节点
 */
interface TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  word?: string;
}

/**
 * 敏感词过滤服务
 *
 * 需求20: 私信系统
 * - 20.1.5 敏感词过滤
 *
 * 功能：
 * - 使用 Trie 树实现高效的多模式匹配
 * - 支持中文和英文敏感词
 * - 支持通配符模式（如 f*ck）
 * - 支持替换模式和阻止模式
 * - 可配置的敏感词列表
 */
@Injectable()
export class SensitiveWordService {
  private readonly logger = new Logger(SensitiveWordService.name);
  private root: TrieNode;
  private sensitiveWords: Set<string>;
  private filterMode: FilterMode;
  private isEnabled: boolean;
  private replacementChar: string;

  constructor(private readonly configService: ConfigService) {
    this.root = this.createNode();
    this.sensitiveWords = new Set();
    this.filterMode =
      (this.configService.get<string>(
        'sensitiveWord.mode',
      ) as FilterMode) || FilterMode.REPLACE;
    this.isEnabled =
      this.configService.get<boolean>('sensitiveWord.enabled') ?? true;
    this.replacementChar =
      this.configService.get<string>('sensitiveWord.replacementChar') || '*';

    // 初始化默认敏感词列表
    this.initializeDefaultWords();
  }

  /**
   * 创建 Trie 节点
   */
  private createNode(): TrieNode {
    return {
      children: new Map(),
      isEndOfWord: false,
    };
  }

  /**
   * 初始化默认敏感词列表
   */
  private initializeDefaultWords(): void {
    const defaultWords = this.getDefaultSensitiveWords();
    defaultWords.forEach((word) => this.addWord(word));
    this.logger.log(
      `Initialized sensitive word filter with ${this.sensitiveWords.size} words`,
    );
  }

  /**
   * 获取默认敏感词列表
   * 包含常见的中英文敏感词
   */
  private getDefaultSensitiveWords(): string[] {
    return [
      // 中文敏感词示例（实际使用时应从配置或数据库加载更完整的列表）
      '傻逼',
      '操你妈',
      '草泥马',
      '妈的',
      '他妈的',
      '去死',
      '白痴',
      '智障',
      '废物',
      '垃圾',
      '滚蛋',
      '混蛋',
      '王八蛋',
      '狗屎',
      '贱人',
      '婊子',
      '骚货',
      '死全家',
      '杀你',
      '弄死你',
      // 英文敏感词示例
      'fuck',
      'shit',
      'damn',
      'bitch',
      'asshole',
      'bastard',
      'dick',
      'pussy',
      'cunt',
      'whore',
      'slut',
      'nigger',
      'faggot',
      // 变体形式
      'f*ck',
      'f**k',
      'sh*t',
      'b*tch',
      'a**hole',
      // 其他不当内容
      '自杀',
      '跳楼',
      '割腕',
      '吸毒',
      '贩毒',
      '赌博',
      '色情',
      '裸聊',
      '约炮',
    ];
  }

  /**
   * 添加敏感词到 Trie 树
   *
   * @param word 敏感词
   */
  addWord(word: string): void {
    if (!word || word.trim().length === 0) {
      return;
    }

    const normalizedWord = word.toLowerCase().trim();
    this.sensitiveWords.add(normalizedWord);

    let node = this.root;
    for (const char of normalizedWord) {
      if (!node.children.has(char)) {
        node.children.set(char, this.createNode());
      }
      node = node.children.get(char)!;
    }
    node.isEndOfWord = true;
    node.word = normalizedWord;
  }

  /**
   * 从 Trie 树中移除敏感词
   *
   * @param word 敏感词
   */
  removeWord(word: string): void {
    if (!word || word.trim().length === 0) {
      return;
    }

    const normalizedWord = word.toLowerCase().trim();
    this.sensitiveWords.delete(normalizedWord);

    // 重建 Trie 树
    this.rebuildTrie();
  }

  /**
   * 重建 Trie 树
   */
  private rebuildTrie(): void {
    this.root = this.createNode();
    this.sensitiveWords.forEach((word) => {
      let node = this.root;
      for (const char of word) {
        if (!node.children.has(char)) {
          node.children.set(char, this.createNode());
        }
        node = node.children.get(char)!;
      }
      node.isEndOfWord = true;
      node.word = word;
    });
  }

  /**
   * 过滤内容中的敏感词
   *
   * @param content 要过滤的内容
   * @returns 过滤结果
   */
  filterContent(content: string): FilterResult {
    if (!this.isEnabled || !content) {
      return {
        containsSensitiveWords: false,
        filteredContent: content,
        detectedWords: [],
        originalContent: content,
      };
    }

    const detectedWords: string[] = [];
    const normalizedContent = content.toLowerCase();
    let filteredContent = content;
    const matches: Array<{ start: number; end: number; word: string }> = [];

    // 使用 Trie 树进行多模式匹配
    for (let i = 0; i < normalizedContent.length; i++) {
      let node = this.root;
      let j = i;

      while (j < normalizedContent.length && node.children.has(normalizedContent[j])) {
        node = node.children.get(normalizedContent[j])!;
        j++;

        if (node.isEndOfWord && node.word) {
          matches.push({
            start: i,
            end: j,
            word: node.word,
          });
          if (!detectedWords.includes(node.word)) {
            detectedWords.push(node.word);
          }
        }
      }
    }

    // 如果检测到敏感词，进行替换
    if (matches.length > 0) {
      // 按位置从后向前替换，避免索引偏移
      const sortedMatches = matches.sort((a, b) => b.start - a.start);
      for (const match of sortedMatches) {
        const replacement = this.replacementChar.repeat(match.end - match.start);
        filteredContent =
          filteredContent.substring(0, match.start) +
          replacement +
          filteredContent.substring(match.end);
      }

      this.logger.debug(
        `Detected ${detectedWords.length} sensitive words: ${detectedWords.join(', ')}`,
      );
    }

    return {
      containsSensitiveWords: detectedWords.length > 0,
      filteredContent,
      detectedWords,
      originalContent: content,
    };
  }

  /**
   * 检查内容是否包含敏感词
   *
   * @param content 要检查的内容
   * @returns 是否包含敏感词
   */
  containsSensitiveWords(content: string): boolean {
    if (!this.isEnabled || !content) {
      return false;
    }

    const normalizedContent = content.toLowerCase();

    // 使用 Trie 树进行快速检测
    for (let i = 0; i < normalizedContent.length; i++) {
      let node = this.root;
      let j = i;

      while (j < normalizedContent.length && node.children.has(normalizedContent[j])) {
        node = node.children.get(normalizedContent[j])!;
        j++;

        if (node.isEndOfWord) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 获取当前敏感词列表
   *
   * @returns 敏感词列表
   */
  getSensitiveWords(): string[] {
    return Array.from(this.sensitiveWords);
  }

  /**
   * 获取当前过滤模式
   *
   * @returns 过滤模式
   */
  getFilterMode(): FilterMode {
    return this.filterMode;
  }

  /**
   * 设置过滤模式
   *
   * @param mode 过滤模式
   */
  setFilterMode(mode: FilterMode): void {
    this.filterMode = mode;
    this.logger.log(`Filter mode changed to: ${mode}`);
  }

  /**
   * 启用/禁用敏感词过滤
   *
   * @param enabled 是否启用
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.logger.log(`Sensitive word filter ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 检查敏感词过滤是否启用
   *
   * @returns 是否启用
   */
  isFilterEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 批量添加敏感词
   *
   * @param words 敏感词列表
   */
  addWords(words: string[]): void {
    words.forEach((word) => this.addWord(word));
    this.logger.log(`Added ${words.length} sensitive words`);
  }

  /**
   * 批量移除敏感词
   *
   * @param words 敏感词列表
   */
  removeWords(words: string[]): void {
    words.forEach((word) => {
      const normalizedWord = word.toLowerCase().trim();
      this.sensitiveWords.delete(normalizedWord);
    });
    this.rebuildTrie();
    this.logger.log(`Removed ${words.length} sensitive words`);
  }

  /**
   * 清空所有敏感词
   */
  clearWords(): void {
    this.sensitiveWords.clear();
    this.root = this.createNode();
    this.logger.log('Cleared all sensitive words');
  }

  /**
   * 重置为默认敏感词列表
   */
  resetToDefault(): void {
    this.clearWords();
    this.initializeDefaultWords();
    this.logger.log('Reset to default sensitive words');
  }

  /**
   * 获取敏感词数量
   *
   * @returns 敏感词数量
   */
  getWordCount(): number {
    return this.sensitiveWords.size;
  }
}
