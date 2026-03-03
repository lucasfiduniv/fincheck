-- CreateEnum
CREATE TYPE "fuel_type" AS ENUM ('GASOLINE', 'ETHANOL', 'DIESEL', 'FLEX', 'ELECTRIC', 'HYBRID');

-- CreateTable
CREATE TABLE "vehicles" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "model" TEXT,
  "plate" TEXT,
  "fuel_type" "fuel_type" NOT NULL DEFAULT 'FLEX',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_records" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "transaction_id" UUID NOT NULL,
  "odometer" DOUBLE PRECISION NOT NULL,
  "liters" DOUBLE PRECISION NOT NULL,
  "price_per_liter" DOUBLE PRECISION NOT NULL,
  "total_cost" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fuel_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicles_user_id_created_at_idx" ON "vehicles"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_records_transaction_id_key" ON "fuel_records"("transaction_id");

-- CreateIndex
CREATE INDEX "fuel_records_user_id_vehicle_id_created_at_idx" ON "fuel_records"("user_id", "vehicle_id", "created_at");

-- AddForeignKey
ALTER TABLE "vehicles"
ADD CONSTRAINT "vehicles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_records"
ADD CONSTRAINT "fuel_records_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_records"
ADD CONSTRAINT "fuel_records_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_records"
ADD CONSTRAINT "fuel_records_transaction_id_fkey"
FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
