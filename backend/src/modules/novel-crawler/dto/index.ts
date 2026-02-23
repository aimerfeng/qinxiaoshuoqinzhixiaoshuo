export interface NovelSource {
  url: string;
  name: string;
  language: string;
  hasSearch: boolean;
}

export interface NovelSearchResult {
  title: string;
  url: string;
  info?: string;
}

export interface NovelInfo {
  title: string;
  author: string;
  cover?: string;
  synopsis?: string;
  chapters: ChapterInfo[];
}

export interface ChapterInfo {
  id: number;
  title: string;
  url: string;
}

export interface ChapterContent {
  title: string;
  content: string;
}

export interface CrawlJobStatus {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  outputPath?: string;
}
