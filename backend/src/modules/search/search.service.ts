import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import {
  SearchQueryDto,
  SearchType,
  SortBy,
  ContentTypeFilter,
  WorkStatusFilter,
  AutocompleteQueryDto,
  SearchResponse,
  WorkSearchResult,
  UserSearchResult,
  ChapterSearchResult,
  AutocompleteResponse,
  SearchHistoryItem,
} from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly POPULAR_SEARCHES_KEY = 'search:popular';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 主搜索方法 - 支持作品、用户、章节搜索
   */
  async search(
    query: SearchQueryDto,
    userId?: string,
  ): Promise<SearchResponse> {
    const {
      q,
      type = SearchType.ALL,
      sort = SortBy.RELEVANCE,
      contentType = ContentTypeFilter.ALL,
      status = WorkStatusFilter.ALL,
      tags,
      page = 1,
      pageSize = 20,
    } = query;
    const offset = (page - 1) * pageSize;

    // 记录搜索历史
    this.recordSearchHistory(q, type, userId).catch((err) =>
      this.logger.warn(`Failed to record search history: ${err}`),
    );

    // 根据搜索类型执行不同的搜索
    let works: WorkSearchResult[] = [];
    let users: UserSearchResult[] = [];
    let chapters: ChapterSearchResult[] = [];
    let total = 0;

    const searchTerm = this.normalizeSearchTerm(q);

    if (type === SearchType.ALL || type === SearchType.WORK) {
      const workResults = await this.searchWorks(searchTerm, {
        contentType,
        status,
        tags,
        sort,
        limit: pageSize,
        offset: type === SearchType.WORK ? offset : 0,
      });
      works = workResults.results;
      if (type === SearchType.WORK) {
        total = workResults.total;
      }
    }

    if (type === SearchType.ALL || type === SearchType.USER) {
      const userResults = await this.searchUsers(searchTerm, {
        limit: pageSize,
        offset: type === SearchType.USER ? offset : 0,
      });
      users = userResults.results;
      if (type === SearchType.USER) {
        total = userResults.total;
      }
    }

    if (type === SearchType.ALL || type === SearchType.CHAPTER) {
      const chapterResults = await this.searchChapters(searchTerm, {
        contentType,
        sort,
        limit: pageSize,
        offset: type === SearchType.CHAPTER ? offset : 0,
      });
      chapters = chapterResults.results;
      if (type === SearchType.CHAPTER) {
        total = chapterResults.total;
      }
    }

    // 如果是全部搜索，计算总数
    if (type === SearchType.ALL) {
      total = works.length + users.length + chapters.length;
    }

    // 获取搜索建议（当结果为空时）
    let suggestions: string[] | undefined;
    if (total === 0) {
      suggestions = await this.getSearchSuggestions(q);
    }

    // 获取分面统计
    const facets =
      type === SearchType.WORK ? await this.getFacets() : undefined;

    return {
      results: {
        works,
        users,
        chapters,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      suggestions,
      facets,
    };
  }

  /**
   * 搜索作品
   */
  private async searchWorks(
    searchTerm: string,
    options: {
      contentType?: ContentTypeFilter;
      status?: WorkStatusFilter;
      tags?: string[];
      sort?: SortBy;
      limit: number;
      offset: number;
    },
  ): Promise<{ results: WorkSearchResult[]; total: number }> {
    const { contentType, status, tags, sort, limit, offset } = options;

    // 构建 WHERE 条件
    const whereConditions: string[] = [
      'w.is_deleted = false',
      "w.status != 'DRAFT'",
    ];
    const params: (string | number | string[])[] = [];
    let paramIndex = 1;

    // 全文搜索条件
    if (searchTerm) {
      whereConditions.push(
        `w.search_vector @@ plainto_tsquery('simple', $${paramIndex})`,
      );
      params.push(searchTerm);
      paramIndex++;
    }

    // 内容类型筛选
    if (contentType && contentType !== ContentTypeFilter.ALL) {
      whereConditions.push(`w.content_type = $${paramIndex}`);
      params.push(contentType.toUpperCase());
      paramIndex++;
    }

    // 状态筛选
    if (status && status !== WorkStatusFilter.ALL) {
      const statusMap: Record<string, string> = {
        ongoing: 'PUBLISHED',
        completed: 'COMPLETED',
      };
      whereConditions.push(`w.status = $${paramIndex}`);
      params.push(statusMap[status] || status.toUpperCase());
      paramIndex++;
    }

    // 标签筛选
    if (tags && tags.length > 0) {
      whereConditions.push(`
        EXISTS (
          SELECT 1 FROM work_tags wt
          JOIN tags t ON wt.tag_id = t.id
          WHERE wt.work_id = w.id AND t.name = ANY($${paramIndex})
        )
      `);
      params.push(tags);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // 排序逻辑
    let orderBy: string;
    switch (sort) {
      case SortBy.LATEST:
        orderBy = 'w.published_at DESC NULLS LAST';
        break;
      case SortBy.POPULAR:
        orderBy = '(w.view_count + w.like_count * 2 + w.quote_count * 3) DESC';
        break;
      case SortBy.VIEWS:
        orderBy = 'w.view_count DESC';
        break;
      case SortBy.RELEVANCE:
      default:
        orderBy = searchTerm
          ? `ts_rank_cd(w.search_vector, plainto_tsquery('simple', $1)) DESC, w.view_count DESC`
          : 'w.view_count DESC';
        break;
    }

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM works w
      WHERE ${whereClause}
    `;
    const countResult = await this.prisma.$queryRawUnsafe<[{ total: bigint }]>(
      countQuery,
      ...params,
    );
    const total = Number(countResult[0]?.total || 0);

    // 查询结果
    const searchQuery = `
      SELECT 
        w.id,
        w.title,
        w.description,
        w.cover_image as "coverImage",
        w.content_type as "contentType",
        w.status,
        w.author_id as "authorId",
        u.username as "authorName",
        u.avatar as "authorAvatar",
        w.view_count as "viewCount",
        w.like_count as "likeCount",
        w.published_at as "publishedAt",
        (SELECT COUNT(*) FROM chapters c WHERE c.work_id = w.id AND c.is_deleted = false) as "chapterCount",
        COALESCE(
          (SELECT array_agg(t.name) FROM work_tags wt JOIN tags t ON wt.tag_id = t.id WHERE wt.work_id = w.id),
          ARRAY[]::text[]
        ) as tags,
        ${searchTerm ? `ts_rank_cd(w.search_vector, plainto_tsquery('simple', $1))` : '0'} as "relevanceScore"
      FROM works w
      JOIN users u ON w.author_id = u.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const results = await this.prisma.$queryRawUnsafe<WorkSearchResult[]>(
      searchQuery,
      ...params,
    );

    return {
      results: results.map((r) => ({
        ...r,
        chapterCount: Number(r.chapterCount),
        viewCount: Number(r.viewCount),
        likeCount: Number(r.likeCount),
        relevanceScore: Number(r.relevanceScore),
        tags: r.tags || [],
      })),
      total,
    };
  }

  /**
   * 搜索用户
   */
  private async searchUsers(
    searchTerm: string,
    options: { limit: number; offset: number },
  ): Promise<{ results: UserSearchResult[]; total: number }> {
    const { limit, offset } = options;

    const whereConditions: string[] = ['u.is_active = true'];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (searchTerm) {
      whereConditions.push(
        `u.search_vector @@ plainto_tsquery('simple', $${paramIndex})`,
      );
      params.push(searchTerm);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE ${whereClause}
    `;
    const countResult = await this.prisma.$queryRawUnsafe<[{ total: bigint }]>(
      countQuery,
      ...params,
    );
    const total = Number(countResult[0]?.total || 0);

    // 查询结果
    const searchQuery = `
      SELECT 
        u.id,
        u.username,
        u.display_name as "displayName",
        u.avatar,
        u.bio,
        (SELECT COUNT(*) FROM works w WHERE w.author_id = u.id AND w.is_deleted = false AND w.status != 'DRAFT') as "workCount",
        0 as "followerCount",
        ${searchTerm ? `ts_rank_cd(u.search_vector, plainto_tsquery('simple', $1))` : '0'} as "relevanceScore"
      FROM users u
      WHERE ${whereClause}
      ORDER BY ${searchTerm ? `ts_rank_cd(u.search_vector, plainto_tsquery('simple', $1)) DESC,` : ''} "workCount" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const results = await this.prisma.$queryRawUnsafe<UserSearchResult[]>(
      searchQuery,
      ...params,
    );

    return {
      results: results.map((r) => ({
        ...r,
        workCount: Number(r.workCount),
        followerCount: Number(r.followerCount),
        relevanceScore: Number(r.relevanceScore),
      })),
      total,
    };
  }

  /**
   * 搜索章节
   */
  private async searchChapters(
    searchTerm: string,
    options: {
      contentType?: ContentTypeFilter;
      sort?: SortBy;
      limit: number;
      offset: number;
    },
  ): Promise<{ results: ChapterSearchResult[]; total: number }> {
    const { contentType, sort, limit, offset } = options;

    const whereConditions: string[] = [
      'c.is_deleted = false',
      "c.status = 'PUBLISHED'",
      'w.is_deleted = false',
      "w.status != 'DRAFT'",
    ];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (searchTerm) {
      whereConditions.push(
        `c.search_vector @@ plainto_tsquery('simple', $${paramIndex})`,
      );
      params.push(searchTerm);
      paramIndex++;
    }

    if (contentType && contentType !== ContentTypeFilter.ALL) {
      whereConditions.push(`w.content_type = $${paramIndex}`);
      params.push(contentType.toUpperCase());
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // 排序逻辑
    let orderBy: string;
    switch (sort) {
      case SortBy.LATEST:
        orderBy = 'c.published_at DESC NULLS LAST';
        break;
      case SortBy.VIEWS:
        orderBy = 'c.view_count DESC';
        break;
      case SortBy.RELEVANCE:
      default:
        orderBy = searchTerm
          ? `ts_rank_cd(c.search_vector, plainto_tsquery('simple', $1)) DESC, c.view_count DESC`
          : 'c.view_count DESC';
        break;
    }

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM chapters c
      JOIN works w ON c.work_id = w.id
      WHERE ${whereClause}
    `;
    const countResult = await this.prisma.$queryRawUnsafe<[{ total: bigint }]>(
      countQuery,
      ...params,
    );
    const total = Number(countResult[0]?.total || 0);

    // 查询结果
    const searchQuery = `
      SELECT 
        c.id,
        c.title,
        LEFT(c.content, 200) as "contentPreview",
        c.work_id as "workId",
        w.title as "workTitle",
        w.cover_image as "workCoverImage",
        w.author_id as "authorId",
        u.username as "authorName",
        c.view_count as "viewCount",
        c.published_at as "publishedAt",
        ${searchTerm ? `ts_rank_cd(c.search_vector, plainto_tsquery('simple', $1))` : '0'} as "relevanceScore"
      FROM chapters c
      JOIN works w ON c.work_id = w.id
      JOIN users u ON w.author_id = u.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const results = await this.prisma.$queryRawUnsafe<ChapterSearchResult[]>(
      searchQuery,
      ...params,
    );

    return {
      results: results.map((r) => ({
        ...r,
        viewCount: Number(r.viewCount),
        relevanceScore: Number(r.relevanceScore),
      })),
      total,
    };
  }

  /**
   * 自动补全/搜索建议
   */
  async autocomplete(
    query: AutocompleteQueryDto,
  ): Promise<AutocompleteResponse> {
    const { q, limit = 5 } = query;
    const searchTerm = this.normalizeSearchTerm(q);

    if (!searchTerm || searchTerm.length < 2) {
      return { suggestions: [] };
    }

    const suggestions: AutocompleteResponse['suggestions'] = [];

    // 1. 搜索热门查询词
    const popularQueries = await this.getPopularQueries(
      searchTerm,
      Math.ceil(limit / 3),
    );
    suggestions.push(
      ...popularQueries.map((queryStr) => ({
        text: queryStr,
        type: 'query' as const,
      })),
    );

    // 2. 搜索作品标题
    const works = await this.prisma.work.findMany({
      where: {
        isDeleted: false,
        status: { not: 'DRAFT' },
        title: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        title: true,
        coverImage: true,
      },
      take: Math.ceil(limit / 3),
      orderBy: { viewCount: 'desc' },
    });

    suggestions.push(
      ...works.map((work) => ({
        text: work.title,
        type: 'work' as const,
        metadata: {
          id: work.id,
          coverImage: work.coverImage || undefined,
        },
      })),
    );

    // 3. 搜索作者名
    const authors = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { username: { contains: searchTerm, mode: 'insensitive' } },
          { displayName: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
      },
      take: Math.ceil(limit / 3),
    });

    suggestions.push(
      ...authors.map((author) => ({
        text: author.displayName || author.username,
        type: 'author' as const,
        metadata: {
          id: author.id,
          avatar: author.avatar || undefined,
        },
      })),
    );

    // 4. 搜索标签
    const tagsResult = await this.prisma.tag.findMany({
      where: {
        name: { contains: searchTerm, mode: 'insensitive' },
      },
      select: {
        name: true,
      },
      take: Math.ceil(limit / 4),
      orderBy: { usageCount: 'desc' },
    });

    suggestions.push(
      ...tagsResult.map((tag) => ({
        text: tag.name,
        type: 'tag' as const,
      })),
    );

    // 限制总数并返回
    return {
      suggestions: suggestions.slice(0, limit),
    };
  }

  /**
   * 获取用户搜索历史
   */
  async getSearchHistory(
    userId: string,
    limit: number = 10,
  ): Promise<SearchHistoryItem[]> {
    const history = await this.prisma.$queryRaw<SearchHistoryItem[]>`
      SELECT id, query, search_type as "searchType", created_at as "createdAt"
      FROM search_history
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return history;
  }

  /**
   * 删除用户搜索历史
   */
  async deleteSearchHistory(userId: string, historyId?: string): Promise<void> {
    if (historyId) {
      await this.prisma.$executeRaw`
        DELETE FROM search_history
        WHERE id = ${historyId} AND user_id = ${userId}
      `;
    } else {
      await this.prisma.$executeRaw`
        DELETE FROM search_history
        WHERE user_id = ${userId}
      `;
    }
  }

  /**
   * 获取热门搜索
   */
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    // 尝试从缓存获取
    const cached = await this.cacheService.get<string[]>(
      this.POPULAR_SEARCHES_KEY,
    );
    if (cached) {
      return cached.slice(0, limit);
    }

    // 从数据库查询最近7天的热门搜索
    const result = await this.prisma.$queryRaw<
      { query: string; count: bigint }[]
    >`
      SELECT query, COUNT(*) as count
      FROM search_history
      WHERE created_at > NOW() - INTERVAL '7 days'
        AND result_count > 0
      GROUP BY query
      HAVING COUNT(*) >= 2
      ORDER BY count DESC
      LIMIT 50
    `;

    const popularSearches = result.map((r) => r.query);

    // 缓存结果
    await this.cacheService.set(
      this.POPULAR_SEARCHES_KEY,
      popularSearches,
      3600,
    ); // 1小时

    return popularSearches.slice(0, limit);
  }

  /**
   * 记录搜索历史
   */
  private async recordSearchHistory(
    query: string,
    searchType: SearchType,
    userId?: string,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO search_history (id, user_id, query, search_type, result_count, created_at)
      VALUES (
        uuid_generate_v4(),
        ${userId || null},
        ${query.trim().toLowerCase()},
        ${searchType},
        0,
        NOW()
      )
    `;
  }

  /**
   * 获取搜索建议（当结果为空时）
   */
  private async getSearchSuggestions(query: string): Promise<string[]> {
    // 获取热门搜索作为建议
    const popularSearches = await this.getPopularSearches(5);

    // 获取相似的搜索词（如果 pg_trgm 扩展可用）
    const similarQueries = await this.prisma.$queryRaw<{ query: string }[]>`
      SELECT DISTINCT query
      FROM search_history
      WHERE query % ${query}
        AND result_count > 0
      ORDER BY similarity(query, ${query}) DESC
      LIMIT 5
    `.catch(() => []); // 如果 pg_trgm 扩展不可用，返回空数组

    const suggestions = [
      ...similarQueries.map((r) => r.query),
      ...popularSearches,
    ];

    // 去重并限制数量
    return [...new Set(suggestions)].slice(0, 5);
  }

  /**
   * 获取热门查询词（用于自动补全）
   */
  private async getPopularQueries(
    prefix: string,
    limit: number,
  ): Promise<string[]> {
    const result = await this.prisma.$queryRaw<{ query: string }[]>`
      SELECT query
      FROM search_history
      WHERE query ILIKE ${prefix + '%'}
        AND result_count > 0
      GROUP BY query
      HAVING COUNT(*) >= 2
      ORDER BY COUNT(*) DESC
      LIMIT ${limit}
    `;

    return result.map((r) => r.query);
  }

  /**
   * 获取分面统计
   */
  /**
   * 获取分面统计
   */
  private async getFacets(): Promise<SearchResponse['facets']> {
    // 内容类型统计
    const contentTypes = await this.prisma.$queryRaw<
      { name: string; count: bigint }[]
    >`
      SELECT content_type as name, COUNT(*) as count
      FROM works
      WHERE is_deleted = false
        AND status != 'DRAFT'
      GROUP BY content_type
    `.catch(() => []);

    // 标签统计
    const tagsResult = await this.prisma.$queryRaw<
      { name: string; count: bigint }[]
    >`
      SELECT t.name, COUNT(*) as count
      FROM work_tags wt
      JOIN tags t ON wt.tag_id = t.id
      JOIN works w ON wt.work_id = w.id
      WHERE w.is_deleted = false
        AND w.status != 'DRAFT'
      GROUP BY t.name
      ORDER BY count DESC
      LIMIT 20
    `.catch(() => []);

    // 状态统计
    const statuses = await this.prisma.$queryRaw<
      { name: string; count: bigint }[]
    >`
      SELECT status as name, COUNT(*) as count
      FROM works
      WHERE is_deleted = false
        AND status != 'DRAFT'
      GROUP BY status
    `.catch(() => []);

    return {
      contentTypes: contentTypes.map((c) => ({
        name: c.name,
        count: Number(c.count),
      })),
      tags: tagsResult.map((t) => ({
        name: t.name,
        count: Number(t.count),
      })),
      statuses: statuses.map((s) => ({
        name: s.name,
        count: Number(s.count),
      })),
    };
  }

  /**
   * 规范化搜索词
   */
  private normalizeSearchTerm(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ') // 保留中文、字母、数字
      .replace(/\s+/g, ' '); // 合并多个空格
  }
}
