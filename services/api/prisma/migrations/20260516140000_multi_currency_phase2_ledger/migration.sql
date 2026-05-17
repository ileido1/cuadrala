-- Fase 2 MCP: libro mayor de reserva + agregado BS para reporting

CREATE TYPE "LedgerEntryType" AS ENUM ('OBLIGATION', 'PAYMENT', 'FEE', 'ADJUSTMENT', 'REVERSAL');
CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

ALTER TABLE "Reservation" ADD COLUMN "paidAmountBsMinor" BIGINT;

CREATE TABLE "ReservationPaymentLedger" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "transactionId" TEXT,
    "entryType" "LedgerEntryType" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currencyCode" "CurrencyCode" NOT NULL,
    "amountBsMinor" BIGINT,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationPaymentLedger_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ReservationPaymentLedger" ADD CONSTRAINT "ReservationPaymentLedger_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReservationPaymentLedger" ADD CONSTRAINT "ReservationPaymentLedger_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ReservationPaymentLedger_reservationId_createdAt_idx" ON "ReservationPaymentLedger"("reservationId", "createdAt");
CREATE INDEX "ReservationPaymentLedger_transactionId_idx" ON "ReservationPaymentLedger"("transactionId");
