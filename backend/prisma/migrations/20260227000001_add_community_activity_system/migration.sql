-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('READING_CHALLENGE', 'WRITING_CONTEST', 'COMMUNITY_EVENT', 'SPECIAL_EVENT');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('JOINED', 'COMPLETED', 'FAILED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('MUSTARD_SEED', 'BADGE', 'TITLE', 'EXPERIENCE');

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(30) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "cover_image" TEXT,
    "type" "ActivityType" NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "rules" JSONB,
    "rewards" JSONB,
    "max_participants" INTEGER,
    "reward_per_person" INTEGER NOT NULL DEFAULT 0,
    "total_pool" INTEGER NOT NULL DEFAULT 0,
    "locked_pool" INTEGER NOT NULL DEFAULT 0,
    "creator_id" TEXT NOT NULL,
    "reviewer_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_participations" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'JOINED',
    "progress" JSONB,
    "completed_at" TIMESTAMP(3),
    "reward_claimed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_rewards" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "participation_id" TEXT NOT NULL,
    "reward_type" "RewardType" NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "badge_id" TEXT,
    "title_id" TEXT,
    "claimed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activities_creator_id_idx" ON "activities"("creator_id");

-- CreateIndex
CREATE INDEX "activities_status_idx" ON "activities"("status");

-- CreateIndex
CREATE INDEX "activities_type_idx" ON "activities"("type");

-- CreateIndex
CREATE INDEX "activities_start_time_idx" ON "activities"("start_time");

-- CreateIndex
CREATE INDEX "activities_end_time_idx" ON "activities"("end_time");

-- CreateIndex
CREATE INDEX "activity_participations_activity_id_idx" ON "activity_participations"("activity_id");

-- CreateIndex
CREATE INDEX "activity_participations_user_id_idx" ON "activity_participations"("user_id");

-- CreateIndex
CREATE INDEX "activity_participations_status_idx" ON "activity_participations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "activity_participations_activity_id_user_id_key" ON "activity_participations"("activity_id", "user_id");

-- CreateIndex
CREATE INDEX "activity_rewards_activity_id_idx" ON "activity_rewards"("activity_id");

-- CreateIndex
CREATE INDEX "activity_rewards_user_id_idx" ON "activity_rewards"("user_id");

-- CreateIndex
CREATE INDEX "activity_rewards_participation_id_idx" ON "activity_rewards"("participation_id");

-- CreateIndex
CREATE INDEX "activity_rewards_reward_type_idx" ON "activity_rewards"("reward_type");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participations" ADD CONSTRAINT "activity_participations_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_participations" ADD CONSTRAINT "activity_participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_rewards" ADD CONSTRAINT "activity_rewards_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_rewards" ADD CONSTRAINT "activity_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_rewards" ADD CONSTRAINT "activity_rewards_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "activity_participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
