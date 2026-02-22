-- CreateEnum
CREATE TYPE "MemberLevel" AS ENUM ('REGULAR', 'OFFICIAL', 'SENIOR', 'HONORARY');

-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('READ_CHAPTER', 'READ_DURATION', 'COMMENT_VALID', 'COMMENT_LIKED', 'QUOTE_INTERACTED', 'PUBLISH_CHAPTER', 'WORK_FAVORITED', 'PARAGRAPH_QUOTED', 'REPORT_VALID', 'ACTIVITY_PARTICIPATE');

-- CreateEnum
CREATE TYPE "MemberApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: Add membership fields to users
ALTER TABLE "users" ADD COLUMN "member_level" "MemberLevel" NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "users" ADD COLUMN "contribution_score" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: Index for member_level on users
CREATE INDEX "users_member_level_idx" ON "users"("member_level");

-- CreateTable: contribution_records
CREATE TABLE "contribution_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "ContributionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contribution_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Indexes for contribution_records
CREATE INDEX "contribution_records_user_id_idx" ON "contribution_records"("user_id");
CREATE INDEX "contribution_records_user_id_type_idx" ON "contribution_records"("user_id", "type");
CREATE INDEX "contribution_records_created_at_idx" ON "contribution_records"("created_at");
CREATE INDEX "contribution_records_user_id_created_at_idx" ON "contribution_records"("user_id", "created_at");

-- CreateTable: member_applications
CREATE TABLE "member_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "target_level" "MemberLevel" NOT NULL,
    "current_score" INTEGER NOT NULL,
    "status" "MemberApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "reject_reason" TEXT,
    "reviewer_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Indexes for member_applications
CREATE INDEX "member_applications_user_id_idx" ON "member_applications"("user_id");
CREATE INDEX "member_applications_status_idx" ON "member_applications"("status");
CREATE INDEX "member_applications_created_at_idx" ON "member_applications"("created_at");

-- AddForeignKey: contribution_records -> users
ALTER TABLE "contribution_records" ADD CONSTRAINT "contribution_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: member_applications -> users
ALTER TABLE "member_applications" ADD CONSTRAINT "member_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
