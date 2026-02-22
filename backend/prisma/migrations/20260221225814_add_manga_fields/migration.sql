-- CreateEnum
CREATE TYPE "ReadingDirection" AS ENUM ('LTR', 'RTL');

-- AlterTable
ALTER TABLE "works" ADD COLUMN     "page_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reading_direction" "ReadingDirection";

-- CreateIndex
CREATE INDEX "works_contentType_idx" ON "works"("contentType");
