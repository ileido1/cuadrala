"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findActiveFeeRuleForScopeRepo = findActiveFeeRuleForScopeRepo;
const prisma_client_js_1 = require("../prisma_client.js");
/** Regla activa más reciente para el ámbito indicado (p. ej. MATCH). */
async function findActiveFeeRuleForScopeRepo(_scope) {
    return prisma_client_js_1.PRISMA.feeRule.findFirst({
        where: { scope: _scope, isActive: true },
        orderBy: { createdAt: 'desc' },
    });
}
