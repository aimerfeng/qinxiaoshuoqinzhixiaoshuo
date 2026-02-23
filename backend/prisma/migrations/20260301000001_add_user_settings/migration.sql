-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "DirectMessagePermission" AS ENUM ('EVERYONE', 'FOLLOWERS_ONLY', 'NOBODY');

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "login_notification_enabled" BOOLEAN NOT NULL DEFAULT true,
    "profile_visibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC',
    "show_online_status" BOOLEAN NOT NULL DEFAULT true,
    "allow_direct_messages" "DirectMessagePermission" NOT NULL DEFAULT 'EVERYONE',
    "show_reading_activity" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "push_notifications" BOOLEAN NOT NULL DEFAULT true,
    "comment_notifications" BOOLEAN NOT NULL DEFAULT true,
    "like_notifications" BOOLEAN NOT NULL DEFAULT true,
    "follow_notifications" BOOLEAN NOT NULL DEFAULT true,
    "mention_notifications" BOOLEAN NOT NULL DEFAULT true,
    "update_notifications" BOOLEAN NOT NULL DEFAULT true,
    "default_font_size" INTEGER NOT NULL DEFAULT 16,
    "default_line_height" DOUBLE PRECISION NOT NULL DEFAULT 1.8,
    "default_theme" TEXT NOT NULL DEFAULT 'light',
    "auto_night_mode" BOOLEAN NOT NULL DEFAULT false,
    "night_mode_start_time" TEXT,
    "night_mode_end_time" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "accent_color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
