-- AlterTable: Add isAdmin field to users
ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- Create index for admin users
CREATE INDEX "users_is_admin_idx" ON "users"("is_admin");
