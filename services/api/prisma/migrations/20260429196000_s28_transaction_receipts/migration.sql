-- CreateTable
CREATE TABLE "TransactionReceipt" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "uploaderUserId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionReceipt_transactionId_createdAt_idx" ON "TransactionReceipt"("transactionId", "createdAt");

-- CreateIndex
CREATE INDEX "TransactionReceipt_uploaderUserId_createdAt_idx" ON "TransactionReceipt"("uploaderUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "TransactionReceipt" ADD CONSTRAINT "TransactionReceipt_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionReceipt" ADD CONSTRAINT "TransactionReceipt_uploaderUserId_fkey" FOREIGN KEY ("uploaderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

