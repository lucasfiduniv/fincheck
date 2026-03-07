ALTER TABLE "credit_card_purchases"
ADD COLUMN "fuel_fill_type" "fuel_fill_type" NOT NULL DEFAULT 'PARTIAL',
ADD COLUMN "fuel_first_pump_click" BOOLEAN NOT NULL DEFAULT false;
