import type { Transaction } from '../../generated/prisma/client.js';
import type { PaymentTransactionRow } from '../../domain/ports/payment_transaction_repository.js';
import type {
  PendingStaffTransactionRow,
  StaffTransactionRow,
} from '../../domain/ports/venue_staff_transaction_repository.js';

/** Fila Prisma de transacción con includes de staff confirm. */
export type StaffTransactionPrismaRow = {
  id: string;
  status: string;
  matchId: string | null;
  reservationId: string | null;
  confirmedAt: Date | null;
  amountBase: { toString(): string };
  feeAmount: { toString(): string };
  amountTotal: { toString(): string };
  match?: StaffTransactionRow['match'];
  reservation?: StaffTransactionRow['reservation'];
};

export function mapPrismaTransactionToPaymentRowSV(
  _row: Transaction,
): PaymentTransactionRow {
  return {
    id: _row.id,
    matchId: _row.matchId,
    reservationId: _row.reservationId,
    userId: _row.userId,
    amountBase: _row.amountBase,
    feeAmount: _row.feeAmount,
    amountTotal: _row.amountTotal,
    status: _row.status,
    paymentMethod: _row.paymentMethod,
    confirmedAt: _row.confirmedAt,
    createdAt: _row.createdAt,
  };
}

type PlayerPaymentSelectionJson = {
  type?: string;
  name?: string;
  config?: Record<string, unknown>;
  legacy?: boolean;
  reportedSettlement?: {
    amountMinor?: string;
    currencyCode?: string;
  };
};

function resolvePlayerReportedSettlementSV(_row: {
  paymentData: unknown;
}): {
  playerReportedSettlementMinor: string | null;
  playerReportedSettlementCurrency: string | null;
} {
  const DATA = _row.paymentData;
  if (DATA === null || typeof DATA !== 'object' || Array.isArray(DATA)) {
    return {
      playerReportedSettlementMinor: null,
      playerReportedSettlementCurrency: null,
    };
  }
  const REPORTED = (DATA as { playerSelection?: PlayerPaymentSelectionJson })
    .playerSelection?.reportedSettlement;
  if (REPORTED?.amountMinor === undefined) {
    return {
      playerReportedSettlementMinor: null,
      playerReportedSettlementCurrency: null,
    };
  }
  return {
    playerReportedSettlementMinor: String(REPORTED.amountMinor),
    playerReportedSettlementCurrency: REPORTED.currencyCode ?? null,
  };
}

function resolvePlayerPaymentMethodSV(_row: {
  venuePaymentMethod: { type: string; name: string; config: unknown } | null;
  paymentData: unknown;
}): {
  paymentMethodType: string | null;
  paymentMethodName: string | null;
  paymentMethodConfig: Record<string, unknown> | null;
} {
  if (_row.venuePaymentMethod !== null) {
    const CONFIG = _row.venuePaymentMethod.config;
    return {
      paymentMethodType: _row.venuePaymentMethod.type,
      paymentMethodName: _row.venuePaymentMethod.name,
      paymentMethodConfig:
        CONFIG !== null && typeof CONFIG === 'object' && !Array.isArray(CONFIG)
          ? (CONFIG as Record<string, unknown>)
          : null,
    };
  }

  const DATA = _row.paymentData;
  if (DATA !== null && typeof DATA === 'object' && !Array.isArray(DATA)) {
    const SELECTION = (DATA as { playerSelection?: PlayerPaymentSelectionJson })
      .playerSelection;
    if (SELECTION?.type !== undefined) {
      return {
        paymentMethodType: SELECTION.type,
        paymentMethodName: SELECTION.name ?? SELECTION.type,
        paymentMethodConfig: SELECTION.config ?? null,
      };
    }
  }

  return {
    paymentMethodType: null,
    paymentMethodName: null,
    paymentMethodConfig: null,
  };
}

/** Fila Prisma para listado staff de pendientes (includes). */
export type PendingTransactionPrismaRow = Transaction & {
  user: { name: string; email: string | null };
  receipts: Array<{ id: string; mimeType: string }>;
  venuePaymentMethod: { type: string; name: string; config: unknown } | null;
  match: {
    scheduledAt: Date | null;
    court: { id: string; name: string; venueId: string };
    sportId: string;
    categoryId: string;
  } | null;
  reservation: {
    scheduledAt: Date;
    durationMinutes: number;
    court: { id: string; name: string; venueId: string };
    sportId: string;
    categoryId: string;
    type: string;
  } | null;
};

function formatContextTimeSV(_date: Date): string {
  return _date.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function mapPrismaTransactionToPendingStaffRowSV(
  _row: PendingTransactionPrismaRow,
): PendingStaffTransactionRow {
  const RECEIPT = _row.receipts[0] ?? null;
  const RES = _row.reservation;
  const MATCH = _row.match;

  let courtId = '';
  let courtName = 'Cancha';
  let sportId = '';
  let categoryId = '';
  let scheduledAt = _row.createdAt;
  let durationMinutes = 90;
  let bookingType: 'MATCH' | 'DIRECT' = 'DIRECT';
  let contextLabel = 'Reserva';

  if (RES !== null) {
    courtId = RES.court.id;
    courtName = RES.court.name;
    sportId = RES.sportId;
    categoryId = RES.categoryId;
    scheduledAt = RES.scheduledAt;
    durationMinutes = RES.durationMinutes;
    bookingType = RES.type === 'MATCH' ? 'MATCH' : 'DIRECT';
    contextLabel = `${courtName} · ${formatContextTimeSV(scheduledAt)}`;
  } else if (MATCH !== null) {
    courtId = MATCH.court.id;
    courtName = MATCH.court.name;
    sportId = MATCH.sportId;
    categoryId = MATCH.categoryId;
    scheduledAt = MATCH.scheduledAt ?? _row.createdAt;
    durationMinutes = 90;
    bookingType = 'MATCH';
    contextLabel = `${courtName} · ${formatContextTimeSV(scheduledAt)}`;
  }

  const PAYMENT_METHOD = resolvePlayerPaymentMethodSV(_row);
  const REPORTED = resolvePlayerReportedSettlementSV(_row);

  return {
    id: _row.id,
    matchId: _row.matchId,
    reservationId: _row.reservationId,
    userId: _row.userId,
    amountTotal: _row.amountTotal,
    status: _row.status,
    createdAt: _row.createdAt,
    payerName: _row.user.name,
    payerEmail: _row.user.email,
    obligationAmountMinor:
      _row.obligationAmountMinor !== null
        ? _row.obligationAmountMinor.toString()
        : null,
    obligationCurrency: _row.obligationCurrency,
    pricingCurrency: _row.pricingCurrency,
    contextLabel,
    bookingType,
    courtId,
    courtName,
    sportId,
    categoryId,
    scheduledAt,
    durationMinutes,
    receiptId: RECEIPT?.id ?? null,
    receiptMimeType: RECEIPT?.mimeType ?? null,
    paymentMethodType: PAYMENT_METHOD.paymentMethodType,
    paymentMethodName: PAYMENT_METHOD.paymentMethodName,
    paymentMethodConfig: PAYMENT_METHOD.paymentMethodConfig,
    venuePaymentMethodId: _row.venuePaymentMethodId,
    playerReportedSettlementMinor: REPORTED.playerReportedSettlementMinor,
    playerReportedSettlementCurrency: REPORTED.playerReportedSettlementCurrency,
  };
}

export function mapPrismaTransactionToStaffRowSV(
  _row: StaffTransactionPrismaRow,
): StaffTransactionRow {
  return {
    id: _row.id,
    status: _row.status,
    matchId: _row.matchId,
    reservationId: _row.reservationId,
    confirmedAt: _row.confirmedAt,
    amountBase: _row.amountBase,
    feeAmount: _row.feeAmount,
    amountTotal: _row.amountTotal,
    match: _row.match,
    reservation: _row.reservation,
  };
}
