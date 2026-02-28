CREATE TYPE "transaction_status" AS ENUM ('POSTED', 'PLANNED');

ALTER TABLE "transactions"
ADD COLUMN "status" "transaction_status" NOT NULL DEFAULT 'POSTED';

UPDATE "transactions"
SET "status" = 'PLANNED'
WHERE "entry_type" IN ('RECURRING', 'INSTALLMENT')
  AND "date" > NOW();
