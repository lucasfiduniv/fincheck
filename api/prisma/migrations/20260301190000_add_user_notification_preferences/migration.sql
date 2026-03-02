-- AlterTable
ALTER TABLE "users"
ADD COLUMN "notify_due_reminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notify_credit_card_due" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notify_budget_alerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notify_low_balance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "notify_weekly_summary" BOOLEAN NOT NULL DEFAULT false;
