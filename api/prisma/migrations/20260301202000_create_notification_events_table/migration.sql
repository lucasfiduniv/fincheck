-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('WHATSAPP');

-- CreateEnum
CREATE TYPE "notification_event_type" AS ENUM (
  'GENERAL',
  'DUE_REMINDERS',
  'CREDIT_CARD_DUE',
  'BUDGET_ALERTS',
  'LOW_BALANCE',
  'WEEKLY_SUMMARY'
);

-- CreateEnum
CREATE TYPE "notification_event_status" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "notification_events" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "notification_event_type" NOT NULL,
  "channel" "notification_channel" NOT NULL DEFAULT 'WHATSAPP',
  "status" "notification_event_status" NOT NULL DEFAULT 'PENDING',
  "idempotency_key" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "error_message" TEXT,
  "provider_response" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_events_idempotency_key_key" ON "notification_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "notification_events_user_id_created_at_idx" ON "notification_events"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "notification_events"
ADD CONSTRAINT "notification_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
