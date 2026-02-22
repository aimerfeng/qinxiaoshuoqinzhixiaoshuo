-- CreateEnum
CREATE TYPE "DanmakuType" AS ENUM ('SCROLL', 'TOP', 'BOTTOM');

-- CreateTable
CREATE TABLE "manga_pages" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "order_index" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "file_size" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manga_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "danmaku" (
    "id" TEXT NOT NULL,
    "anchor_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" VARCHAR(100) NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#FFFFFF',
    "type" "DanmakuType" NOT NULL DEFAULT 'SCROLL',
    "font_size" INTEGER NOT NULL DEFAULT 24,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "danmaku_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manga_pages_chapter_id_idx" ON "manga_pages"("chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "manga_pages_chapter_id_order_index_key" ON "manga_pages"("chapter_id", "order_index");

-- CreateIndex
CREATE INDEX "danmaku_anchor_id_idx" ON "danmaku"("anchor_id");

-- CreateIndex
CREATE INDEX "danmaku_author_id_idx" ON "danmaku"("author_id");

-- AddForeignKey
ALTER TABLE "manga_pages" ADD CONSTRAINT "manga_pages_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danmaku" ADD CONSTRAINT "danmaku_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
