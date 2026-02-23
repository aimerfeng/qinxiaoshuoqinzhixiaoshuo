-- CreateEnum
CREATE TYPE "LimitedEventType" AS ENUM ('FESTIVAL', 'ANNIVERSARY', 'THEME', 'FLASH');

-- CreateEnum
CREATE TYPE "LimitedEventStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "LimitedEventTaskType" AS ENUM ('READ_CHAPTERS', 'CREATE_CONTENT', 'SOCIAL_INTERACTION', 'DAILY_LOGIN', 'SHARE_CONTENT', 'COLLECT_ITEMS', 'COMPLETE_ACHIEVEMENT', 'TIP_CREATORS', 'INVITE_FRIENDS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LimitedEventRewardType" AS ENUM ('TOKENS', 'BADGE', 'TITLE', 'AVATAR_FRAME', 'THEME', 'EXPERIENCE', 'EXCLUSIVE_ITEM');

-- CreateTable
CREATE TABLE "limited_events" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(1000),
    "cover_image_url" TEXT,
    "event_type" "LimitedEventType" NOT NULL,
    "status" "LimitedEventStatus" NOT NULL DEFAULT 'UPCOMING',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limited_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limited_event_tasks" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "task_type" "LimitedEventTaskType" NOT NULL,
    "target_value" INTEGER NOT NULL,
    "reward_type" "LimitedEventRewardType" NOT NULL,
    "reward_value" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limited_event_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limited_event_milestones" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "required_progress" INTEGER NOT NULL,
    "reward_type" "LimitedEventRewardType" NOT NULL,
    "reward_value" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limited_event_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limited_event_participations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_task_count" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limited_event_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limited_event_user_task_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "current_progress" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "is_claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limited_event_user_task_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limited_event_user_milestone_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "milestone_id" TEXT NOT NULL,
    "is_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlocked_at" TIMESTAMP(3),
    "is_claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limited_event_user_milestone_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "limited_events_event_type_idx" ON "limited_events"("event_type");

-- CreateIndex
CREATE INDEX "limited_events_status_idx" ON "limited_events"("status");

-- CreateIndex
CREATE INDEX "limited_events_start_date_idx" ON "limited_events"("start_date");

-- CreateIndex
CREATE INDEX "limited_events_end_date_idx" ON "limited_events"("end_date");

-- CreateIndex
CREATE INDEX "limited_events_is_published_idx" ON "limited_events"("is_published");

-- CreateIndex
CREATE INDEX "limited_events_status_is_published_idx" ON "limited_events"("status", "is_published");

-- CreateIndex
CREATE INDEX "limited_event_tasks_event_id_idx" ON "limited_event_tasks"("event_id");

-- CreateIndex
CREATE INDEX "limited_event_tasks_task_type_idx" ON "limited_event_tasks"("task_type");

-- CreateIndex
CREATE INDEX "limited_event_tasks_sort_order_idx" ON "limited_event_tasks"("sort_order");

-- CreateIndex
CREATE INDEX "limited_event_tasks_event_id_sort_order_idx" ON "limited_event_tasks"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "limited_event_milestones_event_id_idx" ON "limited_event_milestones"("event_id");

-- CreateIndex
CREATE INDEX "limited_event_milestones_sort_order_idx" ON "limited_event_milestones"("sort_order");

-- CreateIndex
CREATE INDEX "limited_event_milestones_event_id_sort_order_idx" ON "limited_event_milestones"("event_id", "sort_order");

-- CreateIndex
CREATE INDEX "limited_event_participations_user_id_idx" ON "limited_event_participations"("user_id");

-- CreateIndex
CREATE INDEX "limited_event_participations_event_id_idx" ON "limited_event_participations"("event_id");

-- CreateIndex
CREATE INDEX "limited_event_participations_user_id_event_id_idx" ON "limited_event_participations"("user_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "limited_event_participations_user_id_event_id_key" ON "limited_event_participations"("user_id", "event_id");

-- CreateIndex
CREATE INDEX "limited_event_user_task_progress_user_id_idx" ON "limited_event_user_task_progress"("user_id");

-- CreateIndex
CREATE INDEX "limited_event_user_task_progress_event_id_idx" ON "limited_event_user_task_progress"("event_id");

-- CreateIndex
CREATE INDEX "limited_event_user_task_progress_task_id_idx" ON "limited_event_user_task_progress"("task_id");

-- CreateIndex
CREATE INDEX "limited_event_user_task_progress_user_id_event_id_idx" ON "limited_event_user_task_progress"("user_id", "event_id");

-- CreateIndex
CREATE INDEX "limited_event_user_task_progress_is_completed_idx" ON "limited_event_user_task_progress"("is_completed");

-- CreateIndex
CREATE INDEX "limited_event_user_task_progress_is_claimed_idx" ON "limited_event_user_task_progress"("is_claimed");

-- CreateIndex
CREATE UNIQUE INDEX "limited_event_user_task_progress_user_id_task_id_key" ON "limited_event_user_task_progress"("user_id", "task_id");

-- CreateIndex
CREATE INDEX "limited_event_user_milestone_progress_user_id_idx" ON "limited_event_user_milestone_progress"("user_id");

-- CreateIndex
CREATE INDEX "limited_event_user_milestone_progress_event_id_idx" ON "limited_event_user_milestone_progress"("event_id");

-- CreateIndex
CREATE INDEX "limited_event_user_milestone_progress_milestone_id_idx" ON "limited_event_user_milestone_progress"("milestone_id");

-- CreateIndex
CREATE INDEX "limited_event_user_milestone_progress_user_id_event_id_idx" ON "limited_event_user_milestone_progress"("user_id", "event_id");

-- CreateIndex
CREATE INDEX "limited_event_user_milestone_progress_is_unlocked_idx" ON "limited_event_user_milestone_progress"("is_unlocked");

-- CreateIndex
CREATE INDEX "limited_event_user_milestone_progress_is_claimed_idx" ON "limited_event_user_milestone_progress"("is_claimed");

-- CreateIndex
CREATE UNIQUE INDEX "limited_event_user_milestone_progress_user_id_milestone_id_key" ON "limited_event_user_milestone_progress"("user_id", "milestone_id");

-- AddForeignKey
ALTER TABLE "limited_event_tasks" ADD CONSTRAINT "limited_event_tasks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "limited_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limited_event_milestones" ADD CONSTRAINT "limited_event_milestones_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "limited_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limited_event_participations" ADD CONSTRAINT "limited_event_participations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "limited_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limited_event_user_task_progress" ADD CONSTRAINT "limited_event_user_task_progress_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "limited_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limited_event_user_task_progress" ADD CONSTRAINT "limited_event_user_task_progress_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "limited_event_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limited_event_user_milestone_progress" ADD CONSTRAINT "limited_event_user_milestone_progress_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "limited_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "limited_event_user_milestone_progress" ADD CONSTRAINT "limited_event_user_milestone_progress_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "limited_event_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
