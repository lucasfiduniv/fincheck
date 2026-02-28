CREATE TABLE "category_budgets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "limit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "category_budgets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "category_budgets_user_id_category_id_month_year_key" ON "category_budgets"("user_id", "category_id", "month", "year");

ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
