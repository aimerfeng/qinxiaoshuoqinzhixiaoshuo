/**
 * 阅读列表状态
 */
export type ReadingListStatus =
  | 'WANT_TO_READ'
  | 'READING'
  | 'COMPLETED'
  | 'DROPPED'
  | 'ON_HOLD';

/**
 * 阅读列表项
 */
export interface ReadingListItem {
  id: string;
  workId: string;
  status: ReadingListStatus;
  lastReadChapterId?: string | null;
  lastReadAt?: string | null;
  hasUpdate: boolean;
  note?: string | null;
  rating?: number | null;
  createdAt: string;
  updatedAt: string;
  work?: {
    id: string;
    title: string;
    coverImage?: string | null;
    authorId: string;
    status: string;
    contentType: string;
    wordCount: number;
    author?: {
      id: string;
      username: string;
      displayName?: string | null;
    };
  };
}

/**
 * 阅读列表响应
 */
export interface ReadingListResponse {
  items: ReadingListItem[];
  total: number;
  statusCounts: Record<ReadingListStatus, number>;
}

/**
 * 阅读列表查询参数
 */
export interface ReadingListQueryParams {
  status?: ReadingListStatus;
  hasUpdate?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'lastReadAt' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 状态名称映射
 */
export const readingListStatusNames: Record<ReadingListStatus, string> = {
  WANT_TO_READ: '想读',
  READING: '在读',
  COMPLETED: '已读完',
  DROPPED: '弃坑',
  ON_HOLD: '暂停',
};

/**
 * 状态图标映射
 */
export const readingListStatusIcons: Record<ReadingListStatus, string> = {
  WANT_TO_READ: '📚',
  READING: '📖',
  COMPLETED: '✅',
  DROPPED: '🚫',
  ON_HOLD: '⏸️',
};
