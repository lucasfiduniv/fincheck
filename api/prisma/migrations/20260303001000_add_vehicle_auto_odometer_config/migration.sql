ALTER TABLE "vehicles"
ADD COLUMN "auto_odometer_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "average_daily_km" DOUBLE PRECISION,
ADD COLUMN "odometer_base_value" DOUBLE PRECISION,
ADD COLUMN "odometer_base_date" TIMESTAMP(3);
