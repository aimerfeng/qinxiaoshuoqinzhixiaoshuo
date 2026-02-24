-- 小说库分支系统迁移
-- 添加 Library, LibraryBranch, ContentSuggestion, BranchTransaction 模型

-- ==================== 枚举类型 ====================

-- 小说库类型
CREATE TYPE "LibraryType" AS ENUM ('ORIGINAL', 'SHARED');

-- 分支类型
CREATE TYPE "BranchType" AS ENUM ('MAIN', 'DERIVATIVE', 'MANGA');

-- 改写子类型
CREATE TYPE "DerivativeType" AS ENUM ('FANFIC', 'IF_LINE', 'ADAPTATION');

-- 上传费用类型
CREATE TYPE "UploadFeeType" AS ENUM ('PER_THOUSAND_WORDS', 'PER_PAGE');

-- 修订建议类型
CREATE TYPE "SuggestionType" AS ENUM ('MODIFY', 'INSERT_BEFORE', 'INSERT_AFTER', 'ADD_IMAGE');

-- 修订建议状态
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- 分支交易类型
CREATE TYPE "BranchTransactionType" AS ENUM ('UPLOAD_FEE', 'TIP');

-- ==================== 小说库表 ====================

CREATE TABLE "libraries" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_image" TEXT,
    "library_type" "LibraryType" NOT NULL DEFAULT 'ORIGINAL',
    "owner_cut_percent" INTEGER NOT NULL DEFAULT 0,
    "upload_fee_type" "UploadFeeType" NOT NULL DEFAULT 'PER_THOUSAND_WORDS',
    "upload_fee_rate" INTEGER NOT NULL DEFAULT 0,
    "hot_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "branch_count" INTEGER NOT NULL DEFAULT 0,
    "total_tip_amount" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "libraries_pkey" PRIMARY KEY ("id")
);

-- ==================== 小说库分支表 ====================

CREATE TABLE "library_branches" (
    "id" TEXT NOT NULL,
    "library_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "branch_type" "BranchType" NOT NULL,
    "derivative_type" "DerivativeType",
    "fork_from_chapter_id" TEXT,
    "fork_from_paragraph_id" TEXT,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "tip_amount" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "hot_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_branches_pkey" PRIMARY KEY ("id")
);

-- ==================== 修订建议表 ====================

CREATE TABLE "content_suggestions" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "paragraph_id" TEXT NOT NULL,
    "suggester_id" TEXT NOT NULL,
    "suggestion_type" "SuggestionType" NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "suggested_content" TEXT,
    "image_url" TEXT,
    "reward_amount" INTEGER NOT NULL DEFAULT 0,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "card_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_suggestions_pkey" PRIMARY KEY ("id")
);

-- ==================== 分支交易表 ====================

CREATE TABLE "branch_transactions" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "transaction_type" "BranchTransactionType" NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "platform_amount" INTEGER NOT NULL,
    "owner_amount" INTEGER NOT NULL,
    "creator_amount" INTEGER NOT NULL,
    "platform_transaction_id" TEXT,
    "owner_transaction_id" TEXT,
    "creator_transaction_id" TEXT,
    "user_transaction_id" TEXT,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_transactions_pkey" PRIMARY KEY ("id")
);

-- ==================== 唯一约束 ====================

CREATE UNIQUE INDEX "libraries_work_id_key" ON "libraries"("work_id");
CREATE UNIQUE INDEX "library_branches_work_id_key" ON "library_branches"("work_id");
CREATE UNIQUE INDEX "content_suggestions_card_id_key" ON "content_suggestions"("card_id");

-- ==================== 索引 ====================

-- Library 索引
CREATE INDEX "libraries_owner_id_idx" ON "libraries"("owner_id");
CREATE INDEX "libraries_library_type_idx" ON "libraries"("library_type");
CREATE INDEX "libraries_hot_score_idx" ON "libraries"("hot_score" DESC);
CREATE INDEX "libraries_created_at_idx" ON "libraries"("created_at");

-- LibraryBranch 索引
CREATE INDEX "library_branches_library_id_idx" ON "library_branches"("library_id");
CREATE INDEX "library_branches_creator_id_idx" ON "library_branches"("creator_id");
CREATE INDEX "library_branches_branch_type_idx" ON "library_branches"("branch_type");
CREATE INDEX "library_branches_hot_score_idx" ON "library_branches"("hot_score" DESC);
CREATE INDEX "library_branches_library_id_branch_type_idx" ON "library_branches"("library_id", "branch_type");

-- ContentSuggestion 索引
CREATE INDEX "content_suggestions_branch_id_idx" ON "content_suggestions"("branch_id");
CREATE INDEX "content_suggestions_paragraph_id_idx" ON "content_suggestions"("paragraph_id");
CREATE INDEX "content_suggestions_suggester_id_idx" ON "content_suggestions"("suggester_id");
CREATE INDEX "content_suggestions_status_idx" ON "content_suggestions"("status");
CREATE INDEX "content_suggestions_branch_id_status_idx" ON "content_suggestions"("branch_id", "status");

-- BranchTransaction 索引
CREATE INDEX "branch_transactions_branch_id_idx" ON "branch_transactions"("branch_id");
CREATE INDEX "branch_transactions_user_id_idx" ON "branch_transactions"("user_id");
CREATE INDEX "branch_transactions_transaction_type_idx" ON "branch_transactions"("transaction_type");
CREATE INDEX "branch_transactions_created_at_idx" ON "branch_transactions"("created_at");

-- ==================== 外键约束 ====================

-- Library 外键
ALTER TABLE "libraries" ADD CONSTRAINT "libraries_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "libraries" ADD CONSTRAINT "libraries_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- LibraryBranch 外键
ALTER TABLE "library_branches" ADD CONSTRAINT "library_branches_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "library_branches" ADD CONSTRAINT "library_branches_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "library_branches" ADD CONSTRAINT "library_branches_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "library_branches" ADD CONSTRAINT "library_branches_fork_from_chapter_id_fkey" FOREIGN KEY ("fork_from_chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "library_branches" ADD CONSTRAINT "library_branches_fork_from_paragraph_id_fkey" FOREIGN KEY ("fork_from_paragraph_id") REFERENCES "paragraphs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ContentSuggestion 外键
ALTER TABLE "content_suggestions" ADD CONSTRAINT "content_suggestions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "library_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_suggestions" ADD CONSTRAINT "content_suggestions_paragraph_id_fkey" FOREIGN KEY ("paragraph_id") REFERENCES "paragraphs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_suggestions" ADD CONSTRAINT "content_suggestions_suggester_id_fkey" FOREIGN KEY ("suggester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_suggestions" ADD CONSTRAINT "content_suggestions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BranchTransaction 外键
ALTER TABLE "branch_transactions" ADD CONSTRAINT "branch_transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "library_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "branch_transactions" ADD CONSTRAINT "branch_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
