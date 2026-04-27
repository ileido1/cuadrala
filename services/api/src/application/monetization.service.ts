import { Prisma } from '../generated/prisma/client.js';

import { AppError } from '../domain/errors/app_error.js';
import { computeFeeAmountSV } from '../domain/monetization/fee_calculation.js';
import { findActiveFeeRuleForScopeRepo } from '../infrastructure/repositories/fee_rule.repository.js';
import { findMatchByIdRepo, findMatchWithParticipantsRepo } from '../infrastructure/repositories/match.repository.js';
import {
  confirmTransactionManualRepo,
  createTransactionRepo,
  findPendingOrConfirmedForMatchUserRepo,
  findTransactionByIdRepo,
  listTransactionsByMatchRepo,
  listTransactionsByUserRepo,
} from '../infrastructure/repositories/transaction.repository.js';
import { findUserByIdRepo, updateUserSubscriptionRepo } from '../infrastructure/repositories/user.repository.js';

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
      : { type: RULE.type as 'FIXED' | 'PERCENTAGE', value: RULE.value };

  const AMOUNT_BASE = new Prisma.Decimal(String(_input.amountBasePerPerson));
  const CREATED: ObligationCreated[] = [];
  const SKIPPED: ObligationSkipped[] = [];

  for (const _userId of TARGET_IDS) {
    const EXISTING = await findPendingOrConfirmedForMatchUserRepo(_input.matchId, _userId);
    if (EXISTING !== null) {
      SKIPPED.push({ userId: _userId, reason: 'ALREADY_HAS_ACTIVE_OBLIGATION' });
      continue;
    }

    const FEE = computeFeeAmountSV(AMOUNT_BASE, RULE_FOR_FEE);
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
export async function confirmTransactionManualSV(_transactionId: string): Promise<{
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

  const UPDATED = await confirmTransactionManualRepo(_transactionId);
  const CONFIRMED_AT = UPDATED.confirmedAt;
  if (CONFIRMED_AT === null) {
    throw new AppError('ESTADO_INCONSISTENTE', 'No se pudo registrar la fecha de confirmacion.', 500);
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
      matchId: _r.matchId,
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
