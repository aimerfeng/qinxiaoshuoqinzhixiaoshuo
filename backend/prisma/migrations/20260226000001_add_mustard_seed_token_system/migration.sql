-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DAILY_CLAIM', 'TIP_SENT', 'TIP_RECEIVED', 'REWARD', 'REFUND');

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "total_received" INTEGER NOT NULL DEFAULT 0,
    "total_sent" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_claim_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "claim_date" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_claim_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tip_records" (
    "id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "work_id" TEXT,
    "chapter_id" TEXT,
    "amount" INTEGER NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tip_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "transactions_wallet_id_idx" ON "transactions"("wallet_id");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE INDEX "transactions_reference_id_reference_type_idx" ON "transactions"("reference_id", "reference_type");

-- CreateIndex
CREATE INDEX "daily_claim_records_user_id_idx" ON "daily_claim_records"("user_id");

-- CreateIndex
CREATE INDEX "daily_claim_records_claim_date_idx" ON "daily_claim_records"("claim_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_claim_records_user_id_claim_date_key" ON "daily_claim_records"("user_id", "claim_date");

-- CreateIndex
CREATE INDEX "tip_records_from_user_id_idx" ON "tip_records"("from_user_id");

-- CreateIndex
CREATE INDEX "tip_records_to_user_id_idx" ON "tip_records"("to_user_id");

-- CreateIndex
CREATE INDEX "tip_records_work_id_idx" ON "tip_records"("work_id");

-- CreateIndex
CREATE INDEX "tip_records_chapter_id_idx" ON "tip_records"("chapter_id");

-- CreateIndex
CREATE INDEX "tip_records_created_at_idx" ON "tip_records"("created_at");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
