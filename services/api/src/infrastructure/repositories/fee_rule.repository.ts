import { PRISMA } from '../prisma_client.js';

/** Regla activa más reciente para el ámbito indicado (p. ej. MATCH, RESERVATION). */
export async function findActiveFeeRuleForScopeRepo(_scope: 'MATCH' | 'RESERVATION') {
  return PRISMA.feeRule.findFirst({
    where: { scope: _scope, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}
