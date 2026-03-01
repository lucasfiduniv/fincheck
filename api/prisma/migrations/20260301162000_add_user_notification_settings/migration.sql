-- AlterTable
ALTER TABLE "users"
ADD COLUMN "phone_number" TEXT,
ADD COLUMN "notifications_enabled" BOOLEAN NOT NULL DEFAULT false;
