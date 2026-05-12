-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- AlterEnum
ALTER TYPE "FeeScope" ADD VALUE 'RESERVATION';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "paidAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "totalAmountCents" INTEGER;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "reservationId" TEXT,
ALTER COLUMN "matchId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Transaction_reservationId_idx" ON "Transaction"("reservationId");

-- CreateIndex
CREATE INDEX "Transaction_reservationId_status_idx" ON "Transaction"("reservationId", "status");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
