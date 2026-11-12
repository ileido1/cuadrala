import { randomUUID } from 'node:crypto';
import { AppError } from '../../domain/errors/app_error.js';
import type {
  QuickMatchGroupCandidateDTO,
  QuickMatchOpenCandidateDTO,
  QuickMatchProposalDTO,
  QuickMatchRefillDTO,
  QuickMatchRepository,
  QuickMatchSearchDTO,
  QuickMatchSlot,
  StartQuickMatchInput,
  QuickMatchVenueSelectionDTO,
} from '../../domain/ports/quick_match_repository.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { reservationMoneyCreateFieldsSV } from '../prisma_money_fields.js';

import { PRISMA } from '../prisma_client.js';

/** Cliente Prisma dentro de una transacción interactiva (`$transaction(async (_tx) => ...)`). */
type PrismaTransactionClientSV = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/** Un grupo nuevo solo existe completo: 4 jugadores (ready check tipo League of Legends). */
const GROUP_SIZE = 4;
const ACTIVE_PROPOSAL_STATUSES: Array<'PENDING' | 'CONFIRMED'> = ['PENDING', 'CONFIRMED'];
const ACTIVE_SEARCH_STATUSES: Array<'SEARCHING' | 'PROPOSAL' | 'CONFIRMED'> = ['SEARCHING', 'PROPOSAL', 'CONFIRMED'];

type SearchRow = {
  id: string; sportId: string; categoryId: string; targetDate: Date; slots: QuickMatchSlot[];
  widenLevel: boolean; zoneKm: number; includeOpenMatches: boolean;
  status: QuickMatchSearchDTO['status']; noMatchYet: boolean; dismissedMatchIds: string[];
  userId: string;
  proposal: { id: string; groupKey: string | null; type: QuickMatchProposalDTO['type']; status: QuickMatchProposalDTO['status']; matchId: string | null; playerIds: string[]; venueOptions: unknown | null; expiresAt: Date } | null;
};

const SEARCH_INCLUDE = { proposal: true } as const;

function mapSearchSV(_search: SearchRow, _acceptedCount: number): QuickMatchSearchDTO {
  return {
    id: _search.id, sportId: _search.sportId, categoryId: _search.categoryId,
    targetDate: _search.targetDate, slots: _search.slots, widenLevel: _search.widenLevel,
    zoneKm: _search.zoneKm, includeOpenMatches: _search.includeOpenMatches,
    status: _search.status, noMatchYet: _search.noMatchYet, dismissedMatchIds: _search.dismissedMatchIds,
    proposal: _search.proposal === null ? null : { ..._search.proposal },
    acceptedCount: _acceptedCount,
  };
}

/**
 * Mapea la búsqueda agregando `acceptedCount`: cuántos miembros del grupo
 * aceptaron de verdad, para que ningún cliente muestre aceptaciones que no ocurrieron.
 */
async function toSearchDTOSV(_client: PrismaTransactionClientSV, _search: SearchRow): Promise<QuickMatchSearchDTO> {
  //? 1. OPEN_MATCH, sin propuesta o ya fuera del grupo (rechazó/venció): el conteo es 0
  const IS_MEMBER = _search.proposal?.type === 'NEW_GROUP' && ACTIVE_PROPOSAL_STATUSES.includes(_search.proposal.status as 'PENDING');
  const GROUP_KEY = IS_MEMBER ? _search.proposal!.groupKey : null;
  if (GROUP_KEY === null || GROUP_KEY === undefined) return mapSearchSV(_search, 0);
  //? 2. NEW_GROUP: cuenta las filas CONFIRMED del mismo groupKey
  const ACCEPTED = await _client.quickMatchProposal.count({ where: { groupKey: GROUP_KEY, status: 'CONFIRMED' } });
  return mapSearchSV(_search, ACCEPTED);
}

/** Una cancha/horario está libre si no tiene reserva activa ni partido activo. */
async function isCourtSlotFreeSV(_client: PrismaTransactionClientSV, _courtId: string, _scheduledAt: Date): Promise<boolean> {
  const [RESERVATION, MATCH] = await Promise.all([
    _client.reservation.findFirst({ where: { courtId: _courtId, scheduledAt: _scheduledAt, status: { in: ['HELD', 'CONFIRMED'] } }, select: { id: true } }),
    _client.match.findFirst({ where: { courtId: _courtId, scheduledAt: _scheduledAt, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } }, select: { id: true } }),
  ]);
  return RESERVATION === null && MATCH === null;
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

type QuickMatchScope = { sportId: string; categoryId: string; targetDate: Date; slots: QuickMatchSlot[] };

function scopeKeySV(_scope: QuickMatchScope): string {
  return `${_scope.sportId}:${_scope.categoryId}:${_scope.targetDate.toISOString()}`;
}

/** Orden estable de miembros: se respeta el orden previo de `playerIds` y los nuevos van al final. */
function orderMembersSV(_previousOrder: string[], _memberIds: string[]): string[] {
  return [..._previousOrder.filter((_id) => _memberIds.includes(_id)), ..._memberIds.filter((_id) => !_previousOrder.includes(_id))];
}

/**
 * Jugadores cuya disponibilidad guardada coincide con el alcance y que no
 * están en cola. Quien ya rechazó o dejó vencer un ready check ese día no
 * vuelve a ser invitado.
 */
async function findAvailabilityInviteeIdsSV(_client: PrismaTransactionClientSV, _scope: QuickMatchScope, _excludedUserIds: string[], _take: number): Promise<string[]> {
  if (_take <= 0) return [];
  const DAY_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][_scope.targetDate.getUTCDay()]!;
  const ROWS = await _client.userAvailability.findMany({
    where: {
      dayOfWeek: DAY_OF_WEEK as never, slot: { in: _scope.slots },
      user: {
        is: {
          id: { notIn: _excludedUserIds },
          sportCategories: { some: { sportId: _scope.sportId, categoryId: _scope.categoryId } },
          OR: [{ quickMatchSearch: { is: null } }, { quickMatchSearch: { is: { status: { notIn: ACTIVE_SEARCH_STATUSES }, targetDate: { not: _scope.targetDate } } } }],
        },
      },
    }, distinct: ['userId'], orderBy: { createdAt: 'asc' }, take: _take, select: { userId: true },
  });
  return ROWS.map((_availability) => _availability.userId);
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
        if (!(await isCourtSlotFreeSV(PRISMA, COURT.id, SCHEDULED_AT))) continue;
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

  /** Miembros actuales de un grupo NEW_GROUP sin partido (propuesta PENDING o CONFIRMED). */
  private async groupMembersSV(_client: PrismaTransactionClientSV, _groupKey: string) {
    return _client.quickMatchProposal.findMany({
      where: { groupKey: _groupKey, status: { in: ACTIVE_PROPOSAL_STATUSES }, matchId: null },
      select: { id: true, searchId: true, status: true, playerIds: true, venueOptions: true, search: { select: { userId: true, sportId: true, categoryId: true, targetDate: true, slots: true, widenLevel: true, zoneKm: true, includeOpenMatches: true, queuedAt: true } } },
      orderBy: { search: { queuedAt: 'asc' } },
    });
  }

  /** Deja `playerIds` de todas las propuestas activas igual a los miembros actuales. */
  private async syncPlayerIdsSV(_tx: PrismaTransactionClientSV, _groupKey: string, _previousOrder: string[]): Promise<string[]> {
    const MEMBERS = await this.groupMembersSV(_tx, _groupKey);
    const PLAYER_IDS = orderMembersSV(_previousOrder, MEMBERS.map((_member) => _member.search.userId));
    await _tx.quickMatchProposal.updateMany({ where: { id: { in: MEMBERS.map((_member) => _member.id) } }, data: { playerIds: PLAYER_IDS } });
    return PLAYER_IDS;
  }

  /**
   * S5 (L7): saca del grupo solo a esos jugadores; el grupo NO se disuelve.
   * CANCELLED = rechazó o salió; EXPIRED = no aceptó a tiempo. El resto sigue
   * como estaba (CONFIRMED o PENDING con su mismo vencimiento) y el cupo queda
   * libre para `refillGroupSV`. Quien llama ya tomó el lock del groupKey.
   */
  private async removeMembersSV(_tx: PrismaTransactionClientSV, _groupKey: string, _members: Array<{ id: string; searchId: string; playerIds: string[] }>, _outcome: 'CANCELLED' | 'EXPIRED'): Promise<void> {
    if (_members.length === 0) return;
    //? 1. Marca la salida de esos jugadores
    await _tx.quickMatchProposal.updateMany({ where: { id: { in: _members.map((_member) => _member.id) } }, data: { status: _outcome === 'CANCELLED' ? 'DISMISSED' : 'EXPIRED' } });
    await _tx.quickMatchSearch.updateMany({ where: { id: { in: _members.map((_member) => _member.searchId) } }, data: _outcome === 'CANCELLED' ? { status: 'CANCELLED', noMatchYet: false } : { status: 'EXPIRED', noMatchYet: true } });
    //? 2. Los que quedan ven la lista de miembros actualizada (menos de 4 = buscando reemplazo)
    await this.syncPlayerIdsSV(_tx, _groupKey, _members[0]!.playerIds);
  }

  async startForUserSV(_userId: string, _input: StartQuickMatchInput): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      //? 1. Si estaba en un ready check sin partido, iniciar otra búsqueda equivale a
      //? rechazarlo: sale del grupo y su cupo se repone (S5)
      const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      const GROUP_KEY = CURRENT?.proposal?.groupKey ?? null;
      if (CURRENT !== null && GROUP_KEY !== null && CURRENT.proposal !== null && ACTIVE_PROPOSAL_STATUSES.includes(CURRENT.proposal.status as 'PENDING') && CURRENT.proposal.matchId === null) {
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${GROUP_KEY}))`;
        await this.removeMembersSV(_tx, GROUP_KEY, [CURRENT.proposal], 'CANCELLED');
      }
      if (CURRENT !== null) await _tx.quickMatchProposal.deleteMany({ where: { searchId: CURRENT.id } });
      //? 2. Entra a la cola: `queuedAt` marca su posición (S6)
      return _tx.quickMatchSearch.upsert({
        where: { userId: _userId }, include: SEARCH_INCLUDE,
        create: { userId: _userId, sportId: _input.sportId, categoryId: _input.categoryId, targetDate: _input.targetDate, slots: _input.slots, widenLevel: _input.widenLevel, zoneKm: _input.zoneKm, includeOpenMatches: _input.includeOpenMatches, dismissedMatchIds: [] },
        update: { sportId: _input.sportId, categoryId: _input.categoryId, targetDate: _input.targetDate, slots: _input.slots, widenLevel: _input.widenLevel, zoneKm: _input.zoneKm, includeOpenMatches: _input.includeOpenMatches, status: 'SEARCHING', noMatchYet: false, dismissedMatchIds: [], queuedAt: new Date(), invitedByAvailability: false },
      });
    });
    return toSearchDTOSV(PRISMA, SEARCH);
  }

  async findByUserIdSV(_userId: string): Promise<QuickMatchSearchDTO | null> {
    await this.expireProposalForUserSV(_userId);
    const SEARCH = await PRISMA.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
    return SEARCH === null ? null : toSearchDTOSV(PRISMA, SEARCH);
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
    return SEARCH === null ? null : toSearchDTOSV(PRISMA, SEARCH);
  }

  async findCompatibleGroupSV(_search: QuickMatchSearchDTO): Promise<QuickMatchGroupCandidateDTO | null> {
    //? 1. Dueño de la búsqueda
    const OWNER = await PRISMA.quickMatchSearch.findUnique({ where: { id: _search.id }, select: { userId: true } });
    if (OWNER === null) return null;
    //? 2. Otros jugadores en cola compatibles, los más antiguos primero (S6: `queuedAt`,
    //? no `updatedAt`, que cambia en cada escritura). Quien ya está en un ready check
    //? no está en SEARCHING; los grupos con cupos libres se reponen antes (`refillGroupSV`).
    const ACTIVE_SEARCHES = await PRISMA.quickMatchSearch.findMany({
      where: { id: { not: _search.id }, sportId: _search.sportId, categoryId: _search.categoryId, targetDate: _search.targetDate, status: 'SEARCHING', slots: { hasSome: _search.slots } },
      orderBy: [{ queuedAt: 'asc' }, { id: 'asc' }], take: GROUP_SIZE - 1, select: { id: true, userId: true },
    });
    const ACTIVE_USER_IDS = ACTIVE_SEARCHES.map((_candidate) => _candidate.userId);
    //? 3. Completa con jugadores cuya disponibilidad coincide, solo los que faltan
    const INVITATION_USER_IDS = await findAvailabilityInviteeIdsSV(PRISMA, _search, [OWNER.userId, ...ACTIVE_USER_IDS], GROUP_SIZE - 1 - ACTIVE_USER_IDS.length);
    //? 4. Solo hay grupo con 4 jugadores; con menos se sigue buscando (S1)
    const USER_IDS = [...ACTIVE_USER_IDS, OWNER.userId, ...INVITATION_USER_IDS];
    if (USER_IDS.length < GROUP_SIZE) return null;
    return {
      searchIds: [...ACTIVE_SEARCHES.map((_candidate) => _candidate.id), _search.id],
      userIds: USER_IDS,
      invitationUserIds: INVITATION_USER_IDS,
    };
  }

  async createGroupProposalsSV(_search: QuickMatchSearchDTO, _group: QuickMatchGroupCandidateDTO, _expiresAt: Date): Promise<QuickMatchSearchDTO | null> {
    if (new Set(_group.userIds).size !== GROUP_SIZE) return null;
    const VENUE_OPTIONS = await this.listVenueOptionsSV(_search);
    const SCOPE_KEY = scopeKeySV(_search);
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      //? 1. Serializa la formación y reposición de grupos del mismo deporte/categoría/fecha
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${SCOPE_KEY}))`;
      //? 2. Revalida bajo el lock: otro buscador pudo llevarse a alguno de estos jugadores
      const ACTIVE_SEARCHES = await _tx.quickMatchSearch.findMany({ where: { id: { in: _group.searchIds }, status: 'SEARCHING' }, select: { id: true, userId: true } });
      if (ACTIVE_SEARCHES.length !== _group.searchIds.length) return null;
      //? 3. Los invitados por disponibilidad pueden estar en otro alcance: lock por usuario
      //? (en orden fijo para no generar deadlocks) y revalidar antes de escribir nada.
      const INVITATION_USER_IDS = [..._group.invitationUserIds].sort();
      for (const USER_ID of INVITATION_USER_IDS) {
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`quick-match-user:${USER_ID}`}))`;
        const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: USER_ID }, select: { status: true } });
        if (CURRENT !== null && ACTIVE_SEARCH_STATUSES.includes(CURRENT.status as 'SEARCHING')) return null;
      }
      const GROUP_KEY = randomUUID();
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${GROUP_KEY}))`;
      //? 4. Los invitados entran directo al ready check, marcados como invitados
      const INVITED_SEARCHES: Array<{ id: string; userId: string }> = [];
      for (const USER_ID of INVITATION_USER_IDS) {
        INVITED_SEARCHES.push(await _tx.quickMatchSearch.upsert({
          where: { userId: USER_ID },
          create: { userId: USER_ID, sportId: _search.sportId, categoryId: _search.categoryId, targetDate: _search.targetDate, slots: _search.slots, widenLevel: _search.widenLevel, zoneKm: _search.zoneKm, includeOpenMatches: _search.includeOpenMatches, dismissedMatchIds: [], status: 'PROPOSAL', invitedByAvailability: true },
          update: { sportId: _search.sportId, categoryId: _search.categoryId, targetDate: _search.targetDate, slots: _search.slots, widenLevel: _search.widenLevel, zoneKm: _search.zoneKm, includeOpenMatches: _search.includeOpenMatches, status: 'PROPOSAL', noMatchYet: false, dismissedMatchIds: [], queuedAt: new Date(), invitedByAvailability: true },
          select: { id: true, userId: true },
        }));
      }
      //? 5. Ready check para los 4 a la vez: todos PENDING con el mismo vencimiento (S2)
      const MEMBERS = [...ACTIVE_SEARCHES, ...INVITED_SEARCHES];
      const PLAYER_IDS = _group.userIds;
      for (const MEMBER of MEMBERS) {
        const DATA = { type: 'NEW_GROUP' as const, status: 'PENDING' as const, groupKey: GROUP_KEY, playerIds: PLAYER_IDS, venueOptions: VENUE_OPTIONS, expiresAt: _expiresAt, matchId: null };
        await _tx.quickMatchProposal.upsert({ where: { searchId: MEMBER.id }, create: { searchId: MEMBER.id, ...DATA }, update: DATA });
      }
      await _tx.quickMatchSearch.updateMany({ where: { id: { in: MEMBERS.map((_member) => _member.id) } }, data: { status: 'PROPOSAL', noMatchYet: false } });
      return _tx.quickMatchSearch.findUnique({ where: { id: _search.id }, include: SEARCH_INCLUDE });
    });
    return SEARCH === null ? null : toSearchDTOSV(PRISMA, SEARCH);
  }

  async findOpenGroupKeySV(_search: QuickMatchSearchDTO): Promise<string | null> {
    //? Grupos sin partido del mismo alcance con algún miembro de franja compatible;
    //? se elige el más antiguo que tenga menos de 4 miembros.
    const ROWS = await PRISMA.quickMatchProposal.findMany({
      where: { type: 'NEW_GROUP', groupKey: { not: null }, status: { in: ACTIVE_PROPOSAL_STATUSES }, matchId: null, search: { sportId: _search.sportId, categoryId: _search.categoryId, targetDate: _search.targetDate, slots: { hasSome: _search.slots } } },
      orderBy: { createdAt: 'asc' }, take: 40, select: { groupKey: true },
    });
    for (const GROUP_KEY of [...new Set(ROWS.map((_row) => _row.groupKey!))]) {
      const MEMBERS = await PRISMA.quickMatchProposal.count({ where: { groupKey: GROUP_KEY, status: { in: ACTIVE_PROPOSAL_STATUSES }, matchId: null } });
      if (MEMBERS > 0 && MEMBERS < GROUP_SIZE) return GROUP_KEY;
    }
    return null;
  }

  /**
   * S5: repone los cupos libres de un grupo con los siguientes jugadores
   * compatibles con el miembro más antiguo: primero quienes buscan (por
   * `queuedAt`), después invitados por disponibilidad. Los que entran reciben
   * PENDING con vencimiento nuevo; los miembros actuales no cambian.
   * Locks en el mismo orden que la formación de grupos (alcance → usuario →
   * groupKey), así un jugador nunca queda en dos grupos ni un grupo pasa de 4.
   */
  async refillGroupSV(_groupKey: string, _expiresAt: Date): Promise<QuickMatchRefillDTO | null> {
    //? 1. Chequeo barato sin locks: nada que hacer si el grupo está lleno o vacío
    const PREVIEW = await this.groupMembersSV(PRISMA, _groupKey);
    if (PREVIEW.length === 0 || PREVIEW.length >= GROUP_SIZE) return null;
    const ANCHOR = PREVIEW[0]!.search;
    return PRISMA.$transaction(async (_tx) => {
      //? 2. Locks: alcance, después el grupo; se relee todo bajo el lock
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scopeKeySV(ANCHOR)}))`;
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${_groupKey}))`;
      const MEMBERS = await this.groupMembersSV(_tx, _groupKey);
      if (MEMBERS.length === 0 || MEMBERS.length >= GROUP_SIZE) return null;
      const MEMBER_IDS = MEMBERS.map((_member) => _member.search.userId);
      const PREVIOUS_ORDER = MEMBERS[0]!.playerIds;
      let openSlots = GROUP_SIZE - MEMBERS.length;
      //? 3. Primero quienes están buscando, los más antiguos en la cola
      const SEARCHERS = await _tx.quickMatchSearch.findMany({
        where: { sportId: ANCHOR.sportId, categoryId: ANCHOR.categoryId, targetDate: ANCHOR.targetDate, status: 'SEARCHING', slots: { hasSome: ANCHOR.slots }, userId: { notIn: MEMBER_IDS } },
        orderBy: [{ queuedAt: 'asc' }, { id: 'asc' }], take: openSlots, select: { id: true, userId: true },
      });
      openSlots -= SEARCHERS.length;
      //? 4. Después invitados por disponibilidad (lock por usuario, en orden fijo, y revalidación)
      const INVITEE_IDS = (await findAvailabilityInviteeIdsSV(_tx, ANCHOR, [...MEMBER_IDS, ...SEARCHERS.map((_searcher) => _searcher.userId)], openSlots)).sort();
      const INVITED: Array<{ id: string; userId: string }> = [];
      for (const USER_ID of INVITEE_IDS) {
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`quick-match-user:${USER_ID}`}))`;
        const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: USER_ID }, select: { status: true } });
        if (CURRENT !== null && ACTIVE_SEARCH_STATUSES.includes(CURRENT.status as 'SEARCHING')) continue;
        INVITED.push(await _tx.quickMatchSearch.upsert({
          where: { userId: USER_ID },
          create: { userId: USER_ID, sportId: ANCHOR.sportId, categoryId: ANCHOR.categoryId, targetDate: ANCHOR.targetDate, slots: ANCHOR.slots, widenLevel: ANCHOR.widenLevel, zoneKm: ANCHOR.zoneKm, includeOpenMatches: ANCHOR.includeOpenMatches, dismissedMatchIds: [], status: 'PROPOSAL', invitedByAvailability: true },
          update: { sportId: ANCHOR.sportId, categoryId: ANCHOR.categoryId, targetDate: ANCHOR.targetDate, slots: ANCHOR.slots, widenLevel: ANCHOR.widenLevel, zoneKm: ANCHOR.zoneKm, includeOpenMatches: ANCHOR.includeOpenMatches, status: 'PROPOSAL', noMatchYet: false, dismissedMatchIds: [], queuedAt: new Date(), invitedByAvailability: true },
          select: { id: true, userId: true },
        }));
      }
      //? 5. Los que entran: PENDING con vencimiento nuevo y las mismas opciones de sede
      const ADDED = [...SEARCHERS, ...INVITED];
      for (const MEMBER of ADDED) {
        const DATA = { type: 'NEW_GROUP' as const, status: 'PENDING' as const, groupKey: _groupKey, playerIds: [], venueOptions: MEMBERS[0]!.venueOptions ?? [], expiresAt: _expiresAt, matchId: null };
        await _tx.quickMatchProposal.upsert({ where: { searchId: MEMBER.id }, create: { searchId: MEMBER.id, ...DATA }, update: DATA });
      }
      if (ADDED.length > 0) await _tx.quickMatchSearch.updateMany({ where: { id: { in: ADDED.map((_member) => _member.id) } }, data: { status: 'PROPOSAL', noMatchYet: false } });
      //? 6. Todos ven los miembros actuales (también corrige grupos heredados con playerIds viejos)
      await this.syncPlayerIdsSV(_tx, _groupKey, PREVIOUS_ORDER);
      return { groupKey: _groupKey, categoryId: ANCHOR.categoryId, addedUserIds: ADDED.map((_member) => _member.userId), notifySearchId: ADDED[0]?.id ?? null };
    });
  }

  async markNoMatchYetSV(_searchId: string): Promise<QuickMatchSearchDTO> {
    //? Solo marca si sigue en SEARCHING: otro buscador pudo meterlo en un ready check entretanto.
    await PRISMA.quickMatchSearch.updateMany({ where: { id: _searchId, status: 'SEARCHING' }, data: { noMatchYet: true } });
    const SEARCH = await PRISMA.quickMatchSearch.findUniqueOrThrow({ where: { id: _searchId }, include: SEARCH_INCLUDE });
    return toSearchDTOSV(PRISMA, SEARCH);
  }

  async dismissProposalForUserSV(_userId: string): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      if (CURRENT?.proposal === null || CURRENT === null || !ACTIVE_PROPOSAL_STATUSES.includes(CURRENT.proposal.status as 'PENDING')) throw new AppError('PROPUESTA_NO_DISPONIBLE', 'No hay una propuesta activa para descartar.', 409);
      if (CURRENT.proposal.groupKey !== null) {
        //? 1. NEW_GROUP: rechazar saca solo a este jugador; el grupo sigue y su cupo
        //? se repone (S5). Se revalida bajo el lock.
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${CURRENT.proposal.groupKey}))`;
        const OWN = await _tx.quickMatchProposal.findUnique({ where: { id: CURRENT.proposal.id }, select: { id: true, searchId: true, status: true, matchId: true, playerIds: true } });
        if (OWN === null || !ACTIVE_PROPOSAL_STATUSES.includes(OWN.status as 'PENDING') || OWN.matchId !== null) throw new AppError('PROPUESTA_NO_DISPONIBLE', 'No hay una propuesta activa para descartar.', 409);
        await this.removeMembersSV(_tx, CURRENT.proposal.groupKey, [OWN], 'CANCELLED');
        return _tx.quickMatchSearch.findUniqueOrThrow({ where: { id: CURRENT.id }, include: SEARCH_INCLUDE });
      }
      //? 2. OPEN_MATCH: sigue buscando y no vuelve a ofrecer esa partida (S8, sin cambios)
      await _tx.quickMatchProposal.update({ where: { id: CURRENT.proposal.id }, data: { status: 'DISMISSED' } });
      return _tx.quickMatchSearch.update({ where: { id: CURRENT.id }, data: { status: 'SEARCHING', noMatchYet: true, dismissedMatchIds: CURRENT.proposal.matchId === null ? CURRENT.dismissedMatchIds : [...CURRENT.dismissedMatchIds, CURRENT.proposal.matchId] }, include: SEARCH_INCLUDE });
    });
    return toSearchDTOSV(PRISMA, SEARCH);
  }

  /**
   * Elige la cancha del partido al aceptar el 4º jugador (S4, opción "A"):
   * la selección explícita del body si vino (compatibilidad), o la primera
   * opción de `venueOptions` que siga libre. `undefined` = partido sin cancha.
   */
  private async pickVenueOptionSV(_tx: PrismaTransactionClientSV, _options: QuickMatchVenueOption[], _venueSelection?: QuickMatchVenueSelectionDTO): Promise<QuickMatchVenueOption | undefined> {
    //? 1. Selección explícita: debe ser una opción ofrecida y seguir libre
    if (_venueSelection !== undefined) {
      const OPTION = _options.find((_option) => _option.venueId === _venueSelection.venueId && _option.courtId === _venueSelection.courtId && _option.scheduledAt === _venueSelection.scheduledAt.toISOString());
      if (OPTION === undefined) throw new AppError('CANCHA_NO_DISPONIBLE', 'La sede u horario seleccionado ya no está disponible.', 409);
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${OPTION.courtId}:${OPTION.scheduledAt}`}))`;
      if (!(await isCourtSlotFreeSV(_tx, OPTION.courtId, new Date(OPTION.scheduledAt)))) throw new AppError('CANCHA_NO_DISPONIBLE', 'La cancha seleccionada ya fue reservada.', 409);
      return OPTION;
    }
    //? 2. Automática: primera opción libre. Solo se toma el lock de la que parece
    //? libre y se revalida, para no acumular locks de canchas ya ocupadas.
    for (const OPTION of _options) {
      const SCHEDULED_AT = new Date(OPTION.scheduledAt);
      if (!(await isCourtSlotFreeSV(_tx, OPTION.courtId, SCHEDULED_AT))) continue;
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${OPTION.courtId}:${OPTION.scheduledAt}`}))`;
      if (await isCourtSlotFreeSV(_tx, OPTION.courtId, SCHEDULED_AT)) return OPTION;
    }
    return undefined;
  }

  async confirmProposalForUserSV(_userId: string, _venueSelection?: QuickMatchVenueSelectionDTO): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      if (CURRENT?.proposal === null || CURRENT === null || CURRENT.proposal.status !== 'PENDING') throw new AppError('PROPUESTA_NO_DISPONIBLE', 'No hay una propuesta activa para confirmar.', 409);
      const GROUP_KEY = CURRENT.proposal.groupKey;
      if (GROUP_KEY !== null) {
        //? 1. Revalida bajo el lock del grupo: pudo disolverse entre la lectura y el lock
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${GROUP_KEY}))`;
        const OWN = await _tx.quickMatchProposal.findUnique({ where: { id: CURRENT.proposal.id }, select: { status: true } });
        if (OWN?.status !== 'PENDING') throw new AppError('PROPUESTA_NO_DISPONIBLE', 'No hay una propuesta activa para confirmar.', 409);
      }
      //? 2. Solo este jugador acepta (S3)
      await _tx.quickMatchProposal.update({ where: { id: CURRENT.proposal.id }, data: { status: 'CONFIRMED' } });

      if (GROUP_KEY !== null) {
        //? 3. ¿Aceptaron los 4? Recién ahí se crea el partido
        const GROUP = await _tx.quickMatchProposal.findMany({
          where: { groupKey: GROUP_KEY, status: { in: ACTIVE_PROPOSAL_STATUSES } },
          select: { id: true, searchId: true, status: true, matchId: true, search: { select: { userId: true } } },
        });
        //? Los jugadores del partido son los miembros actuales (no un snapshot viejo de playerIds)
        const PLAYER_IDS = orderMembersSV(CURRENT.proposal.playerIds, GROUP.map((_proposal) => _proposal.search.userId));
        const ALL_CONFIRMED = GROUP.length === GROUP_SIZE && GROUP.every((_proposal) => _proposal.status === 'CONFIRMED' && _proposal.matchId === null);
        if (ALL_CONFIRMED) {
          if (new Set(PLAYER_IDS).size !== GROUP_SIZE) {
            throw new AppError('PROPUESTA_INVALIDA', 'La propuesta grupal no tiene cuatro jugadores válidos.', 409);
          }
          //? 4. Cancha automática (S4); sin opción libre el partido queda sin cancha
          const OPTIONS = Array.isArray(CURRENT.proposal.venueOptions) ? CURRENT.proposal.venueOptions as QuickMatchVenueOption[] : [];
          const OPTION = await this.pickVenueOptionSV(_tx, OPTIONS, _venueSelection);
          const SCHEDULED_AT = OPTION === undefined ? null : new Date(OPTION.scheduledAt);
          const MATCH = await _tx.match.create({
            data: {
              sportId: CURRENT.sportId,
              categoryId: CURRENT.categoryId,
              organizerUserId: PLAYER_IDS[0]!,
              type: 'REGULAR',
              status: 'SCHEDULED',
              scheduledAt: SCHEDULED_AT,
              ...(OPTION === undefined ? {} : { courtId: OPTION.courtId }),
              pricePerPlayerCents: OPTION?.pricePerPlayerCents ?? 0,
              maxParticipants: GROUP_SIZE,
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
                scheduledAt: SCHEDULED_AT!,
                durationMinutes: 90,
                status: 'CONFIRMED',
                visibility: 'PUBLISHED',
                matchStatus: 'SCHEDULED',
                matchId: MATCH.id,
                organizerUserId: PLAYER_IDS[0]!,
                createdByUserId: PLAYER_IDS[0]!,
                maxParticipants: GROUP_SIZE,
                pricePerPlayerCents: OPTION.pricePerPlayerCents,
                ...reservationMoneyCreateFieldsSV(PRICING_CURRENCY.pricingCurrency, OPTION.pricePerPlayerCents * GROUP_SIZE),
              },
            });
          }
          //? 5. El partido queda visible para los 4 miembros
          await _tx.quickMatchProposal.updateMany({ where: { groupKey: GROUP_KEY, status: 'CONFIRMED' }, data: { matchId: MATCH.id } });
        }
      }
      //? 6. Quien aceptó queda CONFIRMED esperando al resto (matchId null hasta el 4º).
      //? Un invitado por disponibilidad que acepta pasa a contar como buscador real.
      return _tx.quickMatchSearch.update({ where: { id: CURRENT.id }, data: { status: 'CONFIRMED', noMatchYet: false, invitedByAvailability: false }, include: SEARCH_INCLUDE });
    });
    return toSearchDTOSV(PRISMA, SEARCH);
  }

  async cancelForUserSV(_userId: string): Promise<void> {
    await PRISMA.$transaction(async (_tx) => {
      const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      if (CURRENT === null) return;
      //? Se puede salir mientras no exista el partido: también una búsqueda
      //? EXPIRED o CONFIRMED con el grupo todavía formándose. Antes solo
      //? SEARCHING/PROPOSAL, y "salir de la cola" no hacía nada en esos casos.
      const MATCH_CREATED = CURRENT.status === 'CONFIRMED' && CURRENT.proposal?.matchId != null;
      if (!['SEARCHING', 'PROPOSAL', 'EXPIRED', 'CONFIRMED'].includes(CURRENT.status) || MATCH_CREATED) return;
      //? Salir durante un ready check equivale a rechazarlo: sale solo este jugador
      //? y su cupo queda libre para reponerse (S5).
      if (CURRENT.proposal !== null && ACTIVE_PROPOSAL_STATUSES.includes(CURRENT.proposal.status as 'PENDING') && CURRENT.proposal.groupKey !== null) {
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${CURRENT.proposal.groupKey}))`;
        await this.removeMembersSV(_tx, CURRENT.proposal.groupKey, [CURRENT.proposal], 'CANCELLED');
      } else if (CURRENT.proposal !== null && ACTIVE_PROPOSAL_STATUSES.includes(CURRENT.proposal.status as 'PENDING')) {
        await _tx.quickMatchProposal.update({ where: { id: CURRENT.proposal.id }, data: { status: 'DISMISSED' } });
      }
      await _tx.quickMatchSearch.update({ where: { id: CURRENT.id }, data: { status: 'CANCELLED' } });
    });
  }

  private async expireProposalForUserSV(_userId: string): Promise<void> {
    await PRISMA.$transaction(async (_tx) => {
      const SEARCH = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      if (SEARCH?.proposal === null || SEARCH === null) return;
      const GROUP_KEY = SEARCH.proposal.groupKey;
      //? Los PENDING de un grupo pueden vencer en momentos distintos (reemplazos con
      //? vencimiento nuevo): el chequeo de vencimiento es por fila, no por la propia propuesta.
      if (GROUP_KEY === null && SEARCH.proposal.expiresAt > new Date()) return;
      if (GROUP_KEY !== null) {
        //? 1. NEW_GROUP: el vencimiento se resuelve para todo el grupo, lo lea quien lo lea
        //? (también quien ya aceptó). Solo salen los PENDING vencidos; el resto sigue.
        if (!ACTIVE_PROPOSAL_STATUSES.includes(SEARCH.proposal.status as 'PENDING') || SEARCH.proposal.matchId !== null) return;
        const DUE = await _tx.quickMatchProposal.count({ where: { groupKey: GROUP_KEY, status: 'PENDING', matchId: null, expiresAt: { lte: new Date() } } });
        if (DUE === 0) return;
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${GROUP_KEY}))`;
        const EXPIRED = await _tx.quickMatchProposal.findMany({ where: { groupKey: GROUP_KEY, status: 'PENDING', matchId: null, expiresAt: { lte: new Date() } }, select: { id: true, searchId: true, playerIds: true } });
        await this.removeMembersSV(_tx, GROUP_KEY, EXPIRED, 'EXPIRED');
        return;
      }
      //? 2. OPEN_MATCH: vence solo la oferta de este jugador (sin cambios)
      if (SEARCH.proposal.status !== 'PENDING') return;
      await _tx.quickMatchProposal.update({ where: { id: SEARCH.proposal.id }, data: { status: 'EXPIRED' } });
      await _tx.quickMatchSearch.update({ where: { id: SEARCH.id }, data: { status: 'EXPIRED', noMatchYet: true } });
    });
  }
}
