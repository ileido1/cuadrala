import { PRISMA } from '../prisma_client.js';

/** Regla activa más reciente para el ámbito indicado (p. ej. MATCH). */
export async function findActiveFeeRuleForScopeRepo(_scope: 'MATCH') {
  return PRISMA.feeRule.findFirst({
    where: { scope: _scope, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}
