-- CreateTable
CREATE TABLE "vehicle_audit_logs" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "previous_value" TEXT,
  "new_value" TEXT,
  "metadata" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "vehicle_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_usage_events" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "vehicle_id" UUID,
  "event_name" TEXT NOT NULL,
  "screen" TEXT,
  "metadata" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "vehicle_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_audit_logs_user_id_vehicle_id_created_at_idx" ON "vehicle_audit_logs"("user_id", "vehicle_id", "created_at");

-- CreateIndex
CREATE INDEX "vehicle_usage_events_user_id_created_at_idx" ON "vehicle_usage_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "vehicle_usage_events_vehicle_id_created_at_idx" ON "vehicle_usage_events"("vehicle_id", "created_at");

-- AddForeignKey
ALTER TABLE "vehicle_audit_logs" ADD CONSTRAINT "vehicle_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_audit_logs" ADD CONSTRAINT "vehicle_audit_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_usage_events" ADD CONSTRAINT "vehicle_usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_usage_events" ADD CONSTRAINT "vehicle_usage_events_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
