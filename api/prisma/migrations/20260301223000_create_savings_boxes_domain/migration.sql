-- CreateEnum
CREATE TYPE "savings_box_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "savings_box_transaction_type" AS ENUM ('DEPOSIT', 'WITHDRAW', 'YIELD', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "savings_box_yield_mode" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "savings_box_alert_type" AS ENUM ('GOAL_COMPLETED', 'GOAL_NEAR_DUE', 'LOW_PROGRESS', 'RECURRING_EXECUTED');

-- CreateEnum
CREATE TYPE "savings_box_alert_status" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "savings_boxes" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "savings_box_status" NOT NULL DEFAULT 'ACTIVE',
  "current_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "target_amount" DOUBLE PRECISION,
  "target_date" TIMESTAMP(3),
  "alert_enabled" BOOLEAN NOT NULL DEFAULT true,
  "recurrence_enabled" BOOLEAN NOT NULL DEFAULT false,
  "recurrence_day" INTEGER,
  "recurrence_amount" DOUBLE PRECISION,
  "last_recurrence_run_at" TIMESTAMP(3),
  "monthly_yield_rate" DOUBLE PRECISION,
  "yield_mode" "savings_box_yield_mode",
  "last_yield_applied_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "savings_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_box_transactions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "savings_box_id" UUID NOT NULL,
  "type" "savings_box_transaction_type" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "source_bank_account_id" UUID,
  "destination_bank_account_id" UUID,
  "is_automatic" BOOLEAN NOT NULL DEFAULT false,
  "idempotency_key" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "savings_box_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_box_alerts" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "savings_box_id" UUID NOT NULL,
  "type" "savings_box_alert_type" NOT NULL,
  "status" "savings_box_alert_status" NOT NULL DEFAULT 'PENDING',
  "message" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "error_message" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "savings_box_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "savings_boxes_user_id_status_idx" ON "savings_boxes"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "savings_box_transactions_idempotency_key_key" ON "savings_box_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "savings_box_transactions_user_id_savings_box_id_date_idx" ON "savings_box_transactions"("user_id", "savings_box_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "savings_box_alerts_idempotency_key_key" ON "savings_box_alerts"("idempotency_key");

-- CreateIndex
CREATE INDEX "savings_box_alerts_user_id_savings_box_id_created_at_idx" ON "savings_box_alerts"("user_id", "savings_box_id", "created_at");

-- AddForeignKey
ALTER TABLE "savings_boxes"
ADD CONSTRAINT "savings_boxes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_box_transactions"
ADD CONSTRAINT "savings_box_transactions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_box_transactions"
ADD CONSTRAINT "savings_box_transactions_savings_box_id_fkey"
FOREIGN KEY ("savings_box_id") REFERENCES "savings_boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_box_alerts"
ADD CONSTRAINT "savings_box_alerts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_box_alerts"
ADD CONSTRAINT "savings_box_alerts_savings_box_id_fkey"
FOREIGN KEY ("savings_box_id") REFERENCES "savings_boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
