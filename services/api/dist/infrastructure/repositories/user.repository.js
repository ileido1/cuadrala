"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByIdRepo = findUserByIdRepo;
exports.updateUserSubscriptionRepo = updateUserSubscriptionRepo;
exports.countUsersByIdsRepo = countUsersByIdsRepo;
exports.listUsersNotInRepo = listUsersNotInRepo;
const prisma_client_js_1 = require("../prisma_client.js");
async function findUserByIdRepo(_id) {
    return prisma_client_js_1.PRISMA.user.findUnique({ where: { id: _id } });
}
async function updateUserSubscriptionRepo(_id, _subscriptionType) {
    return prisma_client_js_1.PRISMA.user.update({
        where: { id: _id },
        data: { subscriptionType: _subscriptionType },
    });
}
async function countUsersByIdsRepo(_ids) {
    if (_ids.length === 0) {
        return 0;
    }
    return prisma_client_js_1.PRISMA.user.count({ where: { id: { in: _ids } } });
}
async function listUsersNotInRepo(_excludeUserIds, _limit) {
    return prisma_client_js_1.PRISMA.user.findMany({
        where: _excludeUserIds.length > 0 ? { id: { notIn: _excludeUserIds } } : {},
        orderBy: { name: 'asc' },
        take: _limit,
        select: { id: true, name: true, email: true },
    });
}
