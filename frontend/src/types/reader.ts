/**
 * 阅读器相关类型定义
 *
 * 需求4: 沉浸式阅读器
 */

// ==================== 章节内容类型 ====================

/** 段落数据 */
export interface Paragraph {
  id: string;
  anchorId: string;
  content: string;
  orderIndex: number;
  quoteCount: number;
}

/** 漫画页面数据 */
export interface MangaPage {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  orderIndex: number;
  width: number | null;
  height: number | null;
}

/** 章节简要信息 */
export interface ChapterBrief {
  id: string;
  title: string;
  orderIndex: number;
  wordCount?: number;
  status?: string;
  publishedAt?: string | null;
}

/** 作品简要信息 */
export interface WorkBrief {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  contentType: 'NOVEL' | 'MANGA';
  readingDirection?: 'LTR' | 'RTL';
}

/** 阅读进度 */
export interface ReadingProgress {
  paragraphIndex: number;
  scrollPosition: number | null;
  readPercentage: number;
  lastReadAt: Date;
}

/** 章节内容响应 */
export interface ChapterContentResponse {
  message: string;
  chapter: {
    id: string;
    workId: string;
    title: string;
    orderIndex: number;
    wordCount: number;
    viewCount: number;
    status: string;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  work: WorkBrief;
  content?: string;
  paragraphs?: Paragraph[];
  pages?: MangaPage[];
  readingProgress: ReadingProgress | null;
  prevChapter: ChapterBrief | null;
  nextChapter: ChapterBrief | null;
}

/** 章节目录响应 */
export interface ChapterListResponse {
  message: string;
  workId: string;
  workTitle: string;
  contentType: string;
  chapters: ChapterBrief[];
  totalChapters: number;
}

/** 相邻章节响应 */
export interface AdjacentChaptersResponse {
  message: string;
  currentChapter: ChapterBrief;
  prevChapter: ChapterBrief | null;
  nextChapter: ChapterBrief | null;
  totalChapters: number;
  currentPosition: number;
}

// ==================== 阅读设置类型 ====================

/** 字体系列 */
export type FontFamily = 'sans' | 'serif' | 'display';

/** 背景颜色预设 */
export type BackgroundPreset = 'default' | 'sepia' | 'dark' | 'green' | 'custom';

/** 阅读模式 */
export type ReadingMode = 'scroll' | 'page';

/** 阅读设置 */
export interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: FontFamily;
  backgroundColor: BackgroundPreset;
  customBackgroundColor?: string;
  textColor?: string;
  readingMode: ReadingMode;
  nightMode: boolean;
  showParagraphNumbers: boolean;
  paragraphSpacing: number;
  pageWidth: 'narrow' | 'medium' | 'wide' | 'full';
}

/** 阅读设置响应 */
export interface ReadingSettingsResponse {
  message: string;
  settings: {
    id: string;
    userId: string;
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    backgroundColor: string;
    textColor: string;
    pageMode: string;
    nightMode: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

// ==================== 阅读进度类型 ====================

/** 保存阅读进度请求 */
export interface SaveProgressRequest {
  chapterId: string;
  paragraphIndex: number;
  scrollPosition?: number;
  readPercentage: number;
}

/** 保存阅读进度响应 */
export interface SaveProgressResponse {
  message: string;
  progress: {
    id: string;
    userId: string;
    chapterId: string;
    paragraphIndex: number;
    scrollPosition: number | null;
    readPercentage: number;
    lastReadAt: Date;
  };
}

// ==================== 热键系统类型 ====================

/** 热键动作 */
export type HotkeyAction =
  | 'nextPage'
  | 'prevPage'
  | 'nextChapter'
  | 'prevChapter'
  | 'toggleSettings'
  | 'toggleChapterList'
  | 'toggleNightMode'
  | 'toggleFullscreen'
  | 'increaseFontSize'
  | 'decreaseFontSize'
  | 'scrollUp'
  | 'scrollDown'
  | 'goToTop'
  | 'goToBottom';

/** 热键配置 */
export interface HotkeyConfig {
  action: HotkeyAction;
  key: string;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  description: string;
}

/** 默认热键配置 */
export const DEFAULT_HOTKEYS: HotkeyConfig[] = [
  { action: 'nextPage', key: 'ArrowRight', description: '下一页' },
  { action: 'prevPage', key: 'ArrowLeft', description: '上一页' },
  { action: 'nextPage', key: 'ArrowDown', description: '下一页' },
  { action: 'prevPage', key: 'ArrowUp', description: '上一页' },
  { action: 'nextPage', key: ' ', description: '下一页（空格）' },
  { action: 'nextChapter', key: 'ArrowRight', modifiers: ['ctrl'], description: '下一章' },
  { action: 'prevChapter', key: 'ArrowLeft', modifiers: ['ctrl'], description: '上一章' },
  { action: 'toggleSettings', key: 's', description: '打开设置' },
  { action: 'toggleChapterList', key: 'c', description: '打开章节目录' },
  { action: 'toggleNightMode', key: 'n', description: '切换夜间模式' },
  { action: 'toggleFullscreen', key: 'f', description: '切换全屏' },
  { action: 'increaseFontSize', key: '=', modifiers: ['ctrl'], description: '增大字体' },
  { action: 'decreaseFontSize', key: '-', modifiers: ['ctrl'], description: '减小字体' },
  { action: 'goToTop', key: 'Home', description: '回到顶部' },
  { action: 'goToBottom', key: 'End', description: '跳到底部' },
];

// ==================== 段落操作菜单类型 ====================

/** 段落操作类型 */
export type ParagraphAction = 'quote' | 'comment' | 'danmaku' | 'copy' | 'highlight';

/** 段落操作菜单项 */
export interface ParagraphMenuItem {
  action: ParagraphAction;
  label: string;
  icon: string;
  shortcut?: string;
}

// ==================== Lightbox 类型 ====================

/** Lightbox 图片 */
export interface LightboxImage {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

/** Lightbox 状态 */
export interface LightboxState {
  isOpen: boolean;
  images: LightboxImage[];
  currentIndex: number;
}

// ==================== 漫画阅读器类型 ====================

/** 漫画阅读模式 */
export type MangaReadingMode = 'scroll' | 'single' | 'double' | 'rtl-double';

/** 漫画阅读器设置 */
export interface MangaReaderSettings {
  readingMode: MangaReadingMode;
  fitMode: 'width' | 'height' | 'contain' | 'original';
  backgroundColor: 'black' | 'white' | 'gray';
  showPageNumbers: boolean;
  preloadAhead: number;
  preloadBehind: number;
  gapBetweenPages: number;
  enableZoom: boolean;
  maxZoom: number;
}

/** 默认漫画阅读器设置 */
export const DEFAULT_MANGA_SETTINGS: MangaReaderSettings = {
  readingMode: 'scroll',
  fitMode: 'width',
  backgroundColor: 'black',
  showPageNumbers: true,
  preloadAhead: 3,
  preloadBehind: 2,
  gapBetweenPages: 0,
  enableZoom: true,
  maxZoom: 3,
};

/** 漫画页面加载状态 */
export interface MangaPageLoadState {
  pageId: string;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  progress?: number;
}

/** 漫画阅读器状态 */
export interface MangaReaderState {
  currentPageIndex: number;
  totalPages: number;
  zoom: number;
  panX: number;
  panY: number;
  isFullscreen: boolean;
  showUI: boolean;
  loadStates: Record<string, MangaPageLoadState>;
}


// ==================== 弹幕系统类型 ====================

/** 弹幕类型 */
export type DanmakuType = 'SCROLL' | 'TOP' | 'BOTTOM';

/** 弹幕数据 */
export interface Danmaku {
  id: string;
  anchorId: string;
  authorId: string;
  authorName?: string;
  content: string;
  color: string;
  type: DanmakuType;
  fontSize: number;
  likeCount: number;
  createdAt: Date | string;
}

/** 创建弹幕请求 */
export interface CreateDanmakuRequest {
  anchorId: string;
  content: string;
  color?: string;
  type?: DanmakuType;
  fontSize?: number;
}

/** 弹幕列表响应 */
export interface DanmakuListResponse {
  items: Danmaku[];
  total: number;
  anchorId: string;
}

/** 弹幕设置 */
export interface DanmakuSettings {
  enabled: boolean;
  opacity: number; // 0-1
  density: number; // 1-5, 1=稀疏, 5=密集
  fontSize: number; // 12-36
  speed: number; // 弹幕滚动速度 1-5
  showScrollDanmaku: boolean;
  showTopDanmaku: boolean;
  showBottomDanmaku: boolean;
}

/** 默认弹幕设置 */
export const DEFAULT_DANMAKU_SETTINGS: DanmakuSettings = {
  enabled: true,
  opacity: 0.8,
  density: 3,
  fontSize: 24,
  speed: 3,
  showScrollDanmaku: true,
  showTopDanmaku: true,
  showBottomDanmaku: true,
};

/** 弹幕引擎配置 */
export interface DanmakuEngineConfig {
  container: HTMLElement;
  media?: HTMLMediaElement;
  speed?: number;
  opacity?: number;
}

/** 弹幕 WebSocket 事件 */
export interface DanmakuSocketEvents {
  newDanmaku: (danmaku: Danmaku) => void;
  danmakuDeleted: (data: { anchorId: string; danmakuId: string }) => void;
}
