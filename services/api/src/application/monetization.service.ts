import { Prisma } from '../generated/prisma/client.js';

import { AppError } from '../domain/errors/app_error.js';
import { computeFeeAmountSV } from '../domain/monetization/fee_calculation.js';
import { findActiveFeeRuleForScopeRepo } from '../infrastructure/repositories/fee_rule.repository.js';
import { findMatchByIdRepo, findMatchWithParticipantsRepo } from '../infrastructure/repositories/match.repository.js';
import { findReservationByIdRepo, updateReservationTotalAmountCentsRepo } from '../infrastructure/repositories/reservation.repository.js';
import { findByCountryAndCurrencySV } from '../infrastructure/repositories/exchange_rate.repository.js';
import {
  confirmTransactionManualRepo,
  createTransactionRepo,
  findPendingOrConfirmedForMatchUserRepo,
  findPendingOrConfirmedForReservationUserRepo,
  findTransactionByIdRepo,
  listTransactionsByMatchRepo,
  listTransactionsByReservationRepo,
  listTransactionsByUserRepo,
  updateReservationPaymentFromTransactionRepo,
} from '../infrastructure/repositories/transaction.repository.js';
import { findUserByIdRepo, updateUserSubscriptionRepo } from '../infrastructure/repositories/user.repository.js';

/**
 * Convierte un monto en una moneda dada a centavos de Bolívares (BS).
 * Si la moneda ya es BS, solo convierte multiplicando por 100.
 * Para otras monedas, aplica la tasa de cambio.
 */
export function convertAmountToBsSV(_amount: number, _currency: string, _rateToBs: number): number {
  if (_currency === 'BS') {
    return Math.round(_amount * 100);
  }
  return Math.round(_amount * _rateToBs * 100);
}

export type CreateMatchObligationsInput = {
  matchId: string;
  amountBasePerPerson: number;
  participantUserIds?: string[];
};

export type ObligationCreated = {
  id: string;
  userId: string;
  amountBase: string;
  feeAmount: string;
  amountTotal: string;
  status: string;
};

export type ObligationSkipped = {
  userId: string;
  reason: 'ALREADY_HAS_ACTIVE_OBLIGATION';
};

/** Genera obligaciones de cobro por participante con fee según regla activa (no custodial). */
export async function createMatchObligationsSV(
  _input: CreateMatchObligationsInput,
): Promise<{
  created: ObligationCreated[];
  skipped: ObligationSkipped[];
}> {
  if (!Number.isFinite(_input.amountBasePerPerson) || _input.amountBasePerPerson <= 0) {
    throw new AppError('MONTO_INVALIDO', 'El monto base por persona debe ser mayor que cero.', 400);
  }

  const MATCH = await findMatchWithParticipantsRepo(_input.matchId);
  if (!MATCH) {
    throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
  }

  const PARTICIPANT_IDS = new Set(MATCH.participants.map((_p) => _p.userId));
  const TARGET_IDS =
    _input.participantUserIds !== undefined
      ? _input.participantUserIds
      : [...PARTICIPANT_IDS];

  if (_input.participantUserIds !== undefined) {
    for (const _uid of _input.participantUserIds) {
      if (!PARTICIPANT_IDS.has(_uid)) {
        throw new AppError(
          'PARTICIPANTE_NO_EN_PARTIDO',
          'Uno o más usuarios no pertenecen a este partido.',
          400,
        );
      }
    }
  }

  const RULE = await findActiveFeeRuleForScopeRepo('MATCH');
  const RULE_FOR_FEE =
    RULE === null
      ? null
      : { type: RULE.type as 'FIXED' | 'PERCENTAGE', value: Number(RULE.value.toString()) };

  const AMOUNT_BASE = new Prisma.Decimal(String(_input.amountBasePerPerson));
  const AMOUNT_BASE_NUMBER = Number(AMOUNT_BASE.toString());
  const CREATED: ObligationCreated[] = [];
  const SKIPPED: ObligationSkipped[] = [];

  for (const _userId of TARGET_IDS) {
    const EXISTING = await findPendingOrConfirmedForMatchUserRepo(_input.matchId, _userId);
    if (EXISTING !== null) {
      SKIPPED.push({ userId: _userId, reason: 'ALREADY_HAS_ACTIVE_OBLIGATION' });
      continue;
    }

    const FEE_NUMBER = computeFeeAmountSV(AMOUNT_BASE_NUMBER, RULE_FOR_FEE);
    const FEE = new Prisma.Decimal(String(FEE_NUMBER));
    const TOTAL = AMOUNT_BASE.add(FEE);

    const ROW = await createTransactionRepo({
      matchId: _input.matchId,
      userId: _userId,
      amountBase: AMOUNT_BASE,
      feeAmount: FEE,
      amountTotal: TOTAL,
    });

    CREATED.push({
      id: ROW.id,
      userId: ROW.userId,
      amountBase: ROW.amountBase.toString(),
      feeAmount: ROW.feeAmount.toString(),
      amountTotal: ROW.amountTotal.toString(),
      status: ROW.status,
    });
  }

  return { created: CREATED, skipped: SKIPPED };
}

/** Confirma pago manual de una obligación pendiente. */
export async function confirmTransactionManualSV(
  _transactionId: string,
  _actorUserId: string,
  _data?: {
    venuePaymentMethodId?: string;
    referenceNumber?: string;
    paymentData?: object;
  },
): Promise<{
  id: string;
  status: string;
  confirmedAt: string;
}> {
  const TX = await findTransactionByIdRepo(_transactionId);
  if (!TX) {
    throw new AppError('TRANSACCION_NO_ENCONTRADA', 'La transacción indicada no existe.', 404);
  }
  if (TX.status !== 'PENDING') {
    throw new AppError(
      'TRANSACCION_NO_PENDIENTE',
      'Solo se pueden confirmar transacciones pendientes.',
      400,
    );
  }

  const CONFIRM_DATA: {
    venuePaymentMethodId?: string;
    referenceNumber?: string;
    paymentData?: object;
    confirmedBy: string;
  } = { confirmedBy: _actorUserId };
  if (_data?.venuePaymentMethodId) CONFIRM_DATA.venuePaymentMethodId = _data.venuePaymentMethodId;
  if (_data?.referenceNumber) CONFIRM_DATA.referenceNumber = _data.referenceNumber;
  if (_data?.paymentData) CONFIRM_DATA.paymentData = _data.paymentData;

  const UPDATED = await confirmTransactionManualRepo(_transactionId, CONFIRM_DATA);
  const CONFIRMED_AT = UPDATED.confirmedAt;
  if (CONFIRMED_AT === null) {
    throw new AppError('ESTADO_INCONSISTENTE', 'No se pudo registrar la fecha de confirmacion.', 500);
  }

  // Si la transacción es de una reserva, actualizar paidAmountCents y paymentStatus
  if (TX.reservationId !== null) {
    await updateReservationPaymentFromTransactionRepo(TX.reservationId);
  }

  return {
    id: UPDATED.id,
    status: UPDATED.status,
    confirmedAt: CONFIRMED_AT.toISOString(),
  };
}

/** Resumen agregado de obligaciones por partido. */
export async function getMatchTransactionsSummarySV(_matchId: string): Promise<{
  matchId: string;
  transactionCount: number;
  totalAmountBase: string;
  totalFeeAmount: string;
  totalAmount: string;
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
}> {
  const MATCH = await findMatchByIdRepo(_matchId);
  if (!MATCH) {
    throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
  }

  const ROWS = await listTransactionsByMatchRepo(_matchId);
  let totalBase = new Prisma.Decimal(0);
  let totalFee = new Prisma.Decimal(0);
  let totalAll = new Prisma.Decimal(0);
  let pending = 0;
  let confirmed = 0;
  let cancelled = 0;

  for (const _r of ROWS) {
    totalBase = totalBase.add(_r.amountBase);
    totalFee = totalFee.add(_r.feeAmount);
    totalAll = totalAll.add(_r.amountTotal);
    if (_r.status === 'PENDING') pending += 1;
    else if (_r.status === 'CONFIRMED') confirmed += 1;
    else if (_r.status === 'CANCELLED') cancelled += 1;
  }

  return {
    matchId: _matchId,
    transactionCount: ROWS.length,
    totalAmountBase: totalBase.toString(),
    totalFeeAmount: totalFee.toString(),
    totalAmount: totalAll.toString(),
    pendingCount: pending,
    confirmedCount: confirmed,
    cancelledCount: cancelled,
  };
}

/** Actualiza plan de suscripción del usuario (FREE / PRO). */
export async function listUserTransactionsSV(
  _userId: string,
  _limit: number,
): Promise<{
  userId: string;
  transactions: {
    id: string;
    matchId: string;
    userId: string;
    amountBase: string;
    feeAmount: string;
    amountTotal: string;
    status: string;
    paymentMethod: string;
    confirmedAt: string | null;
    createdAt: string;
  }[];
}> {
  const USER = await findUserByIdRepo(_userId);
  if (!USER) {
    throw new AppError('USUARIO_NO_ENCONTRADO', 'El usuario indicado no existe.', 404);
  }

  const ROWS = await listTransactionsByUserRepo(_userId, _limit);

  return {
    userId: _userId,
    transactions: ROWS.map((_r) => ({
      id: _r.id,
      matchId: _r.matchId ?? '',
      reservationId: _r.reservationId ?? '',
      userId: _r.userId,
      amountBase: _r.amountBase.toString(),
      feeAmount: _r.feeAmount.toString(),
      amountTotal: _r.amountTotal.toString(),
      status: _r.status,
      paymentMethod: _r.paymentMethod,
      confirmedAt: _r.confirmedAt?.toISOString() ?? null,
      createdAt: _r.createdAt.toISOString(),
    })),
  };
}

/** Genera obligaciones de cobro por participante para una reserva directa. */
export async function createReservationObligationsSV(
  _input: { reservationId: string; amountBasePerPerson: number; participantUserIds?: string[] },
): Promise<{ created: ObligationCreated[]; skipped: ObligationSkipped[] }> {
  if (!Number.isFinite(_input.amountBasePerPerson) || _input.amountBasePerPerson <= 0) {
    throw new AppError('MONTO_INVALIDO', 'El monto base por persona debe ser mayor que cero.', 400);
  }

  const RESERVATION = await findReservationByIdRepo(_input.reservationId);
  if (!RESERVATION) {
    throw new AppError('RESERVA_NO_ENCONTRADA', 'La reserva indicada no existe.', 404);
  }

  const RULE = await findActiveFeeRuleForScopeRepo('RESERVATION');
  const RULE_FOR_FEE =
    RULE === null
      ? null
      : { type: RULE.type as 'FIXED' | 'PERCENTAGE', value: Number(RULE.value.toString()) };

  const AMOUNT_BASE = new Prisma.Decimal(String(_input.amountBasePerPerson));
  const AMOUNT_BASE_NUMBER = Number(AMOUNT_BASE.toString());
  const CREATED: ObligationCreated[] = [];
  const SKIPPED: ObligationSkipped[] = [];

  const TARGET_IDS = _input.participantUserIds ?? [];

  for (const _userId of TARGET_IDS) {
    const EXISTING = await findPendingOrConfirmedForReservationUserRepo(_input.reservationId, _userId);
    if (EXISTING !== null) {
      SKIPPED.push({ userId: _userId, reason: 'ALREADY_HAS_ACTIVE_OBLIGATION' });
      continue;
    }

    const FEE_NUMBER = computeFeeAmountSV(AMOUNT_BASE_NUMBER, RULE_FOR_FEE);
    const FEE = new Prisma.Decimal(String(FEE_NUMBER));
    const TOTAL = AMOUNT_BASE.add(FEE);

    const ROW = await createTransactionRepo({
      reservationId: _input.reservationId,
      userId: _userId,
      amountBase: AMOUNT_BASE,
      feeAmount: FEE,
      amountTotal: TOTAL,
    });

    CREATED.push({
      id: ROW.id,
      userId: ROW.userId,
      amountBase: ROW.amountBase.toString(),
      feeAmount: ROW.feeAmount.toString(),
      amountTotal: ROW.amountTotal.toString(),
      status: ROW.status,
    });
  }

  // Calcular y actualizar totalAmountCents de la reserva
  if (CREATED.length > 0) {
    try {
      // Sumar todos los amountTotal de las transacciones creadas
      let sumAmountTotal = new Prisma.Decimal(0);
      for (const _c of CREATED) {
        sumAmountTotal = sumAmountTotal.add(new Prisma.Decimal(_c.amountTotal));
      }

      const DISPLAY_CURRENCY = RESERVATION.venue?.displayCurrency ?? 'BS';

      if (DISPLAY_CURRENCY === 'BS') {
        // Conversión directa a centavos
        const TOTAL_CENTS = convertAmountToBsSV(Number(sumAmountTotal.toString()), 'BS', 1);
        await updateReservationTotalAmountCentsRepo(_input.reservationId, TOTAL_CENTS);
      } else {
        // Buscar tasa de cambio para convertir a BS
        const COUNTRY_CODE = RESERVATION.venue?.addressCountry ?? 'VE';
        const RATE = await findByCountryAndCurrencySV(COUNTRY_CODE, DISPLAY_CURRENCY);
        if (RATE !== null) {
          const TOTAL_CENTS = convertAmountToBsSV(Number(sumAmountTotal.toString()), DISPLAY_CURRENCY, RATE.rateToBs);
          await updateReservationTotalAmountCentsRepo(_input.reservationId, TOTAL_CENTS);
        } else {
          // Graceful degradation: tasa no disponible — no se bloquea la creación de obligaciones
          console.warn(
            `[createReservationObligationsSV] Tasa de cambio no encontrada para ${COUNTRY_CODE}/${DISPLAY_CURRENCY}. ` +
            `totalAmountCents no será actualizado para la reserva ${_input.reservationId}.`,
          );
        }
      }
    } catch (_err) {
      // Error en actualización no debe revertir la creación de obligaciones
      console.error(
        `[createReservationObligationsSV] Error al actualizar totalAmountCents para reserva ${_input.reservationId}:`,
        _err,
      );
    }
  }

  return { created: CREATED, skipped: SKIPPED };
}

/** Resumen de pagos de una reserva directa. */
export async function getReservationPaymentSummarySV(_reservationId: string): Promise<{
  reservationId: string;
  transactionCount: number;
  totalAmountBase: string;
  totalFeeAmount: string;
  totalAmount: string;
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
}> {
  const RESERVATION = await findReservationByIdRepo(_reservationId);
  if (!RESERVATION) {
    throw new AppError('RESERVA_NO_ENCONTRADA', 'La reserva indicada no existe.', 404);
  }

  const ROWS = await listTransactionsByReservationRepo(_reservationId);
  let totalBase = new Prisma.Decimal(0);
  let totalFee = new Prisma.Decimal(0);
  let totalAll = new Prisma.Decimal(0);
  let pending = 0;
  let confirmed = 0;
  let cancelled = 0;

  for (const _r of ROWS) {
    totalBase = totalBase.add(_r.amountBase);
    totalFee = totalFee.add(_r.feeAmount);
    totalAll = totalAll.add(_r.amountTotal);
    if (_r.status === 'PENDING') pending += 1;
    else if (_r.status === 'CONFIRMED') confirmed += 1;
    else if (_r.status === 'CANCELLED') cancelled += 1;
  }

  return {
    reservationId: _reservationId,
    transactionCount: ROWS.length,
    totalAmountBase: totalBase.toString(),
    totalFeeAmount: totalFee.toString(),
    totalAmount: totalAll.toString(),
    pendingCount: pending,
    confirmedCount: confirmed,
    cancelledCount: cancelled,
  };
}

export async function updateUserSubscriptionSV(
  _userId: string,
  _subscriptionType: 'FREE' | 'PRO',
): Promise<{ userId: string; subscriptionType: string }> {
  const USER = await findUserByIdRepo(_userId);
  if (!USER) {
    throw new AppError('USUARIO_NO_ENCONTRADO', 'El usuario indicado no existe.', 404);
  }

  const UPDATED = await updateUserSubscriptionRepo(_userId, _subscriptionType);
  return {
    userId: UPDATED.id,
    subscriptionType: UPDATED.subscriptionType,
  };
}
