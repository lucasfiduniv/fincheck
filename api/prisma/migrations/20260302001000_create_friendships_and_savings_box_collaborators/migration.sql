-- CreateEnum
CREATE TYPE "friendship_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "friendships" (
  "id" UUID NOT NULL,
  "requester_id" UUID NOT NULL,
  "addressee_id" UUID NOT NULL,
  "status" "friendship_status" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_box_collaborators" (
  "id" UUID NOT NULL,
  "savings_box_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "invited_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "savings_box_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "friendships_requester_id_addressee_id_key" ON "friendships"("requester_id", "addressee_id");

-- CreateIndex
CREATE INDEX "friendships_addressee_id_status_idx" ON "friendships"("addressee_id", "status");

-- CreateIndex
CREATE INDEX "friendships_requester_id_status_idx" ON "friendships"("requester_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "savings_box_collaborators_savings_box_id_user_id_key" ON "savings_box_collaborators"("savings_box_id", "user_id");

-- CreateIndex
CREATE INDEX "savings_box_collaborators_user_id_idx" ON "savings_box_collaborators"("user_id");

-- AddForeignKey
ALTER TABLE "friendships"
ADD CONSTRAINT "friendships_requester_id_fkey"
FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships"
ADD CONSTRAINT "friendships_addressee_id_fkey"
FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_box_collaborators"
ADD CONSTRAINT "savings_box_collaborators_savings_box_id_fkey"
FOREIGN KEY ("savings_box_id") REFERENCES "savings_boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_box_collaborators"
ADD CONSTRAINT "savings_box_collaborators_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_box_collaborators"
ADD CONSTRAINT "savings_box_collaborators_invited_by_user_id_fkey"
FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
