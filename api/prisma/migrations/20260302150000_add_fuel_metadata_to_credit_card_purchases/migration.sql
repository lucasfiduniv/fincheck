ALTER TABLE "credit_card_purchases"
ADD COLUMN "fuel_vehicle_id" UUID,
ADD COLUMN "fuel_odometer" DOUBLE PRECISION,
ADD COLUMN "fuel_liters" DOUBLE PRECISION,
ADD COLUMN "fuel_price_per_liter" DOUBLE PRECISION;

ALTER TABLE "credit_card_purchases"
ADD CONSTRAINT "credit_card_purchases_fuel_vehicle_id_fkey"
FOREIGN KEY ("fuel_vehicle_id") REFERENCES "vehicles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "credit_card_purchases_fuel_vehicle_id_idx"
ON "credit_card_purchases"("fuel_vehicle_id");
