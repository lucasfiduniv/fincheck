ALTER TABLE "transactions"
ADD COLUMN "maintenance_vehicle_id" UUID,
ADD COLUMN "maintenance_odometer" DOUBLE PRECISION;

ALTER TABLE "credit_card_purchases"
ADD COLUMN "maintenance_vehicle_id" UUID,
ADD COLUMN "maintenance_odometer" DOUBLE PRECISION;

ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_maintenance_vehicle_id_fkey"
FOREIGN KEY ("maintenance_vehicle_id") REFERENCES "vehicles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "credit_card_purchases"
ADD CONSTRAINT "credit_card_purchases_maintenance_vehicle_id_fkey"
FOREIGN KEY ("maintenance_vehicle_id") REFERENCES "vehicles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "transactions_maintenance_vehicle_id_idx"
ON "transactions"("maintenance_vehicle_id");

CREATE INDEX "credit_card_purchases_maintenance_vehicle_id_idx"
ON "credit_card_purchases"("maintenance_vehicle_id");

CREATE TABLE "vehicle_parts" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "brand" TEXT,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "total_cost" DOUBLE PRECISION NOT NULL,
  "installed_at" TIMESTAMP(3) NOT NULL,
  "installed_odometer" DOUBLE PRECISION,
  "lifetime_km" DOUBLE PRECISION,
  "next_replacement_odometer" DOUBLE PRECISION,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vehicle_parts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "vehicle_parts"
ADD CONSTRAINT "vehicle_parts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_parts"
ADD CONSTRAINT "vehicle_parts_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "vehicle_parts_user_id_vehicle_id_installed_at_idx"
ON "vehicle_parts"("user_id", "vehicle_id", "installed_at");
