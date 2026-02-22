/**
 * 锚点详情 DTO
 * 用于返回锚点（段落）的完整信息
 *
 * 需求3: 段落锚点精准引用体系（Anchor Network）
 */

/**
 * 作者信息
 */
export interface AuthorInfoDto {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 作品信息
 */
export interface WorkInfoDto {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  status: string;
  contentType: string;
}

/**
 * 章节信息
 */
export interface ChapterInfoDto {
  id: string;
  title: string;
  orderIndex: number;
  status: string;
  publishedAt: Date | null;
}

/**
 * 锚点详情响应
 */
export interface AnchorDetailDto {
  /** 段落ID */
  id: string;

  /** 锚点ID (格式: {work_id}:{chapter_id}:{paragraph_index}) */
  anchorId: string;

  /** 段落内容 */
  content: string;

  /** 段落在章节中的位置索引 */
  orderIndex: number;

  /** 被引用次数 */
  quoteCount: number;

  /** 内容是否已被删除 */
  isDeleted: boolean;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;

  /** 章节信息 */
  chapter: ChapterInfoDto;

  /** 作品信息 */
  work: WorkInfoDto;

  /** 作者信息 */
  author: AuthorInfoDto;
}
