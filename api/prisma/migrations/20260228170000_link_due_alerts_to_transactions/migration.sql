ALTER TABLE "transactions"
ADD COLUMN "due_day" INTEGER,
ADD COLUMN "alert_days_before" INTEGER;

DROP TABLE IF EXISTS "due_reminders";
