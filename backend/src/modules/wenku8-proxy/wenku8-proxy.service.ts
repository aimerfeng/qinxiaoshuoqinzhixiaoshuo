import { Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const xml2js = require('xml2js') as {
  parseStringPromise: (xml: string) => Promise<unknown>;
};
import { CacheService } from '../../redis/cache.service.js';
import {
  NovelSearchResult,
  NovelInfo,
  NovelVolume,
  ChapterContent,
  NovelListResult,
} from './dto/index.js';

// 索引项接口
interface MojimoonIndexItem {
  id: string;
  title: string;
  author: string;
  volumeCount: number;
  downloadCode: string;
}

// EPUB 解析后的章节数据
interface ParsedEpubData {
  volumes: NovelVolume[];
  chapters: Map<string, { title: string; content: string }>;
}

// 缓存用的章节数据格式
interface CachedEpubData {
  volumes: NovelVolume[];
  chapters: Record<string, { title: string; content: string }>;
}

@Injectable()
export class Wenku8ProxyService {
  private readonly logger = new Logger(Wenku8ProxyService.name);

  private readonly MOJIMOON_INDEX_URL =
    'https://mojimoon.github.io/wenku8/index.html';
  private readonly MOJIMOON_EPUB_BASE =
    'https://mojimoon.github.io/wenku8/epub/';

  private readonly CACHE_TTL = {
    SEARCH: 600,
    NOVEL_INFO: 3600,
    CHAPTER: 86400,
    LIST: 600,
    INDEX: 3600,
    EPUB: 86400,
  };

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 获取 mojimoon/wenku8 索引
   */
  private async fetchMojimoonIndex(): Promise<MojimoonIndexItem[]> {
    const cacheKey = 'wenku8:mojimoon:index';

    const cached = await this.cacheService.get<MojimoonIndexItem[]>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for mojimoon index');
      return cached;
    }

    this.logger.debug(
      `Fetching mojimoon index from ${this.MOJIMOON_INDEX_URL}`,
    );

    const response = await fetch(this.MOJIMOON_INDEX_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch index: ${response.status}`);
    }

    const html = await response.text();
    const items = this.parseMojimoonIndex(html);

    await this.cacheService.set(cacheKey, items, this.CACHE_TTL.INDEX);

    return items;
  }

  /**
   * 解析 mojimoon 索引 HTML
   * 格式: 标题作者(卷数) 版本类型下载码[下载 镜像]日期
   * 例如: 义妹生活三河ごーすと(15) 网译gqwn下载 镜像2026-02-20
   */
  private parseMojimoonIndex(html: string): MojimoonIndexItem[] {
    const items: MojimoonIndexItem[] = [];

    // 移除 HTML 标签，只保留文本内容
    const text = html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    // 按行分割
    const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

    // 正则匹配每行数据
    // 格式: 标题作者(卷数) 版本类型下载码[下载 镜像]日期
    const linePattern = /^(.+?)\(([^)]+)\)\s*(台版|网译|短篇|旧作)([a-z0-9]{4})(?:下载\s*镜像)?(\d{4}-\d{2}-\d{2})$/i;

    let idCounter = 1;
    for (const line of lines) {
      // 跳过标题行
      if (line.includes('书名作者') || line.includes('版本类型') || line.includes('EPUB')) {
        continue;
      }

      const match = line.match(linePattern);
      if (match) {
        const [, titleAuthor, volumeInfo, _versionType, downloadCode, _date] = match;

        // 尝试分离标题和作者
        // 作者通常是日文名（含假名）或中文名，在标题末尾
        // 常见模式：标题 + 作者名
        let title = titleAuthor.trim();
        let author = '未知作者';

        // 尝试匹配常见的作者名模式
        // 日文作者名通常包含平假名/片假名
        const authorPatterns = [
          /^(.+?)([ぁ-んァ-ヶー一-龯a-zA-Z]+(?:[・\s][ぁ-んァ-ヶー一-龯a-zA-Z]+)*)$/,
          /^(.+?)([\u4e00-\u9fff]{2,4})$/,
        ];

        for (const pattern of authorPatterns) {
          const authorMatch = titleAuthor.match(pattern);
          if (authorMatch && authorMatch[2].length >= 2 && authorMatch[2].length <= 20) {
            // 验证分离结果合理性
            const potentialTitle = authorMatch[1].trim();
            const potentialAuthor = authorMatch[2].trim();
            if (potentialTitle.length > 0 && potentialAuthor.length >= 2) {
              title = potentialTitle;
              author = potentialAuthor;
              break;
            }
          }
        }

        // 解析卷数
        let volumeCount = 1;
        const volMatch = volumeInfo.match(/(\d+)/);
        if (volMatch) {
          volumeCount = parseInt(volMatch[1], 10);
        }

        items.push({
          id: String(idCounter++),
          title: this.decodeHtmlEntities(title),
          author: this.decodeHtmlEntities(author),
          volumeCount,
          downloadCode: downloadCode.toLowerCase(),
        });
      }
    }

    this.logger.debug(`Parsed ${items.length} items from mojimoon index`);
    return items;
  }

  /**
   * 下载并解析 EPUB 文件
   */
  private async downloadAndParseEpub(
    novelId: string,
    downloadCode: string,
  ): Promise<ParsedEpubData> {
    const cacheKey = `wenku8:epub:${novelId}`;

    const cached = await this.cacheService.get<CachedEpubData>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for epub: ${novelId}`);
      return {
        volumes: cached.volumes,
        chapters: new Map(Object.entries(cached.chapters)),
      };
    }

    const epubUrl = `${this.MOJIMOON_EPUB_BASE}${downloadCode}.epub`;
    this.logger.debug(`Downloading EPUB from ${epubUrl}`);

    const response = await fetch(epubUrl);
    if (!response.ok) {
      throw new Error(`Failed to download EPUB: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const zip = new AdmZip(Buffer.from(buffer));

    // 解析 content.opf 获取章节顺序
    const opfEntry = zip
      .getEntries()
      .find((e: AdmZip.IZipEntry) => e.entryName.endsWith('.opf'));
    if (!opfEntry) {
      throw new Error('Invalid EPUB: content.opf not found');
    }

    const opfContent = opfEntry.getData().toString('utf8');
    const opfData = (await xml2js.parseStringPromise(opfContent)) as {
      package?: {
        spine?: Array<{ itemref?: Array<{ $?: { idref?: string } }> }>;
        manifest?: Array<{
          item?: Array<{ $?: { id?: string; href?: string } }>;
        }>;
      };
    };

    // 获取 spine 中的章节顺序
    const spine = opfData.package?.spine?.[0]?.itemref || [];
    const manifest = opfData.package?.manifest?.[0]?.item || [];

    // 构建 id -> href 映射
    const idToHref = new Map<string, string>();
    for (const item of manifest) {
      const id = item.$?.id;
      const href = item.$?.href;
      if (id && href) {
        idToHref.set(id, href);
      }
    }

    // 按 spine 顺序获取章节
    const chapterOrder: string[] = [];
    for (const ref of spine) {
      const idref = ref.$?.idref;
      if (idref && idToHref.has(idref)) {
        chapterOrder.push(idToHref.get(idref)!);
      }
    }

    // 解析各章节内容
    const volumes: NovelVolume[] = [];
    const chapters = new Map<string, { title: string; content: string }>();
    let currentVolume: NovelVolume = { name: '正文', chapters: [] };

    for (const href of chapterOrder) {
      const entry = zip
        .getEntries()
        .find((e: AdmZip.IZipEntry) => e.entryName.endsWith(href));
      if (!entry) continue;

      const html = entry.getData().toString('utf8');
      const { title, content, isVolume } = this.parseChapterHtml(html);

      const chapterId = href.replace(/\.x?html?$/i, '');

      if (isVolume) {
        if (currentVolume.chapters.length > 0) {
          volumes.push(currentVolume);
        }
        currentVolume = { name: title, chapters: [] };
      } else if (content.length > 0) {
        currentVolume.chapters.push({ id: chapterId, title });
        chapters.set(chapterId, { title, content });
      }
    }

    if (currentVolume.chapters.length > 0) {
      volumes.push(currentVolume);
    }

    if (volumes.length === 0 && chapters.size > 0) {
      const defaultVolume: NovelVolume = { name: '正文', chapters: [] };
      for (const [id, data] of chapters) {
        defaultVolume.chapters.push({ id, title: data.title });
      }
      volumes.push(defaultVolume);
    }

    const result: ParsedEpubData = { volumes, chapters };

    const cacheData: CachedEpubData = {
      volumes,
      chapters: Object.fromEntries(chapters),
    };
    await this.cacheService.set(cacheKey, cacheData, this.CACHE_TTL.EPUB);

    return result;
  }

  /**
   * 解析章节 HTML
   */
  private parseChapterHtml(html: string): {
    title: string;
    content: string;
    isVolume: boolean;
  } {
    const titleMatch =
      html.match(/<title>([^<]+)<\/title>/i) ||
      html.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i);
    const title = titleMatch
      ? this.decodeHtmlEntities(titleMatch[1].trim())
      : '未知章节';

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : html;

    let content = bodyContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    content = this.decodeHtmlEntities(content);

    const isVolume = content.length < 100 && /第.+卷|卷.+|Volume/i.test(title);

    return { title, content, isVolume };
  }

  /**
   * 搜索小说
   */
  async searchNovels(keyword: string): Promise<NovelSearchResult[]> {
    const cacheKey = `wenku8:search:${keyword}`;

    const cached = await this.cacheService.get<NovelSearchResult[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for search: ${keyword}`);
      return cached;
    }

    const index = await this.fetchMojimoonIndex();
    const lowerKeyword = keyword.toLowerCase();

    const results: NovelSearchResult[] = index
      .filter(
        (item) =>
          item.title.toLowerCase().includes(lowerKeyword) ||
          item.author.toLowerCase().includes(lowerKeyword),
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        coverUrl: this.getCoverUrl(item.id),
      }));

    await this.cacheService.set(cacheKey, results, this.CACHE_TTL.SEARCH);

    return results;
  }

  /**
   * 获取小说信息
   */
  async getNovelInfo(novelId: string): Promise<NovelInfo> {
    const cacheKey = `wenku8:novel:${novelId}`;

    const cached = await this.cacheService.get<NovelInfo>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for novel info: ${novelId}`);
      return cached;
    }

    const index = await this.fetchMojimoonIndex();
    const item = index.find((i) => i.id === novelId);

    if (!item) {
      throw new Error(`Novel not found: ${novelId}`);
    }

    const epubData = await this.downloadAndParseEpub(
      novelId,
      item.downloadCode,
    );

    const novelInfo: NovelInfo = {
      id: novelId,
      title: item.title,
      author: item.author,
      description: '',
      coverUrl: this.getCoverUrl(novelId),
      status: '未知',
      lastUpdate: '',
      tags: [],
      volumes: epubData.volumes,
    };

    await this.cacheService.set(cacheKey, novelInfo, this.CACHE_TTL.NOVEL_INFO);

    return novelInfo;
  }

  /**
   * 获取章节内容
   */
  async getChapterContent(
    novelId: string,
    chapterId: string,
  ): Promise<ChapterContent> {
    const cacheKey = `wenku8:chapter:${novelId}:${chapterId}`;

    const cached = await this.cacheService.get<ChapterContent>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for chapter: ${novelId}/${chapterId}`);
      return cached;
    }

    const index = await this.fetchMojimoonIndex();
    const item = index.find((i) => i.id === novelId);

    if (!item) {
      throw new Error(`Novel not found: ${novelId}`);
    }

    const epubData = await this.downloadAndParseEpub(
      novelId,
      item.downloadCode,
    );
    const chapterData = epubData.chapters.get(chapterId);

    if (!chapterData) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const allChapterIds: string[] = [];
    for (const volume of epubData.volumes) {
      for (const chapter of volume.chapters) {
        allChapterIds.push(chapter.id);
      }
    }

    const currentIndex = allChapterIds.indexOf(chapterId);
    const prevChapterId =
      currentIndex > 0 ? allChapterIds[currentIndex - 1] : undefined;
    const nextChapterId =
      currentIndex < allChapterIds.length - 1
        ? allChapterIds[currentIndex + 1]
        : undefined;

    const content: ChapterContent = {
      novelId,
      chapterId,
      title: chapterData.title,
      content: chapterData.content,
      prevChapterId,
      nextChapterId,
    };

    await this.cacheService.set(cacheKey, content, this.CACHE_TTL.CHAPTER);

    return content;
  }

  /**
   * 获取小说列表
   */
  async getNovelList(type: string, page: number = 1): Promise<NovelListResult> {
    const cacheKey = `wenku8:list:${type}:${page}`;

    const cached = await this.cacheService.get<NovelListResult>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for list: ${type} page ${page}`);
      return cached;
    }

    const index = await this.fetchMojimoonIndex();

    const pageSize = 20;
    const totalPages = Math.ceil(index.length / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const novels = index.slice(startIndex, endIndex).map((item) => ({
      id: item.id,
      title: item.title,
      author: item.author,
      coverUrl: this.getCoverUrl(item.id),
    }));

    const result: NovelListResult = {
      novels,
      page,
      totalPages,
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL.LIST);

    return result;
  }

  /**
   * 生成封面图片 URL
   * wenku8.net 封面 URL 格式: https://img.wenku8.com/image/{floor}/{novelId}/{novelId}s.jpg
   */
  private getCoverUrl(novelId: string): string {
    const id = parseInt(novelId, 10);
    const floor = Math.floor(id / 1000);
    return `https://img.wenku8.com/image/${floor}/${novelId}/${novelId}s.jpg`;
  }

  /**
   * 解码 HTML 实体
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_: string, code: string) =>
        String.fromCharCode(parseInt(code, 10)),
      )
      .replace(/&#x([0-9a-fA-F]+);/g, (_: string, code: string) =>
        String.fromCharCode(parseInt(code, 16)),
      );
  }
}
