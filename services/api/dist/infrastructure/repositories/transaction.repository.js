"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPendingOrConfirmedForMatchUserRepo = findPendingOrConfirmedForMatchUserRepo;
exports.createTransactionRepo = createTransactionRepo;
exports.findTransactionByIdRepo = findTransactionByIdRepo;
exports.confirmTransactionManualRepo = confirmTransactionManualRepo;
exports.listTransactionsByMatchRepo = listTransactionsByMatchRepo;
exports.listTransactionsByUserRepo = listTransactionsByUserRepo;
const prisma_client_js_1 = require("../prisma_client.js");
async function findPendingOrConfirmedForMatchUserRepo(_matchId, _userId, _client = prisma_client_js_1.PRISMA) {
    return _client.transaction.findFirst({
        where: {
            matchId: _matchId,
            userId: _userId,
            status: { in: ['PENDING', 'CONFIRMED'] },
        },
    });
}
async function createTransactionRepo(_data, _client = prisma_client_js_1.PRISMA) {
    return _client.transaction.create({
        data: {
            matchId: _data.matchId,
            userId: _data.userId,
            amountBase: _data.amountBase,
            feeAmount: _data.feeAmount,
            amountTotal: _data.amountTotal,
            status: 'PENDING',
            paymentMethod: 'MANUAL',
        },
    });
}
async function findTransactionByIdRepo(_id) {
    return prisma_client_js_1.PRISMA.transaction.findUnique({ where: { id: _id } });
}
async function confirmTransactionManualRepo(_id) {
    return prisma_client_js_1.PRISMA.transaction.update({
        where: { id: _id },
        data: {
            status: 'CONFIRMED',
            confirmedAt: new Date(),
        },
    });
}
async function listTransactionsByMatchRepo(_matchId) {
    return prisma_client_js_1.PRISMA.transaction.findMany({
        where: { matchId: _matchId },
        orderBy: { createdAt: 'asc' },
    });
}
async function listTransactionsByUserRepo(_userId, _limit) {
    return prisma_client_js_1.PRISMA.transaction.findMany({
        where: { userId: _userId },
        orderBy: { createdAt: 'desc' },
        take: _limit,
    });
}
