import type {
  QuickMatchOpenCandidateDTO,
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
    categoryId: _search.categoryId,
    targetDate: _search.targetDate,
    slots: _search.slots,
    widenLevel: _search.widenLevel,
    zoneKm: _search.zoneKm,
    includeOpenMatches: _search.includeOpenMatches,
    status: _search.status,
    noMatchYet: _search.noMatchYet,
    dismissedMatchIds: _search.dismissedMatchIds,
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
          categoryId: _input.categoryId,
          targetDate: _input.targetDate,
          slots: _input.slots,
          widenLevel: _input.widenLevel,
          zoneKm: _input.zoneKm,
          includeOpenMatches: _input.includeOpenMatches,
          dismissedMatchIds: [],
        },
        update: {
          sportId: _input.sportId,
          categoryId: _input.categoryId,
          targetDate: _input.targetDate,
          slots: _input.slots,
          widenLevel: _input.widenLevel,
          zoneKm: _input.zoneKm,
          includeOpenMatches: _input.includeOpenMatches,
          status: 'SEARCHING',
          noMatchYet: false,
          dismissedMatchIds: [],
        },
      });
    });
    return mapSearchSV(SEARCH);
  }

  async findByUserIdSV(_userId: string): Promise<QuickMatchSearchDTO | null> {
    const SEARCH = await PRISMA.quickMatchSearch.findUnique({ where: { userId: _userId } });
    return SEARCH === null ? null : mapSearchSV(SEARCH);
  }

  async findOpenCandidateSV(_search: QuickMatchSearchDTO): Promise<QuickMatchOpenCandidateDTO | null> {
    const START = new Date(_search.targetDate);
    const END = new Date(START);
    END.setUTCDate(END.getUTCDate() + 1);
    const MATCH = await PRISMA.match.findFirst({
      where: {
        sportId: _search.sportId,
        categoryId: _search.categoryId,
        status: 'SCHEDULED',
        scheduledAt: { gte: START, lt: END },
        id: { notIn: _search.dismissedMatchIds },
      },
      orderBy: { scheduledAt: 'asc' },
      include: { participants: { select: { userId: true } } },
    });
    if (MATCH === null || MATCH.participants.length >= MATCH.maxParticipants) return null;
    return { matchId: MATCH.id, participantIds: MATCH.participants.flatMap((_p) => _p.userId === null ? [] : [_p.userId]) };
  }

  async createOpenProposalSV(_searchId: string, _candidate: QuickMatchOpenCandidateDTO, _expiresAt: Date): Promise<QuickMatchSearchDTO> {
    await PRISMA.quickMatchProposal.upsert({
      where: { searchId: _searchId },
      create: { searchId: _searchId, type: 'OPEN_MATCH', matchId: _candidate.matchId, playerIds: _candidate.participantIds, expiresAt: _expiresAt },
      update: { type: 'OPEN_MATCH', status: 'PENDING', matchId: _candidate.matchId, playerIds: _candidate.participantIds, expiresAt: _expiresAt },
    });
    await PRISMA.quickMatchSearch.update({ where: { id: _searchId }, data: { status: 'PROPOSAL', noMatchYet: false } });
    const SEARCH = await PRISMA.quickMatchSearch.findUniqueOrThrow({ where: { id: _searchId } });
    return mapSearchSV(SEARCH);
  }

  async markNoMatchYetSV(_searchId: string): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.quickMatchSearch.update({ where: { id: _searchId }, data: { status: 'SEARCHING', noMatchYet: true } });
    return mapSearchSV(SEARCH);
  }

  async cancelForUserSV(_userId: string): Promise<void> {
    await PRISMA.quickMatchSearch.updateMany({
      where: { userId: _userId, status: { in: ['SEARCHING', 'PROPOSAL'] } },
      data: { status: 'CANCELLED' },
    });
  }
}
