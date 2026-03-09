ALTER TABLE "categories"
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

WITH ranked_categories AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, type
      ORDER BY created_at ASC, id ASC
    ) - 1 AS computed_order
  FROM categories
)
UPDATE categories c
SET sort_order = r.computed_order
FROM ranked_categories r
WHERE c.id = r.id;

CREATE INDEX "categories_user_id_type_sort_order_idx"
ON "categories"("user_id", "type", "sort_order");
