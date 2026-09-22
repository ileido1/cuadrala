import type {
  QuickMatchRepository,
  QuickMatchSearchDTO,
  StartQuickMatchInput,
} from '../../domain/ports/quick_match_repository.js';

import { PRISMA } from '../prisma_client.js';

type SearchRow = NonNullable<Awaited<ReturnType<typeof PRISMA.quickMatchSearch.findUnique>>>;

function mapSearchSV(_search: SearchRow): QuickMatchSearchDTO {
  return {
    id: _search.id,
    sportId: _search.sportId,
    targetDate: _search.targetDate,
    slots: _search.slots,
    widenLevel: _search.widenLevel,
    zoneKm: _search.zoneKm,
    includeOpenMatches: _search.includeOpenMatches,
    status: _search.status,
    noMatchYet: _search.noMatchYet,
    proposal: null,
  };
}

export class PrismaQuickMatchRepository implements QuickMatchRepository {
  async startForUserSV(_userId: string, _input: StartQuickMatchInput): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, select: { id: true } });
      if (CURRENT !== null) {
        await _tx.quickMatchProposal.deleteMany({ where: { searchId: CURRENT.id } });
      }
      return _tx.quickMatchSearch.upsert({
        where: { userId: _userId },
        create: {
          userId: _userId,
          sportId: _input.sportId,
          targetDate: _input.targetDate,
          slots: _input.slots,
          widenLevel: _input.widenLevel,
          zoneKm: _input.zoneKm,
          includeOpenMatches: _input.includeOpenMatches,
        },
        update: {
          sportId: _input.sportId,
          targetDate: _input.targetDate,
          slots: _input.slots,
          widenLevel: _input.widenLevel,
          zoneKm: _input.zoneKm,
          includeOpenMatches: _input.includeOpenMatches,
          status: 'SEARCHING',
          noMatchYet: false,
        },
      });
    });
    return mapSearchSV(SEARCH);
  }

  async findByUserIdSV(_userId: string): Promise<QuickMatchSearchDTO | null> {
    const SEARCH = await PRISMA.quickMatchSearch.findUnique({ where: { userId: _userId } });
    return SEARCH === null ? null : mapSearchSV(SEARCH);
  }

  async cancelForUserSV(_userId: string): Promise<void> {
    await PRISMA.quickMatchSearch.updateMany({
      where: { userId: _userId, status: { in: ['SEARCHING', 'PROPOSAL'] } },
      data: { status: 'CANCELLED' },
    });
  }
}
