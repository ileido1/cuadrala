"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMatchObligationsSV = createMatchObligationsSV;
exports.confirmTransactionManualSV = confirmTransactionManualSV;
exports.getMatchTransactionsSummarySV = getMatchTransactionsSummarySV;
exports.listUserTransactionsSV = listUserTransactionsSV;
exports.updateUserSubscriptionSV = updateUserSubscriptionSV;
const client_js_1 = require("../generated/prisma/client.js");
const app_error_js_1 = require("../domain/errors/app_error.js");
const fee_calculation_js_1 = require("../domain/monetization/fee_calculation.js");
const fee_rule_repository_js_1 = require("../infrastructure/repositories/fee_rule.repository.js");
const match_repository_js_1 = require("../infrastructure/repositories/match.repository.js");
const transaction_repository_js_1 = require("../infrastructure/repositories/transaction.repository.js");
const user_repository_js_1 = require("../infrastructure/repositories/user.repository.js");
/** Genera obligaciones de cobro por participante con fee según regla activa (no custodial). */
async function createMatchObligationsSV(_input) {
    if (!Number.isFinite(_input.amountBasePerPerson) || _input.amountBasePerPerson <= 0) {
        throw new app_error_js_1.AppError('MONTO_INVALIDO', 'El monto base por persona debe ser mayor que cero.', 400);
    }
    const MATCH = await (0, match_repository_js_1.findMatchWithParticipantsRepo)(_input.matchId);
    if (!MATCH) {
        throw new app_error_js_1.AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }
    const PARTICIPANT_IDS = new Set(MATCH.participants.map((_p) => _p.userId));
    const TARGET_IDS = _input.participantUserIds !== undefined
        ? _input.participantUserIds
        : [...PARTICIPANT_IDS];
    if (_input.participantUserIds !== undefined) {
        for (const _uid of _input.participantUserIds) {
            if (!PARTICIPANT_IDS.has(_uid)) {
                throw new app_error_js_1.AppError('PARTICIPANTE_NO_EN_PARTIDO', 'Uno o más usuarios no pertenecen a este partido.', 400);
            }
        }
    }
    const RULE = await (0, fee_rule_repository_js_1.findActiveFeeRuleForScopeRepo)('MATCH');
    const RULE_FOR_FEE = RULE === null
        ? null
        : { type: RULE.type, value: RULE.value };
    const AMOUNT_BASE = new client_js_1.Prisma.Decimal(String(_input.amountBasePerPerson));
    const CREATED = [];
    const SKIPPED = [];
    for (const _userId of TARGET_IDS) {
        const EXISTING = await (0, transaction_repository_js_1.findPendingOrConfirmedForMatchUserRepo)(_input.matchId, _userId);
        if (EXISTING !== null) {
            SKIPPED.push({ userId: _userId, reason: 'ALREADY_HAS_ACTIVE_OBLIGATION' });
            continue;
        }
        const FEE = (0, fee_calculation_js_1.computeFeeAmountSV)(AMOUNT_BASE, RULE_FOR_FEE);
        const TOTAL = AMOUNT_BASE.add(FEE);
        const ROW = await (0, transaction_repository_js_1.createTransactionRepo)({
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
async function confirmTransactionManualSV(_transactionId) {
    const TX = await (0, transaction_repository_js_1.findTransactionByIdRepo)(_transactionId);
    if (!TX) {
        throw new app_error_js_1.AppError('TRANSACCION_NO_ENCONTRADA', 'La transacción indicada no existe.', 404);
    }
    if (TX.status !== 'PENDING') {
        throw new app_error_js_1.AppError('TRANSACCION_NO_PENDIENTE', 'Solo se pueden confirmar transacciones pendientes.', 400);
    }
    const UPDATED = await (0, transaction_repository_js_1.confirmTransactionManualRepo)(_transactionId);
    const CONFIRMED_AT = UPDATED.confirmedAt;
    if (CONFIRMED_AT === null) {
        throw new app_error_js_1.AppError('ESTADO_INCONSISTENTE', 'No se pudo registrar la fecha de confirmacion.', 500);
    }
    return {
        id: UPDATED.id,
        status: UPDATED.status,
        confirmedAt: CONFIRMED_AT.toISOString(),
    };
}
/** Resumen agregado de obligaciones por partido. */
async function getMatchTransactionsSummarySV(_matchId) {
    const MATCH = await (0, match_repository_js_1.findMatchByIdRepo)(_matchId);
    if (!MATCH) {
        throw new app_error_js_1.AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }
    const ROWS = await (0, transaction_repository_js_1.listTransactionsByMatchRepo)(_matchId);
    let totalBase = new client_js_1.Prisma.Decimal(0);
    let totalFee = new client_js_1.Prisma.Decimal(0);
    let totalAll = new client_js_1.Prisma.Decimal(0);
    let pending = 0;
    let confirmed = 0;
    let cancelled = 0;
    for (const _r of ROWS) {
        totalBase = totalBase.add(_r.amountBase);
        totalFee = totalFee.add(_r.feeAmount);
        totalAll = totalAll.add(_r.amountTotal);
        if (_r.status === 'PENDING')
            pending += 1;
        else if (_r.status === 'CONFIRMED')
            confirmed += 1;
        else if (_r.status === 'CANCELLED')
            cancelled += 1;
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
async function listUserTransactionsSV(_userId, _limit) {
    const USER = await (0, user_repository_js_1.findUserByIdRepo)(_userId);
    if (!USER) {
        throw new app_error_js_1.AppError('USUARIO_NO_ENCONTRADO', 'El usuario indicado no existe.', 404);
    }
    const ROWS = await (0, transaction_repository_js_1.listTransactionsByUserRepo)(_userId, _limit);
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
async function updateUserSubscriptionSV(_userId, _subscriptionType) {
    const USER = await (0, user_repository_js_1.findUserByIdRepo)(_userId);
    if (!USER) {
        throw new app_error_js_1.AppError('USUARIO_NO_ENCONTRADO', 'El usuario indicado no existe.', 404);
    }
    const UPDATED = await (0, user_repository_js_1.updateUserSubscriptionRepo)(_userId, _subscriptionType);
    return {
        userId: UPDATED.id,
        subscriptionType: UPDATED.subscriptionType,
    };
}
