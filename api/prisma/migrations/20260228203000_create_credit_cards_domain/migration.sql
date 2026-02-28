CREATE TYPE "credit_card_purchase_type" AS ENUM ('ONE_TIME', 'INSTALLMENT');
CREATE TYPE "credit_card_installment_status" AS ENUM ('PENDING', 'PAID', 'CANCELED');

CREATE TABLE "credit_cards" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "bank_account_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "brand" TEXT,
  "color" TEXT NOT NULL,
  "credit_limit" DOUBLE PRECISION NOT NULL,
  "closing_day" INTEGER NOT NULL,
  "due_day" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credit_card_purchases" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "credit_card_id" UUID NOT NULL,
  "category_id" UUID,
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "purchase_date" TIMESTAMP(3) NOT NULL,
  "type" "credit_card_purchase_type" NOT NULL,
  "installment_count" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "credit_card_purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "credit_card_installments" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "credit_card_id" UUID NOT NULL,
  "purchase_id" UUID NOT NULL,
  "installment_number" INTEGER NOT NULL,
  "installment_count" INTEGER NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "statement_year" INTEGER NOT NULL,
  "statement_month" INTEGER NOT NULL,
  "due_date" TIMESTAMP(3) NOT NULL,
  "status" "credit_card_installment_status" NOT NULL DEFAULT 'PENDING',
  "payment_transaction_id" UUID,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "credit_card_installments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "credit_card_installments_user_id_credit_card_id_statement_year_statement_month_idx"
ON "credit_card_installments"("user_id", "credit_card_id", "statement_year", "statement_month");

CREATE INDEX "credit_card_installments_payment_transaction_id_idx"
ON "credit_card_installments"("payment_transaction_id");

ALTER TABLE "credit_cards"
ADD CONSTRAINT "credit_cards_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "credit_cards"
ADD CONSTRAINT "credit_cards_bank_account_id_fkey"
FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "credit_card_purchases"
ADD CONSTRAINT "credit_card_purchases_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "credit_card_purchases"
ADD CONSTRAINT "credit_card_purchases_credit_card_id_fkey"
FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "credit_card_purchases"
ADD CONSTRAINT "credit_card_purchases_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "credit_card_installments"
ADD CONSTRAINT "credit_card_installments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "credit_card_installments"
ADD CONSTRAINT "credit_card_installments_credit_card_id_fkey"
FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "credit_card_installments"
ADD CONSTRAINT "credit_card_installments_purchase_id_fkey"
FOREIGN KEY ("purchase_id") REFERENCES "credit_card_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "credit_card_installments"
ADD CONSTRAINT "credit_card_installments_payment_transaction_id_fkey"
FOREIGN KEY ("payment_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
