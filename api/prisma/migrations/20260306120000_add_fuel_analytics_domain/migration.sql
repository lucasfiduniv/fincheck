-- CreateEnum
CREATE TYPE "fuel_fill_type" AS ENUM ('FULL', 'PARTIAL');

-- CreateEnum
CREATE TYPE "fuel_segment_confidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "fuel_records"
ADD COLUMN "fill_type" "fuel_fill_type" NOT NULL DEFAULT 'PARTIAL',
ADD COLUMN "first_pump_click" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "fuel_trip_segments" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "start_fuel_record_id" UUID NOT NULL,
  "end_fuel_record_id" UUID NOT NULL,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3) NOT NULL,
  "start_odometer" DOUBLE PRECISION NOT NULL,
  "end_odometer" DOUBLE PRECISION NOT NULL,
  "distance_km" DOUBLE PRECISION NOT NULL,
  "liters_consumed" DOUBLE PRECISION NOT NULL,
  "total_cost" DOUBLE PRECISION NOT NULL,
  "consumption_km_per_liter" DOUBLE PRECISION NOT NULL,
  "cost_per_km" DOUBLE PRECISION NOT NULL,
  "confidence" "fuel_segment_confidence" NOT NULL DEFAULT 'MEDIUM',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fuel_trip_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_stats_snapshots" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "official_consumption_km_per_liter" DOUBLE PRECISION,
  "official_cost_per_km" DOUBLE PRECISION,
  "official_distance_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "official_liters" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "current_month_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "projected_month_cost" DOUBLE PRECISION,
  "next_refuel_in_days" DOUBLE PRECISION,
  "next_refuel_at_km" DOUBLE PRECISION,
  "last_fuel_record_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fuel_stats_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fuel_trip_segments_user_id_vehicle_id_end_date_idx"
ON "fuel_trip_segments"("user_id", "vehicle_id", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_trip_segments_user_id_vehicle_id_start_fuel_record_id_end__key"
ON "fuel_trip_segments"("user_id", "vehicle_id", "start_fuel_record_id", "end_fuel_record_id");

-- CreateIndex
CREATE INDEX "fuel_stats_snapshots_user_id_vehicle_id_year_month_idx"
ON "fuel_stats_snapshots"("user_id", "vehicle_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_stats_snapshots_user_id_vehicle_id_year_month_key"
ON "fuel_stats_snapshots"("user_id", "vehicle_id", "year", "month");

-- AddForeignKey
ALTER TABLE "fuel_trip_segments"
ADD CONSTRAINT "fuel_trip_segments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_trip_segments"
ADD CONSTRAINT "fuel_trip_segments_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_trip_segments"
ADD CONSTRAINT "fuel_trip_segments_start_fuel_record_id_fkey"
FOREIGN KEY ("start_fuel_record_id") REFERENCES "fuel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_trip_segments"
ADD CONSTRAINT "fuel_trip_segments_end_fuel_record_id_fkey"
FOREIGN KEY ("end_fuel_record_id") REFERENCES "fuel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_stats_snapshots"
ADD CONSTRAINT "fuel_stats_snapshots_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_stats_snapshots"
ADD CONSTRAINT "fuel_stats_snapshots_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_stats_snapshots"
ADD CONSTRAINT "fuel_stats_snapshots_last_fuel_record_id_fkey"
FOREIGN KEY ("last_fuel_record_id") REFERENCES "fuel_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
