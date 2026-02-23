import { apiRequest } from '@/lib/api';

export interface Wenku8Novel {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
}

export interface Wenku8NovelInfo {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  status: string;
  lastUpdate: string;
  tags: string[];
  volumes: Wenku8Volume[];
}

export interface Wenku8Volume {
  name: string;
  chapters: Wenku8Chapter[];
}

export interface Wenku8Chapter {
  id: string;
  title: string;
}

export interface Wenku8ChapterContent {
  novelId: string;
  chapterId: string;
  title: string;
  content: string;
  prevChapterId?: string;
  nextChapterId?: string;
}

export interface Wenku8ListResult {
  novels: Wenku8Novel[];
  page: number;
  totalPages: number;
}

export const wenku8Service = {
  search: async (keyword: string): Promise<Wenku8Novel[]> => {
    return apiRequest<Wenku8Novel[]>(
      'get',
      `/wenku8/search?keyword=${encodeURIComponent(keyword)}`,
    );
  },

  getNovelInfo: async (novelId: string): Promise<Wenku8NovelInfo> => {
    return apiRequest<Wenku8NovelInfo>('get', `/wenku8/novel/${novelId}`);
  },

  getChapterContent: async (
    novelId: string,
    chapterId: string,
  ): Promise<Wenku8ChapterContent> => {
    return apiRequest<Wenku8ChapterContent>(
      'get',
      `/wenku8/novel/${novelId}/chapter/${chapterId}`,
    );
  },

  getNovelList: async (
    type: string,
    page: number = 1,
  ): Promise<Wenku8ListResult> => {
    return apiRequest<Wenku8ListResult>(
      'get',
      `/wenku8/list/${type}?page=${page}`,
    );
  },
};
