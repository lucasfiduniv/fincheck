CREATE TABLE "due_reminders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "due_day" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION,
    "alert_days_before" INTEGER NOT NULL DEFAULT 3,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "due_reminders_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "due_reminders" ADD CONSTRAINT "due_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
