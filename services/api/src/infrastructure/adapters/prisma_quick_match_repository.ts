import { randomUUID } from 'node:crypto';
import { AppError } from '../../domain/errors/app_error.js';
import { QUICK_MATCH_HOLD_MS } from '../../domain/ports/quick_match_repository.js';
import type {
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

/** Un partido es de 4: el lobby se llena de a uno y a los 4 arranca el ready check. */
const GROUP_SIZE = 4;
const ACTIVE_PROPOSAL_STATUSES: Array<'PENDING' | 'CONFIRMED'> = ['PENDING', 'CONFIRMED'];
const ACTIVE_SEARCH_STATUSES: Array<'SEARCHING' | 'PROPOSAL' | 'CONFIRMED'> = ['SEARCHING', 'PROPOSAL', 'CONFIRMED'];
/** Buscador "solo": en cola y fuera de cualquier lobby (puede tener una oferta OPEN_MATCH descartada). */
const SOLO_SEARCH_WHERE = { status: 'SEARCHING' as const, OR: [{ proposal: { is: null } }, { proposal: { is: { status: { not: 'LOBBY' as const } } } }] };
/** Campos de cada fila de miembro/invitación que usan las operaciones de grupo. */
const MEMBER_SELECT = {
  id: true, searchId: true, status: true, playerIds: true, venueOptions: true,
  search: { select: { id: true, userId: true, sportId: true, categoryId: true, targetDate: true, slots: true, widenLevel: true, zoneKm: true, includeOpenMatches: true, queuedAt: true } },
} as const;

type SearchRow = {
  id: string; sportId: string; categoryId: string; targetDate: Date; slots: QuickMatchSlot[];
  widenLevel: boolean; zoneKm: number; includeOpenMatches: boolean;
  status: QuickMatchSearchDTO['status']; noMatchYet: boolean; dismissedMatchIds: string[];
  userId: string; invitedByAvailability: boolean;
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
    invitedByAvailability: _search.invitedByAvailability,
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

/** Un lobby no vence por tiempo: su `expiresAt` es el fin del día jugado. */
function lobbyExpiresAtSV(_targetDate: Date): Date {
  const END = new Date(_targetDate);
  END.setUTCDate(END.getUTCDate() + 1);
  return END;
}

function sameMembersSV(_a: string[], _b: string[]): boolean {
  return _a.length === _b.length && [..._a].sort().join() === [..._b].sort().join();
}

/** Orden estable de miembros: se respeta el orden previo de `playerIds` y los nuevos van al final. */
function orderMembersSV(_previousOrder: string[], _memberIds: string[]): string[] {
  return [..._previousOrder.filter((_id) => _memberIds.includes(_id)), ..._memberIds.filter((_id) => !_previousOrder.includes(_id))];
}

/**
 * Jugadores cuya disponibilidad guardada coincide con el alcance y que no
 * están en cola. Quien ya rechazó o dejó vencer una invitación o un ready
 * check ese día no vuelve a ser invitado.
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
  private async listVenueOptionsSV(_search: Pick<QuickMatchScope, 'sportId' | 'targetDate' | 'slots'>): Promise<QuickMatchVenueOption[]> {
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

  /**
   * Estado de un grupo NEW_GROUP sin partido. Fase LOBBY si tiene filas LOBBY;
   * si no, READY_CHECK con las filas PENDING/CONFIRMED de quienes no son
   * invitados. Las invitaciones por disponibilidad (PENDING de un invitado) no
   * son miembros hasta que aceptan (S12).
   */
  private async groupStateSV(_client: PrismaTransactionClientSV, _groupKey: string) {
    const ROWS = await _client.quickMatchProposal.findMany({
      where: { groupKey: _groupKey, matchId: null, status: { in: ['LOBBY', 'PENDING', 'CONFIRMED'] } },
      select: { ...MEMBER_SELECT, search: { select: { ...MEMBER_SELECT.search.select, invitedByAvailability: true } } },
      orderBy: [{ search: { queuedAt: 'asc' } }, { id: 'asc' }],
    });
    const LOBBY = ROWS.filter((_row) => _row.status === 'LOBBY');
    const INVITATIONS = ROWS.filter((_row) => _row.status === 'PENDING' && _row.search.invitedByAvailability);
    const READY_CHECK = ROWS.filter((_row) => _row.status !== 'LOBBY' && !_row.search.invitedByAvailability);
    if (LOBBY.length > 0) return { phase: 'LOBBY' as const, members: LOBBY, invitations: INVITATIONS };
    if (READY_CHECK.length > 0) return { phase: 'READY_CHECK' as const, members: READY_CHECK, invitations: INVITATIONS };
    return { phase: null, members: [], invitations: INVITATIONS };
  }

  /** Deja `playerIds` de miembros e invitaciones igual a los miembros actuales. */
  private async syncPlayerIdsSV(_tx: PrismaTransactionClientSV, _groupKey: string, _previousOrder: string[]): Promise<string[]> {
    const STATE = await this.groupStateSV(_tx, _groupKey);
    const PLAYER_IDS = orderMembersSV(_previousOrder, STATE.members.map((_member) => _member.search.userId));
    const ROW_IDS = [...STATE.members, ...STATE.invitations].map((_row) => _row.id);
    if (ROW_IDS.length > 0) await _tx.quickMatchProposal.updateMany({ where: { id: { in: ROW_IDS } }, data: { playerIds: PLAYER_IDS } });
    return PLAYER_IDS;
  }

  /**
   * Retira las invitaciones pendientes de un grupo (se llenó o dejó de existir):
   * se borra la búsqueda del invitado, que nunca pidió buscar, así no queda
   * bloqueado para otra invitación ese día. Quien llama ya tomó el lock del groupKey.
   */
  private async withdrawInvitationsSV(_tx: PrismaTransactionClientSV, _groupKey: string, _keep = 0): Promise<void> {
    //? `_keep`: cuántas invitaciones (las más antiguas) siguen en pie; nunca más que cupos libres
    const STATE = await this.groupStateSV(_tx, _groupKey);
    const WITHDRAWN = STATE.invitations.slice(Math.max(0, _keep));
    if (WITHDRAWN.length === 0) return;
    await _tx.quickMatchSearch.deleteMany({ where: { id: { in: WITHDRAWN.map((_row) => _row.searchId) }, invitedByAvailability: true, status: 'PROPOSAL' } });
  }

  /**
   * S5 (L7): saca del grupo solo a esos jugadores; el grupo NO se disuelve.
   * CANCELLED = rechazó o salió; EXPIRED = no aceptó a tiempo (también una
   * invitación vencida, S12). El resto sigue como estaba y el cupo queda libre
   * para `refillGroupSV`. Quien llama ya tomó el lock del groupKey.
   */
  private async removeMembersSV(_tx: PrismaTransactionClientSV, _groupKey: string, _members: Array<{ id: string; searchId: string; playerIds: string[] }>, _outcome: 'CANCELLED' | 'EXPIRED'): Promise<void> {
    if (_members.length === 0) return;
    //? 1. Marca la salida de esos jugadores
    await _tx.quickMatchProposal.updateMany({ where: { id: { in: _members.map((_member) => _member.id) } }, data: { status: _outcome === 'CANCELLED' ? 'DISMISSED' : 'EXPIRED' } });
    await _tx.quickMatchSearch.updateMany({ where: { id: { in: _members.map((_member) => _member.searchId) } }, data: _outcome === 'CANCELLED' ? { status: 'CANCELLED', noMatchYet: false } : { status: 'EXPIRED', noMatchYet: true } });
    //? 2. Los que quedan ven la lista de miembros actualizada (menos de 4 = buscando reemplazo);
    //? si no queda ningún miembro, las invitaciones pendientes ya no tienen grupo
    await this.syncPlayerIdsSV(_tx, _groupKey, _members[0]!.playerIds);
    if ((await this.groupStateSV(_tx, _groupKey)).phase === null) await this.withdrawInvitationsSV(_tx, _groupKey);
  }

  /**
   * S14: un miembro sale del lobby (CANCELLED) y el lobby sigue con el resto.
   * Si queda uno solo, para el cliente vuelve a buscar solo (lobby de 1, que el
   * controller muestra sin propuesta) y sus invitaciones siguen en pie. Si no
   * queda nadie, se retiran. Quien llama ya tomó el lock del groupKey.
   */
  private async leaveLobbySV(_tx: PrismaTransactionClientSV, _groupKey: string, _row: { id: string; searchId: string; playerIds: string[] }): Promise<void> {
    //? 1. Quien sale
    await _tx.quickMatchProposal.update({ where: { id: _row.id }, data: { status: 'DISMISSED' } });
    await _tx.quickMatchSearch.update({ where: { id: _row.searchId }, data: { status: 'CANCELLED', noMatchYet: false } });
    //? 2. No queda nadie: las invitaciones ya no tienen grupo
    const STATE = await this.groupStateSV(_tx, _groupKey);
    if (STATE.phase !== 'LOBBY') {
      await this.withdrawInvitationsSV(_tx, _groupKey);
      return;
    }
    //? 3. Siguen 1 a 3: ven la lista actualizada; el que quedó solo vuelve a "sin partida todavía"
    await this.syncPlayerIdsSV(_tx, _groupKey, _row.playerIds);
    if (STATE.members.length === 1) await _tx.quickMatchSearch.update({ where: { id: STATE.members[0]!.searchId }, data: { noMatchYet: true } });
  }

  /**
   * S2: el lobby llegó a 4 → ready check para los 4 a la vez, todos PENDING con
   * el mismo vencimiento y las opciones de sede del miembro más antiguo. Las
   * invitaciones pendientes se retiran. Quien llama ya tomó el lock del groupKey.
   */
  private async startReadyCheckSV(_tx: PrismaTransactionClientSV, _groupKey: string, _expiresAt: Date): Promise<void> {
    const STATE = await this.groupStateSV(_tx, _groupKey);
    if (STATE.phase !== 'LOBBY' || STATE.members.length !== GROUP_SIZE) return;
    const VENUE_OPTIONS = await this.listVenueOptionsSV(STATE.members[0]!.search);
    await _tx.quickMatchProposal.updateMany({ where: { id: { in: STATE.members.map((_member) => _member.id) } }, data: { status: 'PENDING', expiresAt: _expiresAt, venueOptions: VENUE_OPTIONS } });
    await _tx.quickMatchSearch.updateMany({ where: { id: { in: STATE.members.map((_member) => _member.searchId) } }, data: { status: 'PROPOSAL', noMatchYet: false } });
    await this.withdrawInvitationsSV(_tx, _groupKey);
    await this.syncPlayerIdsSV(_tx, _groupKey, STATE.members[0]!.playerIds);
  }

  /**
   * Buscadores disponibles para sumarse a un grupo, los más antiguos en la cola
   * (S6): en SEARCHING sin lobby, o solos en su lobby de 1. Quien llama ya tomó
   * el lock del alcance.
   */
  private async findAvailableSearchersSV(_tx: PrismaTransactionClientSV, _scope: QuickMatchScope, _excludedUserIds: string[], _take: number) {
    if (_take <= 0) return [];
    const ROWS = await _tx.quickMatchSearch.findMany({
      where: { sportId: _scope.sportId, categoryId: _scope.categoryId, targetDate: _scope.targetDate, slots: { hasSome: _scope.slots }, userId: { notIn: _excludedUserIds }, status: 'SEARCHING' },
      orderBy: [{ queuedAt: 'asc' }, { id: 'asc' }], take: 40,
      select: { id: true, userId: true, proposal: { select: { status: true, groupKey: true, playerIds: true } } },
    });
    return ROWS.filter((_row) => _row.proposal === null || _row.proposal.status !== 'LOBBY' || _row.proposal.playerIds.length <= 1).slice(0, _take);
  }

  /** Sale de su grupo actual (lobby, invitación o ready check sin partido) como CANCELLED. */
  private async leaveCurrentGroupSV(_tx: PrismaTransactionClientSV, _search: { id: string; invitedByAvailability: boolean; proposal: SearchRow['proposal'] }): Promise<void> {
    const PROPOSAL = _search.proposal;
    if (PROPOSAL === null || PROPOSAL.groupKey === null || PROPOSAL.matchId !== null) return;
    if (PROPOSAL.status === 'LOBBY') {
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROPOSAL.groupKey}))`;
      await this.leaveLobbySV(_tx, PROPOSAL.groupKey, { ...PROPOSAL, searchId: _search.id });
    } else if (PROPOSAL.status === 'PENDING' && _search.invitedByAvailability) {
      //? Invitación sin aceptar: no es miembro, solo se rechaza
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROPOSAL.groupKey}))`;
      await _tx.quickMatchProposal.update({ where: { id: PROPOSAL.id }, data: { status: 'DISMISSED' } });
      await _tx.quickMatchSearch.update({ where: { id: _search.id }, data: { status: 'CANCELLED', noMatchYet: false } });
    } else if (ACTIVE_PROPOSAL_STATUSES.includes(PROPOSAL.status as 'PENDING')) {
      //? Ready check: sale solo este jugador y su cupo se repone (S5)
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROPOSAL.groupKey}))`;
      await this.removeMembersSV(_tx, PROPOSAL.groupKey, [{ ...PROPOSAL, searchId: _search.id }], 'CANCELLED');
    }
  }

  async startForUserSV(_userId: string, _input: StartQuickMatchInput): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      //? 1. Si estaba en un lobby, una invitación o un ready check sin partido,
      //? iniciar otra búsqueda equivale a salir de ese grupo (S5/S14)
      const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      if (CURRENT !== null) await this.leaveCurrentGroupSV(_tx, CURRENT);
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
      //? Un buscador solo (lobby de 1) que acepta ver la partida abierta deja su lobby:
      //? sus invitaciones por disponibilidad se retiran. Con más miembros no se ofrece.
      const CURRENT = await _tx.quickMatchProposal.findUnique({ where: { searchId: _searchId }, select: { status: true, groupKey: true } });
      if (CURRENT?.status === 'LOBBY' && CURRENT.groupKey !== null) {
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${CURRENT.groupKey}))`;
        if ((await this.groupStateSV(_tx, CURRENT.groupKey)).members.length > 1) return null;
        await this.withdrawInvitationsSV(_tx, CURRENT.groupKey);
      }
      await _tx.quickMatchProposal.upsert({ where: { searchId: _searchId }, create: { searchId: _searchId, type: 'OPEN_MATCH', matchId: _candidate.matchId, playerIds: _candidate.participantIds, expiresAt: _expiresAt }, update: { type: 'OPEN_MATCH', status: 'PENDING', groupKey: null, matchId: _candidate.matchId, playerIds: _candidate.participantIds, expiresAt: _expiresAt } });
      return _tx.quickMatchSearch.update({ where: { id: _searchId }, data: { status: 'PROPOSAL', noMatchYet: false }, include: SEARCH_INCLUDE });
    });
    return SEARCH === null ? null : toSearchDTOSV(PRISMA, SEARCH);
  }

  /**
   * S1: junta al buscador con el buscador solo compatible más antiguo en un
   * lobby nuevo, sin aceptación (los dos tocaron "buscar"). Sin compañero arma
   * un lobby de 1 (para el cliente sigue "solo", sin propuesta) desde el que se
   * invita por disponibilidad (S12). Bajo el lock del alcance: dos buscadores
   * que llegan a la vez terminan en un mismo lobby.
   */
  async formLobbySV(_search: QuickMatchSearchDTO): Promise<QuickMatchRefillDTO | null> {
    return PRISMA.$transaction(async (_tx) => {
      //? 1. Lock del alcance y revalidación: sigue solo y en cola
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scopeKeySV(_search)}))`;
      const OWN = await _tx.quickMatchSearch.findFirst({ where: { id: _search.id, ...SOLO_SEARCH_WHERE }, select: { id: true, userId: true, targetDate: true } });
      if (OWN === null) return null;
      //? Si entretanto apareció un grupo con cupo, no se arma otro: hay que sumarse a ese
      //? (si no, dos buscadores que llegan a la vez podían formar dos lobbies de 2).
      if (await this.openGroupKeySV(_tx, _search) !== null) return null;
      //? 2. Compañero: el buscador solo compatible que lleva más tiempo en la cola (S6)
      const PARTNER = await _tx.quickMatchSearch.findFirst({
        where: { id: { not: OWN.id }, sportId: _search.sportId, categoryId: _search.categoryId, targetDate: _search.targetDate, slots: { hasSome: _search.slots }, ...SOLO_SEARCH_WHERE },
        orderBy: [{ queuedAt: 'asc' }, { id: 'asc' }], select: { id: true, userId: true },
      });
      //? 3. Lobby nuevo: con el compañero (el más antiguo primero) o de 1
      const GROUP_KEY = randomUUID();
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${GROUP_KEY}))`;
      const MEMBERS = PARTNER === null ? [OWN] : [PARTNER, OWN];
      const PLAYER_IDS = MEMBERS.map((_member) => _member.userId);
      for (const MEMBER of MEMBERS) {
        const DATA = { type: 'NEW_GROUP' as const, status: 'LOBBY' as const, groupKey: GROUP_KEY, playerIds: PLAYER_IDS, venueOptions: [], expiresAt: lobbyExpiresAtSV(OWN.targetDate), matchId: null };
        await _tx.quickMatchProposal.upsert({ where: { searchId: MEMBER.id }, create: { searchId: MEMBER.id, ...DATA }, update: DATA });
      }
      await _tx.quickMatchSearch.updateMany({ where: { id: { in: MEMBERS.map((_member) => _member.id) } }, data: { noMatchYet: PARTNER === null } });
      return { groupKey: GROUP_KEY, categoryId: _search.categoryId, phase: 'LOBBY', addedUserIds: [OWN.userId], invitedUserIds: [], memberUserIds: PLAYER_IDS, readyCheckStarted: false, notifySearchId: OWN.id };
    });
  }

  async findOpenGroupKeySV(_search: QuickMatchSearchDTO): Promise<string | null> {
    return this.openGroupKeySV(PRISMA, _search);
  }

  /**
   * Grupos sin partido del mismo alcance con algún miembro de franja compatible.
   * Primero un ready check con cupo (tiene el reloj corriendo), después el lobby
   * más antiguo con cupo (S1).
   */
  private async openGroupKeySV(_client: PrismaTransactionClientSV, _search: Pick<QuickMatchSearchDTO, 'sportId' | 'categoryId' | 'targetDate' | 'slots'>): Promise<string | null> {
    const ROWS = await _client.quickMatchProposal.findMany({
      where: { type: 'NEW_GROUP', groupKey: { not: null }, status: { in: ['LOBBY', 'PENDING', 'CONFIRMED'] }, matchId: null, search: { sportId: _search.sportId, categoryId: _search.categoryId, targetDate: _search.targetDate, slots: { hasSome: _search.slots }, invitedByAvailability: false } },
      orderBy: { createdAt: 'asc' }, take: 40, select: { groupKey: true },
    });
    let openLobby: string | null = null;
    for (const GROUP_KEY of [...new Set(ROWS.map((_row) => _row.groupKey!))]) {
      const STATE = await this.groupStateSV(_client, GROUP_KEY);
      if (STATE.phase === null || STATE.members.length >= GROUP_SIZE) continue;
      if (STATE.phase === 'READY_CHECK') return GROUP_KEY;
      openLobby ??= GROUP_KEY;
    }
    return openLobby;
  }

  /**
   * Suma jugadores a los cupos libres de un grupo, compatibles con su miembro
   * más antiguo:
   * 1. Buscadores solos, por `queuedAt`: en un lobby entran directo como LOBBY
   *    (S1); en un ready check entran PENDING con vencimiento nuevo (S5).
   * 2. Si siguen faltando, invitaciones por disponibilidad: no son miembros
   *    hasta que aceptan (S12). Nunca más invitaciones que cupos libres.
   * Un lobby que llega a 4 arranca el ready check (S2).
   * Locks: alcance → groupKey → usuarios invitados en orden fijo, igual que el
   * resto de los caminos que suman jugadores, así nadie queda en dos grupos ni
   * un grupo pasa de 4. Devuelve null si no cambió nada.
   */
  async refillGroupSV(_groupKey: string, _expiresAt: Date): Promise<QuickMatchRefillDTO | null> {
    //? 1. Chequeo barato sin locks
    const PREVIEW = await this.groupStateSV(PRISMA, _groupKey);
    if (PREVIEW.phase === null || PREVIEW.members.length >= GROUP_SIZE) return null;
    const ANCHOR = PREVIEW.members[0]!.search;
    return PRISMA.$transaction(async (_tx) => {
      //? 2. Locks: alcance, después el grupo; se relee todo bajo el lock
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scopeKeySV(ANCHOR)}))`;
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${_groupKey}))`;
      const STATE = await this.groupStateSV(_tx, _groupKey);
      if (STATE.phase === null || STATE.members.length >= GROUP_SIZE) return null;
      const PHASE = STATE.phase;
      const MEMBER_IDS = STATE.members.map((_member) => _member.search.userId);
      const INVITATION_USER_IDS = STATE.invitations.map((_row) => _row.search.userId);
      const PREVIOUS_ORDER = STATE.members[0]!.playerIds;
      let openSlots = GROUP_SIZE - STATE.members.length;
      //? 3. Buscadores solos (también solos en su lobby de 1), los más antiguos en la cola
      const SEARCHERS = await this.findAvailableSearchersSV(_tx, ANCHOR, MEMBER_IDS, openSlots);
      for (const SEARCHER of SEARCHERS) {
        //? Venía de su lobby de 1: sus invitaciones se retiran (mismo alcance, ya bajo su lock)
        const OLD_GROUP_KEY = SEARCHER.proposal?.status === 'LOBBY' ? SEARCHER.proposal.groupKey : null;
        if (OLD_GROUP_KEY !== null && OLD_GROUP_KEY !== _groupKey) {
          await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${OLD_GROUP_KEY}))`;
          await this.withdrawInvitationsSV(_tx, OLD_GROUP_KEY);
        }
        const DATA = PHASE === 'LOBBY'
          ? { type: 'NEW_GROUP' as const, status: 'LOBBY' as const, groupKey: _groupKey, playerIds: [], venueOptions: [], expiresAt: lobbyExpiresAtSV(ANCHOR.targetDate), matchId: null }
          : { type: 'NEW_GROUP' as const, status: 'PENDING' as const, groupKey: _groupKey, playerIds: [], venueOptions: STATE.members[0]!.venueOptions ?? [], expiresAt: _expiresAt, matchId: null };
        await _tx.quickMatchProposal.upsert({ where: { searchId: SEARCHER.id }, create: { searchId: SEARCHER.id, ...DATA }, update: DATA });
      }
      if (SEARCHERS.length > 0) await _tx.quickMatchSearch.updateMany({ where: { id: { in: SEARCHERS.map((_searcher) => _searcher.id) } }, data: PHASE === 'LOBBY' ? { noMatchYet: false } : { status: 'PROPOSAL', noMatchYet: false } });
      openSlots -= SEARCHERS.length;
      //? 4. Lleno: un lobby arranca el ready check; las invitaciones pendientes se retiran
      let readyCheckStarted = false;
      if (openSlots === 0 && PHASE === 'LOBBY') {
        await this.syncPlayerIdsSV(_tx, _groupKey, PREVIOUS_ORDER);
        await this.startReadyCheckSV(_tx, _groupKey, _expiresAt);
        readyCheckStarted = true;
      } else if (STATE.invitations.length > openSlots) {
        //? Nunca más invitaciones abiertas que cupos libres: un buscador que entró
        //? ocupa el lugar de la invitación más nueva, que se retira
        await this.withdrawInvitationsSV(_tx, _groupKey, openSlots);
      }
      //? 5. Faltan jugadores: invitaciones por disponibilidad, sin pasar de los cupos libres
      const INVITED: Array<{ id: string; userId: string }> = [];
      const INVITE_COUNT = openSlots - STATE.invitations.length;
      const INVITEE_IDS = INVITE_COUNT <= 0 ? [] : (await findAvailabilityInviteeIdsSV(_tx, ANCHOR, [...MEMBER_IDS, ...INVITATION_USER_IDS, ...SEARCHERS.map((_searcher) => _searcher.userId)], INVITE_COUNT)).sort();
      for (const USER_ID of INVITEE_IDS) {
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`quick-match-user:${USER_ID}`}))`;
        const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: USER_ID }, select: { status: true } });
        if (CURRENT !== null && ACTIVE_SEARCH_STATUSES.includes(CURRENT.status as 'SEARCHING')) continue;
        const INVITED_SEARCH = await _tx.quickMatchSearch.upsert({
          where: { userId: USER_ID },
          create: { userId: USER_ID, sportId: ANCHOR.sportId, categoryId: ANCHOR.categoryId, targetDate: ANCHOR.targetDate, slots: ANCHOR.slots, widenLevel: ANCHOR.widenLevel, zoneKm: ANCHOR.zoneKm, includeOpenMatches: ANCHOR.includeOpenMatches, dismissedMatchIds: [], status: 'PROPOSAL', invitedByAvailability: true },
          update: { sportId: ANCHOR.sportId, categoryId: ANCHOR.categoryId, targetDate: ANCHOR.targetDate, slots: ANCHOR.slots, widenLevel: ANCHOR.widenLevel, zoneKm: ANCHOR.zoneKm, includeOpenMatches: ANCHOR.includeOpenMatches, status: 'PROPOSAL', noMatchYet: false, dismissedMatchIds: [], queuedAt: new Date(), invitedByAvailability: true },
          select: { id: true, userId: true },
        });
        const DATA = { type: 'NEW_GROUP' as const, status: 'PENDING' as const, groupKey: _groupKey, playerIds: [], venueOptions: [], expiresAt: _expiresAt, matchId: null };
        await _tx.quickMatchProposal.upsert({ where: { searchId: INVITED_SEARCH.id }, create: { searchId: INVITED_SEARCH.id, ...DATA }, update: DATA });
        INVITED.push(INVITED_SEARCH);
      }
      //? 6. Todos ven los miembros actuales. Solo se escribe si algo cambió o si
      //? playerIds quedó desactualizado (grupos heredados), no en cada lectura.
      const STALE = [...STATE.members, ...STATE.invitations].some((_row) => !sameMembersSV(_row.playerIds, MEMBER_IDS)) || STATE.invitations.length > openSlots;
      if (SEARCHERS.length === 0 && INVITED.length === 0 && !STALE) return null;
      const MEMBER_USER_IDS = readyCheckStarted ? (await this.groupStateSV(_tx, _groupKey)).members[0]!.playerIds : await this.syncPlayerIdsSV(_tx, _groupKey, PREVIOUS_ORDER);
      return {
        groupKey: _groupKey, categoryId: ANCHOR.categoryId, phase: readyCheckStarted ? 'READY_CHECK' : PHASE,
        addedUserIds: SEARCHERS.map((_searcher) => _searcher.userId), invitedUserIds: INVITED.map((_invited) => _invited.userId),
        memberUserIds: MEMBER_USER_IDS, readyCheckStarted, notifySearchId: STATE.members[0]!.searchId,
      };
    });
  }

  async markNoMatchYetSV(_searchId: string): Promise<QuickMatchSearchDTO> {
    //? Solo marca si sigue solo en la cola: otro buscador pudo meterlo en un lobby o un
    //? ready check entretanto, y en ese caso se devuelve ese estado.
    await PRISMA.quickMatchSearch.updateMany({ where: { id: _searchId, ...SOLO_SEARCH_WHERE }, data: { noMatchYet: true } });
    const SEARCH = await PRISMA.quickMatchSearch.findUniqueOrThrow({ where: { id: _searchId }, include: SEARCH_INCLUDE });
    return toSearchDTOSV(PRISMA, SEARCH);
  }

  async dismissProposalForUserSV(_userId: string): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      if (CURRENT?.proposal === null || CURRENT === null || !ACTIVE_PROPOSAL_STATUSES.includes(CURRENT.proposal.status as 'PENDING')) throw new AppError('PROPUESTA_NO_DISPONIBLE', 'No hay una propuesta activa para descartar.', 409);
      if (CURRENT.proposal.groupKey !== null && CURRENT.invitedByAvailability && CURRENT.proposal.status === 'PENDING') {
        //? 0. Invitación por disponibilidad rechazada: sale de la cola (CANCELLED) y no
        //? vuelve a ser invitado ese día (S12). No era miembro: el grupo no cambia.
        await this.leaveCurrentGroupSV(_tx, CURRENT);
        return _tx.quickMatchSearch.findUniqueOrThrow({ where: { id: CURRENT.id }, include: SEARCH_INCLUDE });
      }
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

  /**
   * ¿Aceptaron los 4 miembros del ready check? Recién ahí se crea el partido y
   * se reserva la primera cancha libre (S4). Quien llama ya tomó el lock del groupKey.
   */
  private async finalizeIfAllConfirmedSV(_tx: PrismaTransactionClientSV, _groupKey: string, _scope: { sportId: string; categoryId: string }, _previousOrder: string[], _venueSelection?: QuickMatchVenueSelectionDTO): Promise<void> {
    //? 1. Miembros actuales (las invitaciones pendientes no cuentan)
    const STATE = await this.groupStateSV(_tx, _groupKey);
    if (STATE.phase !== 'READY_CHECK') return;
    const ALL_CONFIRMED = STATE.members.length === GROUP_SIZE && STATE.members.every((_member) => _member.status === 'CONFIRMED');
    if (!ALL_CONFIRMED) return;
    //? Los jugadores del partido son los miembros actuales (no un snapshot viejo de playerIds)
    const PLAYER_IDS = orderMembersSV(_previousOrder, STATE.members.map((_member) => _member.search.userId));
    if (new Set(PLAYER_IDS).size !== GROUP_SIZE) {
      throw new AppError('PROPUESTA_INVALIDA', 'La propuesta grupal no tiene cuatro jugadores válidos.', 409);
    }
    //? 2. Cancha automática (S4); sin opción libre el partido queda sin cancha
    const OPTIONS = STATE.members.map((_member) => _member.venueOptions).find((_options) => Array.isArray(_options) && _options.length > 0) as QuickMatchVenueOption[] | undefined ?? [];
    const OPTION = await this.pickVenueOptionSV(_tx, OPTIONS, _venueSelection);
    const SCHEDULED_AT = OPTION === undefined ? null : new Date(OPTION.scheduledAt);
    const MATCH = await _tx.match.create({
      data: {
        sportId: _scope.sportId,
        categoryId: _scope.categoryId,
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
          sportId: _scope.sportId,
          categoryId: _scope.categoryId,
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
    //? 3. El partido queda visible para los 4 miembros; invitaciones sueltas se retiran
    await _tx.quickMatchProposal.updateMany({ where: { id: { in: STATE.members.map((_member) => _member.id) } }, data: { matchId: MATCH.id } });
    await this.withdrawInvitationsSV(_tx, _groupKey);
  }

  /**
   * S12: el invitado acepta. En un lobby entra como miembro LOBBY (y si con él
   * son 4, arranca el ready check); en un ready check con cupo entra aceptado.
   * Si el grupo ya no tiene lugar, la invitación ya no está disponible.
   * Locks: alcance → groupKey, igual que los demás caminos que suman jugadores.
   */
  private async acceptInvitationSV(_tx: PrismaTransactionClientSV, _current: SearchRow & { proposal: NonNullable<SearchRow['proposal']> }, _groupKey: string, _venueSelection?: QuickMatchVenueSelectionDTO): Promise<void> {
    await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scopeKeySV(_current)}))`;
    await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${_groupKey}))`;
    //? 1. Revalida bajo el lock: la invitación pudo vencer o retirarse
    const OWN = await _tx.quickMatchProposal.findUnique({ where: { id: _current.proposal.id }, select: { status: true } });
    const STATE = await this.groupStateSV(_tx, _groupKey);
    if (OWN?.status !== 'PENDING' || STATE.phase === null || STATE.members.length >= GROUP_SIZE) {
      throw new AppError('PROPUESTA_NO_DISPONIBLE', 'La invitación ya no está disponible.', 409);
    }
    const PREVIOUS_ORDER = STATE.members[0]!.playerIds;
    if (STATE.phase === 'LOBBY') {
      //? 2a. Lobby: entra como miembro; con él son 4 → ready check (S2)
      await _tx.quickMatchProposal.update({ where: { id: _current.proposal.id }, data: { status: 'LOBBY', expiresAt: lobbyExpiresAtSV(_current.targetDate) } });
      await _tx.quickMatchSearch.update({ where: { id: _current.id }, data: { status: 'SEARCHING', noMatchYet: false, invitedByAvailability: false } });
      await this.syncPlayerIdsSV(_tx, _groupKey, PREVIOUS_ORDER);
      if (STATE.members.length + 1 === GROUP_SIZE) await this.startReadyCheckSV(_tx, _groupKey, new Date(Date.now() + QUICK_MATCH_HOLD_MS));
      return;
    }
    //? 2b. Ready check con cupo: entra ya aceptado y, si son 4 aceptados, se crea el partido
    await _tx.quickMatchProposal.update({ where: { id: _current.proposal.id }, data: { status: 'CONFIRMED', venueOptions: STATE.members[0]!.venueOptions ?? [] } });
    await _tx.quickMatchSearch.update({ where: { id: _current.id }, data: { status: 'CONFIRMED', noMatchYet: false, invitedByAvailability: false } });
    await this.syncPlayerIdsSV(_tx, _groupKey, PREVIOUS_ORDER);
    if (STATE.members.length + 1 === GROUP_SIZE) await this.withdrawInvitationsSV(_tx, _groupKey);
    await this.finalizeIfAllConfirmedSV(_tx, _groupKey, _current, PREVIOUS_ORDER, _venueSelection);
  }

  async confirmProposalForUserSV(_userId: string, _venueSelection?: QuickMatchVenueSelectionDTO): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      if (CURRENT?.proposal === null || CURRENT === null || CURRENT.proposal.status !== 'PENDING') throw new AppError('PROPUESTA_NO_DISPONIBLE', 'No hay una propuesta activa para confirmar.', 409);
      const GROUP_KEY = CURRENT.proposal.groupKey;
      //? 0. Invitación por disponibilidad (S12)
      if (GROUP_KEY !== null && CURRENT.invitedByAvailability) {
        await this.acceptInvitationSV(_tx, { ...CURRENT, proposal: CURRENT.proposal }, GROUP_KEY, _venueSelection);
        return _tx.quickMatchSearch.findUniqueOrThrow({ where: { id: CURRENT.id }, include: SEARCH_INCLUDE });
      }
      if (GROUP_KEY !== null) {
        //? 1. Revalida bajo el lock del grupo: pudo cambiar entre la lectura y el lock
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${GROUP_KEY}))`;
        const OWN = await _tx.quickMatchProposal.findUnique({ where: { id: CURRENT.proposal.id }, select: { status: true } });
        if (OWN?.status !== 'PENDING') throw new AppError('PROPUESTA_NO_DISPONIBLE', 'No hay una propuesta activa para confirmar.', 409);
      }
      //? 2. Solo este jugador acepta (S3)
      await _tx.quickMatchProposal.update({ where: { id: CURRENT.proposal.id }, data: { status: 'CONFIRMED' } });
      //? 3. ¿Aceptaron los 4? Recién ahí se crea el partido (S4)
      if (GROUP_KEY !== null) await this.finalizeIfAllConfirmedSV(_tx, GROUP_KEY, CURRENT, CURRENT.proposal.playerIds, _venueSelection);
      //? 4. Quien aceptó queda CONFIRMED esperando al resto (matchId null hasta el 4º)
      return _tx.quickMatchSearch.update({ where: { id: CURRENT.id }, data: { status: 'CONFIRMED', noMatchYet: false }, include: SEARCH_INCLUDE });
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
      //? Salir de un lobby (S14), de una invitación (S12) o de un ready check (S5):
      //? sale solo este jugador y el grupo sigue con el resto.
      if (CURRENT.proposal !== null && CURRENT.proposal.groupKey !== null) {
        await this.leaveCurrentGroupSV(_tx, CURRENT);
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
        //? (también quien ya aceptó o un miembro del lobby). Solo salen los PENDING
        //? vencidos (ready check o invitación, S5/S12); el resto sigue.
        if (!['LOBBY', 'PENDING', 'CONFIRMED'].includes(SEARCH.proposal.status) || SEARCH.proposal.matchId !== null) return;
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
