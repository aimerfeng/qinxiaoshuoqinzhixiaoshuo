-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "ContentEmbeddingType" AS ENUM ('WORK', 'CHAPTER', 'PARAGRAPH', 'CARD');

-- CreateEnum
CREATE TYPE "UserInterestType" AS ENUM ('SHORT_TERM', 'LONG_TERM', 'EXPLICIT');

-- CreateTable
CREATE TABLE "content_embeddings" (
    "id" TEXT NOT NULL,
    "content_type" "ContentEmbeddingType" NOT NULL,
    "content_id" TEXT NOT NULL,
    "embedding" vector(768),
    "text_preview" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interest_embeddings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "interest_type" "UserInterestType" NOT NULL,
    "embedding" vector(768),
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_interest_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_embeddings_content_type_idx" ON "content_embeddings"("content_type");

-- CreateIndex
CREATE UNIQUE INDEX "content_embeddings_content_type_content_id_key" ON "content_embeddings"("content_type", "content_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_interest_embeddings_user_id_interest_type_key" ON "user_interest_embeddings"("user_id", "interest_type");
