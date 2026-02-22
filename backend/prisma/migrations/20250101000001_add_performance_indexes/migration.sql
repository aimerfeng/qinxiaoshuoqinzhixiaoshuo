-- 性能优化索引迁移
-- 任务 6.1.1: 创建必要索引

-- ==================== 用户相关索引 ====================
-- 用户邮箱查询优化（登录场景）
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE is_active = true;

-- 用户名查询优化
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));

-- 用户最后登录时间索引（活跃用户统计）
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC) WHERE last_login_at IS NOT NULL;

-- ==================== 作品相关索引 ====================
-- 作品列表查询优化（按状态和创建时间）
CREATE INDEX IF NOT EXISTS idx_works_status_created ON works(status, created_at DESC) WHERE is_deleted = false;

-- 作品热度排序索引
CREATE INDEX IF NOT EXISTS idx_works_view_count ON works(view_count DESC) WHERE is_deleted = false AND status = 'PUBLISHED';

-- 作品按类型筛选
CREATE INDEX IF NOT EXISTS idx_works_content_type_status ON works(content_type, status) WHERE is_deleted = false;

-- 作者作品列表
CREATE INDEX IF NOT EXISTS idx_works_author_status ON works(author_id, status, created_at DESC) WHERE is_deleted = false;

-- ==================== 章节相关索引 ====================
-- 章节列表查询（按作品和排序）
CREATE INDEX IF NOT EXISTS idx_chapters_work_order ON chapters(work_id, order_index) WHERE is_deleted = false;

-- 章节状态筛选
CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status, published_at DESC) WHERE is_deleted = false;

-- ==================== 段落相关索引 ====================
-- 段落锚点查询优化
CREATE INDEX IF NOT EXISTS idx_paragraphs_anchor ON paragraphs(anchor_id) WHERE is_deleted = false;

-- 段落章节排序
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_order ON paragraphs(chapter_id, order_index) WHERE is_deleted = false;

-- 热门引用段落
CREATE INDEX IF NOT EXISTS idx_paragraphs_quote_count ON paragraphs(quote_count DESC) WHERE is_deleted = false AND quote_count > 0;

-- ==================== 广场卡片相关索引 ====================
-- 卡片热度排序（推荐流）
CREATE INDEX IF NOT EXISTS idx_cards_hot_score ON cards(hot_score DESC, created_at DESC) WHERE is_deleted = false;

-- 卡片时间排序（最新流）
CREATE INDEX IF NOT EXISTS idx_cards_created ON cards(created_at DESC) WHERE is_deleted = false;

-- 用户卡片列表
CREATE INDEX IF NOT EXISTS idx_cards_author_created ON cards(author_id, created_at DESC) WHERE is_deleted = false;

-- ==================== 评论相关索引 ====================
-- 卡片评论列表
CREATE INDEX IF NOT EXISTS idx_comments_card_created ON comments(card_id, created_at DESC) WHERE is_deleted = false;

-- 用户评论列表
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id, created_at DESC) WHERE is_deleted = false;

-- 评论回复查询
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL AND is_deleted = false;

-- ==================== 点赞相关索引 ====================
-- 用户点赞查询
CREATE INDEX IF NOT EXISTS idx_likes_user_target ON likes(user_id, target_type, target_id);

-- 目标点赞统计
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id, created_at DESC);

-- ==================== 阅读进度相关索引 ====================
-- 用户阅读进度查询
CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON reading_progress(user_id, last_read_at DESC);

-- 章节阅读统计
CREATE INDEX IF NOT EXISTS idx_reading_progress_chapter ON reading_progress(chapter_id);

-- ==================== 通知相关索引 ====================
-- 用户未读通知
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;

-- ==================== 弹幕相关索引 ====================
-- 段落弹幕查询
CREATE INDEX IF NOT EXISTS idx_danmaku_anchor ON danmaku(anchor_id, created_at DESC) WHERE is_deleted = false;

-- 用户弹幕列表
CREATE INDEX IF NOT EXISTS idx_danmaku_author ON danmaku(author_id, created_at DESC) WHERE is_deleted = false;

-- ==================== 引用相关索引 ====================
-- 段落引用查询
CREATE INDEX IF NOT EXISTS idx_quotes_paragraph ON quotes(paragraph_id, created_at DESC);

-- 卡片引用查询
CREATE INDEX IF NOT EXISTS idx_quotes_card ON quotes(card_id);

-- ==================== 标签相关索引 ====================
-- 标签使用量排序
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);

-- 标签名称查询
CREATE INDEX IF NOT EXISTS idx_tags_name_lower ON tags(LOWER(name));

-- ==================== 漫画页面相关索引 ====================
-- 章节页面排序
CREATE INDEX IF NOT EXISTS idx_manga_pages_chapter_order ON manga_pages(chapter_id, order_index) WHERE is_deleted = false;

-- ==================== 设备指纹相关索引 ====================
-- 用户设备查询
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user ON device_fingerprints(user_id, last_seen_at DESC);

-- 指纹查询（风控用）
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_fp ON device_fingerprints(fingerprint);

-- ==================== 刷新令牌相关索引 ====================
-- 用户令牌查询
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id, expires_at DESC);

-- 过期令牌清理
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE expires_at < NOW();
