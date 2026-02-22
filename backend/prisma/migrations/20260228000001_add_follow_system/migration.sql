-- CreateTable: Follow (关注系统)
-- 需求17验收标准: 关注/粉丝列表 API

CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: 唯一约束 - 每对用户只能有一条关注记录
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

-- CreateIndex: 关注者索引 - 用于查询"我关注的人"
CREATE INDEX "follows_follower_id_idx" ON "follows"("follower_id");

-- CreateIndex: 被关注者索引 - 用于查询"关注我的人"
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- AddForeignKey: 关注者外键
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: 被关注者外键
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
