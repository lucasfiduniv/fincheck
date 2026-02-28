CREATE TYPE "transaction_entry_type" AS ENUM ('SINGLE', 'RECURRING', 'INSTALLMENT');

ALTER TABLE "transactions"
ADD COLUMN "entry_type" "transaction_entry_type" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN "recurrence_group_id" UUID,
ADD COLUMN "installment_number" INTEGER,
ADD COLUMN "installment_count" INTEGER;
