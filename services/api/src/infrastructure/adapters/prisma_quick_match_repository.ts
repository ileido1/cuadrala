import { randomUUID } from 'node:crypto';
import { AppError } from '../../domain/errors/app_error.js';
import type {
  QuickMatchGroupCandidateDTO,
  QuickMatchOpenCandidateDTO,
  QuickMatchProposalDTO,
  QuickMatchRepository,
  QuickMatchSearchDTO,
  QuickMatchSlot,
  StartQuickMatchInput,
  QuickMatchVenueSelectionDTO,
} from '../../domain/ports/quick_match_repository.js';
import { reservationMoneyCreateFieldsSV } from '../prisma_money_fields.js';

import { PRISMA } from '../prisma_client.js';

type SearchRow = {
  id: string; sportId: string; categoryId: string; targetDate: Date; slots: QuickMatchSlot[];
  widenLevel: boolean; zoneKm: number; includeOpenMatches: boolean;
  status: QuickMatchSearchDTO['status']; noMatchYet: boolean; dismissedMatchIds: string[];
  userId: string;
  proposal: { id: string; groupKey: string | null; type: QuickMatchProposalDTO['type']; status: QuickMatchProposalDTO['status']; matchId: string | null; playerIds: string[]; venueOptions: unknown | null; expiresAt: Date } | null;
};

const SEARCH_INCLUDE = { proposal: true } as const;

function mapSearchSV(_search: SearchRow): QuickMatchSearchDTO {
  return {
    id: _search.id, sportId: _search.sportId, categoryId: _search.categoryId,
    targetDate: _search.targetDate, slots: _search.slots, widenLevel: _search.widenLevel,
    zoneKm: _search.zoneKm, includeOpenMatches: _search.includeOpenMatches,
    status: _search.status, noMatchYet: _search.noMatchYet, dismissedMatchIds: _search.dismissedMatchIds,
    proposal: _search.proposal === null ? null : { ..._search.proposal },
  };
}

function matchesSlotSV(_scheduledAt: Date, _slots: QuickMatchSlot[]): boolean {
  const HOUR = _scheduledAt.getUTCHours();
  const SLOT: QuickMatchSlot = HOUR < 12 ? 'MORNING' : HOUR < 18 ? 'AFTERNOON' : 'EVENING';
  return _slots.includes(SLOT);
}

function slotStartSV(_date: Date, _slot: QuickMatchSlot): Date {
  const START = new Date(_date);
  START.setUTCHours(_slot === 'MORNING' ? 9 : _slot === 'AFTERNOON' ? 14 : 19, 0, 0, 0);
  return START;
}

type QuickMatchVenueOption = {
  id: string;
  venueId: string;
  venueName: string;
  courtId: string;
  courtName: string;
  scheduledAt: string;
  pricePerPlayerCents: number;
};

export class PrismaQuickMatchRepository implements QuickMatchRepository {
  private async listVenueOptionsSV(_search: QuickMatchSearchDTO): Promise<QuickMatchVenueOption[]> {
    const SPORT = await PRISMA.sport.findUnique({ where: { id: _search.sportId }, select: { code: true } });
    if (SPORT === null) return [];
    const COURTS = await PRISMA.court.findMany({
      where: { status: 'ACTIVE', sportType: SPORT.code as 'PADEL' | 'TENNIS' | 'PICKLEBALL' | 'BEACH_TENNIS' },
      select: { id: true, name: true, pricePerHourCents: true, venueId: true, venue: { select: { name: true } } },
      orderBy: [{ venueId: 'asc' }, { createdAt: 'asc' }],
      take: 30,
    });
    const OPTIONS: QuickMatchVenueOption[] = [];
    for (const COURT of COURTS) {
      for (const SLOT of _search.slots) {
        const SCHEDULED_AT = slotStartSV(_search.targetDate, SLOT);
        const [RESERVATION, MATCH] = await Promise.all([
          PRISMA.reservation.findFirst({ where: { courtId: COURT.id, scheduledAt: SCHEDULED_AT, status: { in: ['HELD', 'CONFIRMED'] } }, select: { id: true } }),
          PRISMA.match.findFirst({ where: { courtId: COURT.id, scheduledAt: SCHEDULED_AT, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } }, select: { id: true } }),
        ]);
        if (RESERVATION !== null || MATCH !== null) continue;
        OPTIONS.push({
          id: `${COURT.id}:${SCHEDULED_AT.toISOString()}`,
          venueId: COURT.venueId,
          venueName: COURT.venue.name,
          courtId: COURT.id,
          courtName: COURT.name,
          scheduledAt: SCHEDULED_AT.toISOString(),
          pricePerPlayerCents: Math.ceil((COURT.pricePerHourCents ?? 0) / 4),
        });
        if (OPTIONS.length >= 6) return OPTIONS;
      }
    }
    return OPTIONS;
  }

  async startForUserSV(_userId: string, _input: StartQuickMatchInput): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, select: { id: true } });
      if (CURRENT !== null) await _tx.quickMatchProposal.deleteMany({ where: { searchId: CURRENT.id } });
      return _tx.quickMatchSearch.upsert({
        where: { userId: _userId }, include: SEARCH_INCLUDE,
        create: { userId: _userId, sportId: _input.sportId, categoryId: _input.categoryId, targetDate: _input.targetDate, slots: _input.slots, widenLevel: _input.widenLevel, zoneKm: _input.zoneKm, includeOpenMatches: _input.includeOpenMatches, dismissedMatchIds: [] },
        update: { sportId: _input.sportId, categoryId: _input.categoryId, targetDate: _input.targetDate, slots: _input.slots, widenLevel: _input.widenLevel, zoneKm: _input.zoneKm, includeOpenMatches: _input.includeOpenMatches, status: 'SEARCHING', noMatchYet: false, dismissedMatchIds: [] },
      });
    });
    return mapSearchSV(SEARCH);
  }

  async findByUserIdSV(_userId: string): Promise<QuickMatchSearchDTO | null> {
    await this.expireProposalForUserSV(_userId);
    const SEARCH = await PRISMA.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
    return SEARCH === null ? null : mapSearchSV(SEARCH);
  }

  async findOpenCandidateSV(_search: QuickMatchSearchDTO): Promise<QuickMatchOpenCandidateDTO | null> {
    const START = new Date(_search.targetDate); const END = new Date(START); END.setUTCDate(END.getUTCDate() + 1);
    const MATCHES = await PRISMA.match.findMany({
      where: { sportId: _search.sportId, categoryId: _search.categoryId, status: 'SCHEDULED', scheduledAt: { gte: START, lt: END }, id: { notIn: _search.dismissedMatchIds } },
      orderBy: { scheduledAt: 'asc' }, take: 25,
      include: { participants: { select: { userId: true } } },
    });
    const MATCH = MATCHES.find((_match) => _match.scheduledAt !== null && _match.participants.length < _match.maxParticipants && matchesSlotSV(_match.scheduledAt, _search.slots));
    return MATCH === undefined ? null : { matchId: MATCH.id, participantIds: MATCH.participants.flatMap((_participant) => _participant.userId === null ? [] : [_participant.userId]) };
  }

  async createOpenProposalSV(_searchId: string, _candidate: QuickMatchOpenCandidateDTO, _expiresAt: Date): Promise<QuickMatchSearchDTO | null> {
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      // Serializa ofertas para una misma partida: un hold pendiente cuenta como cupo temporal, sin reservar cancha.
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${_candidate.matchId}))`;
      const MATCH = await _tx.match.findUnique({ where: { id: _candidate.matchId }, select: { maxParticipants: true, status: true, participants: { select: { id: true } } } });
      if (MATCH === null || MATCH.status !== 'SCHEDULED') return null;
      const HOLDS = await _tx.quickMatchProposal.count({ where: { type: 'OPEN_MATCH', matchId: _candidate.matchId, status: 'PENDING', expiresAt: { gt: new Date() } } });
      if (MATCH.participants.length + HOLDS >= MATCH.maxParticipants) return null;
      await _tx.quickMatchProposal.upsert({ where: { searchId: _searchId }, create: { searchId: _searchId, type: 'OPEN_MATCH', matchId: _candidate.matchId, playerIds: _candidate.participantIds, expiresAt: _expiresAt }, update: { type: 'OPEN_MATCH', status: 'PENDING', matchId: _candidate.matchId, playerIds: _candidate.participantIds, expiresAt: _expiresAt } });
      return _tx.quickMatchSearch.update({ where: { id: _searchId }, data: { status: 'PROPOSAL', noMatchYet: false }, include: SEARCH_INCLUDE });
    });
    return SEARCH === null ? null : mapSearchSV(SEARCH);
  }

  async findCompatibleGroupSV(_search: QuickMatchSearchDTO): Promise<QuickMatchGroupCandidateDTO | null> {
    const SEARCHES = await PRISMA.quickMatchSearch.findMany({
      where: {
        id: { not: _search.id }, sportId: _search.sportId, categoryId: _search.categoryId,
        targetDate: _search.targetDate, status: 'SEARCHING', slots: { hasSome: _search.slots },
      },
      orderBy: { updatedAt: 'asc' }, take: 3, select: { id: true, userId: true },
    });
    if (SEARCHES.length !== 3) return null;
    return { searchIds: [_search.id, ...SEARCHES.map((_candidate) => _candidate.id)], userIds: [...SEARCHES.map((_candidate) => _candidate.userId)] };
  }

  async createGroupProposalsSV(_search: QuickMatchSearchDTO, _group: QuickMatchGroupCandidateDTO, _expiresAt: Date): Promise<QuickMatchSearchDTO | null> {
    const GROUP_KEY = randomUUID();
    const VENUE_OPTIONS = await this.listVenueOptionsSV(_search);
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${_search.sportId}:${_search.categoryId}:${_search.targetDate.toISOString()}`}))`;
      const CANDIDATES = await _tx.quickMatchSearch.findMany({ where: { id: { in: _group.searchIds }, status: 'SEARCHING' }, select: { id: true, userId: true } });
      if (CANDIDATES.length !== 4) return null;
      const PLAYER_IDS = CANDIDATES.map((_candidate) => _candidate.userId);
      await Promise.all(CANDIDATES.map((_candidate) => _tx.quickMatchProposal.upsert({
        where: { searchId: _candidate.id },
        create: { searchId: _candidate.id, type: 'NEW_GROUP', groupKey: GROUP_KEY, playerIds: PLAYER_IDS, venueOptions: VENUE_OPTIONS, expiresAt: _expiresAt },
        update: { type: 'NEW_GROUP', status: 'PENDING', matchId: null, groupKey: GROUP_KEY, playerIds: PLAYER_IDS, venueOptions: VENUE_OPTIONS, expiresAt: _expiresAt },
      })));
      await _tx.quickMatchSearch.updateMany({ where: { id: { in: _group.searchIds } }, data: { status: 'PROPOSAL', noMatchYet: false } });
      return _tx.quickMatchSearch.findUnique({ where: { id: _search.id }, include: SEARCH_INCLUDE });
    });
    return SEARCH === null ? null : mapSearchSV(SEARCH);
  }

  async markNoMatchYetSV(_searchId: string): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.quickMatchSearch.update({ where: { id: _searchId }, data: { status: 'SEARCHING', noMatchYet: true }, include: SEARCH_INCLUDE });
    return mapSearchSV(SEARCH);
  }

  async dismissProposalForUserSV(_userId: string): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      if (CURRENT?.proposal === null || CURRENT === null || CURRENT.proposal.status !== 'PENDING') throw new AppError('PROPUESTA_NO_DISPONIBLE', 'No hay una propuesta activa para descartar.', 409);
      if (CURRENT.proposal.groupKey !== null) {
        const GROUP_PROPOSALS = await _tx.quickMatchProposal.findMany({ where: { groupKey: CURRENT.proposal.groupKey, status: 'PENDING' }, select: { id: true, searchId: true } });
        await _tx.quickMatchProposal.updateMany({ where: { id: { in: GROUP_PROPOSALS.map((_proposal) => _proposal.id) } }, data: { status: 'DISMISSED' } });
        await _tx.quickMatchSearch.updateMany({ where: { id: { in: GROUP_PROPOSALS.map((_proposal) => _proposal.searchId) } }, data: { status: 'SEARCHING', noMatchYet: true } });
      } else {
        await _tx.quickMatchProposal.update({ where: { id: CURRENT.proposal.id }, data: { status: 'DISMISSED' } });
      }
      return _tx.quickMatchSearch.update({ where: { id: CURRENT.id }, data: { status: 'SEARCHING', noMatchYet: true, dismissedMatchIds: CURRENT.proposal.matchId === null ? CURRENT.dismissedMatchIds : [...CURRENT.dismissedMatchIds, CURRENT.proposal.matchId] }, include: SEARCH_INCLUDE });
    });
    return mapSearchSV(SEARCH);
  }

  async confirmProposalForUserSV(_userId: string, _venueSelection?: QuickMatchVenueSelectionDTO): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      if (CURRENT?.proposal === null || CURRENT === null || CURRENT.proposal.status !== 'PENDING') throw new AppError('PROPUESTA_NO_DISPONIBLE', 'No hay una propuesta activa para confirmar.', 409);
      if (CURRENT.proposal.groupKey !== null) {
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${CURRENT.proposal.groupKey}))`;
      }
      await _tx.quickMatchProposal.update({ where: { id: CURRENT.proposal.id }, data: { status: 'CONFIRMED' } });

      if (CURRENT.proposal.groupKey !== null) {
        const GROUP = await _tx.quickMatchProposal.findMany({
          where: { groupKey: CURRENT.proposal.groupKey },
          select: { id: true, searchId: true, status: true, matchId: true, playerIds: true },
        });
        const ALL_CONFIRMED = GROUP.length === 4 && GROUP.every((_proposal) => _proposal.status === 'CONFIRMED');
        if (ALL_CONFIRMED && GROUP.every((_proposal) => _proposal.matchId === null)) {
          const PLAYER_IDS = [...new Set(GROUP[0]!.playerIds)];
          if (PLAYER_IDS.length !== 4) {
            throw new AppError('PROPUESTA_INVALIDA', 'La propuesta grupal no tiene cuatro jugadores válidos.', 409);
          }
          const OPTIONS = Array.isArray(CURRENT.proposal.venueOptions) ? CURRENT.proposal.venueOptions as QuickMatchVenueOption[] : [];
          if (_venueSelection === undefined && OPTIONS.length > 0) {
            throw new AppError('CANCHA_REQUERIDA', 'Selecciona una sede y un horario para reservar la cancha.', 409);
          }
          const OPTION = _venueSelection === undefined ? undefined : OPTIONS.find((_option) => _option.venueId === _venueSelection.venueId && _option.courtId === _venueSelection.courtId && _option.scheduledAt === _venueSelection.scheduledAt.toISOString());
          if (_venueSelection !== undefined && OPTION === undefined) {
            throw new AppError('CANCHA_NO_DISPONIBLE', 'La sede u horario seleccionado ya no está disponible.', 409);
          }
          if (OPTION !== undefined) {
            await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${OPTION.courtId}:${OPTION.scheduledAt}`}))`;
            const [ACTIVE_RESERVATION, ACTIVE_MATCH] = await Promise.all([
              _tx.reservation.findFirst({ where: { courtId: OPTION.courtId, scheduledAt: _venueSelection!.scheduledAt, status: { in: ['HELD', 'CONFIRMED'] } }, select: { id: true } }),
              _tx.match.findFirst({ where: { courtId: OPTION.courtId, scheduledAt: _venueSelection!.scheduledAt, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } }, select: { id: true } }),
            ]);
            if (ACTIVE_RESERVATION !== null || ACTIVE_MATCH !== null) {
              throw new AppError('CANCHA_NO_DISPONIBLE', 'La cancha seleccionada ya fue reservada.', 409);
            }
          }
          const MATCH = await _tx.match.create({
            data: {
              sportId: CURRENT.sportId,
              categoryId: CURRENT.categoryId,
              organizerUserId: PLAYER_IDS[0]!,
              type: 'REGULAR',
              status: 'SCHEDULED',
              scheduledAt: OPTION === undefined ? null : _venueSelection!.scheduledAt,
              ...(OPTION === undefined ? {} : { courtId: OPTION.courtId }),
              pricePerPlayerCents: OPTION?.pricePerPlayerCents ?? 0,
              maxParticipants: 4,
              affectsElo: true,
              participants: { create: PLAYER_IDS.map((_playerId) => ({ userId: _playerId })) },
            },
            select: { id: true },
          });
          if (OPTION !== undefined) {
            const PRICING_CURRENCY = await _tx.venue.findUnique({ where: { id: OPTION.venueId }, select: { pricingCurrency: true } });
            if (PRICING_CURRENCY === null) {
              throw new AppError('SEDE_NO_ENCONTRADA', 'La sede seleccionada no existe.', 404);
            }
            await _tx.reservation.create({
              data: {
              venueId: OPTION.venueId,
              courtId: OPTION.courtId,
              sportId: CURRENT.sportId,
              categoryId: CURRENT.categoryId,
              type: 'MATCH',
              scheduledAt: _venueSelection!.scheduledAt,
              durationMinutes: 90,
              status: 'CONFIRMED',
              visibility: 'PUBLISHED',
              matchStatus: 'SCHEDULED',
              matchId: MATCH.id,
              organizerUserId: PLAYER_IDS[0]!,
              createdByUserId: PLAYER_IDS[0]!,
              maxParticipants: 4,
              pricePerPlayerCents: OPTION.pricePerPlayerCents,
              ...reservationMoneyCreateFieldsSV(PRICING_CURRENCY.pricingCurrency, OPTION.pricePerPlayerCents * 4),
              },
            });
          }
          await _tx.quickMatchProposal.updateMany({
            where: { groupKey: CURRENT.proposal.groupKey },
            data: { matchId: MATCH.id },
          });
        }
        await _tx.quickMatchSearch.updateMany({
          where: { id: { in: GROUP.map((_proposal) => _proposal.searchId) } },
          data: { status: 'CONFIRMED', noMatchYet: false },
        });
      }
      return _tx.quickMatchSearch.update({ where: { id: CURRENT.id }, data: { status: 'CONFIRMED', noMatchYet: false }, include: SEARCH_INCLUDE });
    });
    return mapSearchSV(SEARCH);
  }

  async cancelForUserSV(_userId: string): Promise<void> {
    await PRISMA.quickMatchSearch.updateMany({ where: { userId: _userId, status: { in: ['SEARCHING', 'PROPOSAL'] } }, data: { status: 'CANCELLED' } });
  }

  private async expireProposalForUserSV(_userId: string): Promise<void> {
    await PRISMA.$transaction(async (_tx) => {
      const SEARCH = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      if (SEARCH?.proposal === null || SEARCH === null || SEARCH.proposal.status !== 'PENDING' || SEARCH.proposal.expiresAt > new Date()) return;
      if (SEARCH.proposal.groupKey !== null) {
        // Una propuesta grupal es atómica: si un jugador no confirma, se libera
        // el hold completo y todos vuelven a la cola para evitar grupos huérfanos.
        await _tx.quickMatchProposal.updateMany({
          where: { groupKey: SEARCH.proposal.groupKey, status: { in: ['PENDING', 'CONFIRMED'] } },
          data: { status: 'EXPIRED' },
        });
        const GROUP_SEARCHES = await _tx.quickMatchProposal.findMany({
          where: { groupKey: SEARCH.proposal.groupKey },
          select: { searchId: true },
        });
        await _tx.quickMatchSearch.updateMany({
          where: { id: { in: GROUP_SEARCHES.map((_proposal) => _proposal.searchId) } },
          data: { status: 'EXPIRED', noMatchYet: true },
        });
        return;
      }
      await _tx.quickMatchProposal.update({ where: { id: SEARCH.proposal.id }, data: { status: 'EXPIRED' } });
      await _tx.quickMatchSearch.update({ where: { id: SEARCH.id }, data: { status: 'EXPIRED', noMatchYet: true } });
    });
  }
}
