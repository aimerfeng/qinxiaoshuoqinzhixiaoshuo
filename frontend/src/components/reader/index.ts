/**
 * 阅读器组件导出
 *
 * 需求4: 沉浸式阅读器
 * 需求3: 段落锚点精准引用体系
 */

// 小说阅读器
export { NovelReader } from './NovelReader';
export { ReaderHeader } from './ReaderHeader';
export { ReaderContent } from './ReaderContent';
export { ReaderFooter } from './ReaderFooter';
export { ParagraphRenderer } from './ParagraphRenderer';
export { ParagraphMenu } from './ParagraphMenu';
export { SettingsPanel } from './SettingsPanel';
export { ChapterSidebar } from './ChapterSidebar';
export { ProgressBar, BottomProgressIndicator } from './ProgressBar';
export { PageFlip, PageContainer } from './PageFlip';
export { Lightbox, useLightbox } from './Lightbox';
export { HotkeySettings } from './HotkeySettings';

// 引用系统
export { QuoteModal } from './QuoteModal';

// 漫画阅读器
export { MangaReader } from './MangaReader';
export { MangaToolbar } from './MangaToolbar';
export { MangaScrollView } from './MangaScrollView';
export { MangaPageView } from './MangaPageView';
export { MangaZoomView, useZoomGesture } from './MangaZoomView';
export { MangaSettingsPanel } from './MangaSettingsPanel';

// 弹幕系统
export { DanmakuLayer, getDanmakuLayerAddMethod } from './DanmakuLayer';
export { DanmakuInput } from './DanmakuInput';
export { DanmakuControls } from './DanmakuControls';
export { DanmakuContainer } from './DanmakuContainer';
