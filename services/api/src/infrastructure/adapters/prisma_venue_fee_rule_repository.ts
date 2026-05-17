import type {
  VenueFeeRuleDTO,
  VenueFeeRuleRepository,
} from '../../domain/ports/venue_fee_rule_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaVenueFeeRuleRepository implements VenueFeeRuleRepository {
  async findActiveForScopeSV(
    _scope: 'MATCH' | 'RESERVATION',
  ): Promise<VenueFeeRuleDTO> {
    const RULE = await PRISMA.feeRule.findFirst({
      where: { scope: _scope, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (RULE === null) {
      return null;
    }
    return {
      type: RULE.type as 'FIXED' | 'PERCENTAGE',
      value: Number(RULE.value.toString()),
    };
  }
}
