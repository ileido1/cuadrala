import type {
  VenueFeeRuleDTO,
  VenueFeeRuleRepository,
} from '../../domain/ports/venue_fee_rule_repository.js';

import { PRISMA } from '../prisma_client.js';

function mapVenueRuleSV(_row: {
  type: string;
  value: { toString(): string };
}): VenueFeeRuleDTO {
  return {
    type: _row.type as 'FIXED' | 'PERCENTAGE',
    value: Number(_row.value.toString()),
    source: 'VENUE',
  };
}

function mapGlobalRuleSV(_row: {
  type: string;
  value: { toString(): string };
}): VenueFeeRuleDTO {
  return {
    type: _row.type as 'FIXED' | 'PERCENTAGE',
    value: Number(_row.value.toString()),
    source: 'GLOBAL',
  };
}

export class PrismaVenueFeeRuleRepository implements VenueFeeRuleRepository {
  async findActiveForVenueAndScopeSV(
    _venueId: string,
    _scope: 'MATCH' | 'RESERVATION',
  ): Promise<VenueFeeRuleDTO> {
    const VENUE_RULE = await PRISMA.venueFeeRule.findFirst({
      where: { venueId: _venueId, scope: _scope, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (VENUE_RULE !== null) {
      return mapVenueRuleSV(VENUE_RULE);
    }

    const GLOBAL_RULE = await PRISMA.feeRule.findFirst({
      where: { scope: _scope, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return GLOBAL_RULE === null ? null : mapGlobalRuleSV(GLOBAL_RULE);
  }

  async findActiveForScopeSV(
    _scope: 'MATCH' | 'RESERVATION',
  ): Promise<VenueFeeRuleDTO> {
    const GLOBAL_RULE = await PRISMA.feeRule.findFirst({
      where: { scope: _scope, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return GLOBAL_RULE === null ? null : mapGlobalRuleSV(GLOBAL_RULE);
  }
}
