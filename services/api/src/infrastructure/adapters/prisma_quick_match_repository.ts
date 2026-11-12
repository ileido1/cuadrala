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
  //? 1. OPEN_MATCH o sin propuesta: no hay ready check, el conteo es 0
  const GROUP_KEY = _search.proposal?.type === 'NEW_GROUP' ? _search.proposal.groupKey : null;
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

  /**
   * Disuelve un ready check NEW_GROUP que no llegó a partido. Quien llama ya
   * tomó el advisory lock del groupKey.
   * - Vuelven a SEARCHING quienes aceptaron y, si alguien rechazó o salió
   *   (`_leaverSearchId`), también quienes buscaban de verdad aunque no hubieran
   *   respondido. Volver a la cola nunca toca `queuedAt`: se conserva la posición.
   * - Quien rechazó o salió queda CANCELLED.
   * - El resto sale de la cola: EXPIRED si venció el plazo (`null`), CANCELLED
   *   si otro rechazó (solo puede ser un invitado por disponibilidad que no aceptó).
   */
  private async dissolveGroupSV(_tx: PrismaTransactionClientSV, _groupKey: string, _leaverSearchId: string | null): Promise<void> {
    //? 1. Miembros activos del grupo que todavía no tienen partido
    const GROUP = await _tx.quickMatchProposal.findMany({
      where: { groupKey: _groupKey, status: { in: ACTIVE_PROPOSAL_STATUSES }, matchId: null },
      select: { id: true, searchId: true, status: true, search: { select: { invitedByAvailability: true } } },
    });
    //? 2. Clasifica: quien se va, quien vuelve a la cola y quien queda fuera
    const DECLINED = _leaverSearchId !== null;
    const LEAVER = GROUP.find((_member) => _member.searchId === _leaverSearchId);
    const REQUEUED = GROUP.filter((_member) => _member !== LEAVER && (_member.status === 'CONFIRMED' || (DECLINED && !_member.search.invitedByAvailability)));
    const DROPPED = GROUP.filter((_member) => _member !== LEAVER && !REQUEUED.includes(_member));
    //? 3. Quien rechazó o salió: propuesta DISMISSED y búsqueda CANCELLED
    if (LEAVER !== undefined) {
      await _tx.quickMatchProposal.update({ where: { id: LEAVER.id }, data: { status: 'DISMISSED' } });
      await _tx.quickMatchSearch.update({ where: { id: LEAVER.searchId }, data: { status: 'CANCELLED', noMatchYet: false } });
    }
    //? 4. Vuelven a la cola sin propuesta (la fila se borra, igual que al iniciar una búsqueda)
    if (REQUEUED.length > 0) {
      await _tx.quickMatchProposal.deleteMany({ where: { id: { in: REQUEUED.map((_member) => _member.id) } } });
      await _tx.quickMatchSearch.updateMany({ where: { id: { in: REQUEUED.map((_member) => _member.searchId) } }, data: { status: 'SEARCHING', noMatchYet: false } });
    }
    //? 5. Quedan fuera de la cola: no aceptaron a tiempo (EXPIRED) o eran invitados
    //? pendientes de un grupo que otro rechazó (CANCELLED)
    if (DROPPED.length > 0) {
      await _tx.quickMatchProposal.updateMany({ where: { id: { in: DROPPED.map((_member) => _member.id) } }, data: { status: DECLINED ? 'DISMISSED' : 'EXPIRED' } });
      await _tx.quickMatchSearch.updateMany({ where: { id: { in: DROPPED.map((_member) => _member.searchId) } }, data: DECLINED ? { status: 'CANCELLED', noMatchYet: false } : { status: 'EXPIRED', noMatchYet: true } });
    }
  }

  async startForUserSV(_userId: string, _input: StartQuickMatchInput): Promise<QuickMatchSearchDTO> {
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      //? 1. Si estaba en un ready check sin partido, iniciar otra búsqueda equivale a rechazarlo
      const CURRENT = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      const GROUP_KEY = CURRENT?.proposal?.groupKey ?? null;
      if (CURRENT !== null && GROUP_KEY !== null && CURRENT.proposal !== null && ACTIVE_PROPOSAL_STATUSES.includes(CURRENT.proposal.status as 'PENDING') && CURRENT.proposal.matchId === null) {
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${GROUP_KEY}))`;
        await this.dissolveGroupSV(_tx, GROUP_KEY, CURRENT.id);
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
    //? 1. Dueño de la búsqueda y día de la semana para cruzar con la disponibilidad guardada
    const OWNER = await PRISMA.quickMatchSearch.findUnique({ where: { id: _search.id }, select: { userId: true } });
    if (OWNER === null) return null;
    const DAY_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][_search.targetDate.getUTCDay()]!;
    //? 2. Otros jugadores en cola compatibles, los más antiguos primero (S6: `queuedAt`,
    //? no `updatedAt`, que cambia en cada escritura). Nunca se suma a un grupo existente:
    //? quien ya está en un ready check no está en SEARCHING.
    const ACTIVE_SEARCHES = await PRISMA.quickMatchSearch.findMany({
      where: { id: { not: _search.id }, sportId: _search.sportId, categoryId: _search.categoryId, targetDate: _search.targetDate, status: 'SEARCHING', slots: { hasSome: _search.slots } },
      orderBy: [{ queuedAt: 'asc' }, { id: 'asc' }], take: GROUP_SIZE - 1, select: { id: true, userId: true },
    });
    const ACTIVE_USER_IDS = ACTIVE_SEARCHES.map((_candidate) => _candidate.userId);
    //? 3. Completa con jugadores cuya disponibilidad coincide, solo los que faltan.
    //? Quien ya rechazó o dejó vencer un ready check ese día no vuelve a ser invitado.
    const SLOTS_LEFT = GROUP_SIZE - 1 - ACTIVE_USER_IDS.length;
    const INVITATION_USER_IDS = SLOTS_LEFT <= 0 ? [] : (await PRISMA.userAvailability.findMany({
      where: {
        dayOfWeek: DAY_OF_WEEK as never, slot: { in: _search.slots },
        user: {
          is: {
            id: { notIn: [OWNER.userId, ...ACTIVE_USER_IDS] },
            sportCategories: { some: { sportId: _search.sportId, categoryId: _search.categoryId } },
            OR: [{ quickMatchSearch: { is: null } }, { quickMatchSearch: { is: { status: { notIn: ACTIVE_SEARCH_STATUSES }, targetDate: { not: _search.targetDate } } } }],
          },
        },
      }, distinct: ['userId'], orderBy: { createdAt: 'asc' }, take: SLOTS_LEFT, select: { userId: true },
    })).map((_availability) => _availability.userId);
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
    const SCOPE_KEY = `${_search.sportId}:${_search.categoryId}:${_search.targetDate.toISOString()}`;
    const SEARCH = await PRISMA.$transaction(async (_tx) => {
      //? 1. Serializa la formación de grupos del mismo deporte/categoría/fecha
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
        //? 1. NEW_GROUP: rechazar disuelve el ready check (S5); se revalida bajo el lock
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${CURRENT.proposal.groupKey}))`;
        const OWN = await _tx.quickMatchProposal.findUnique({ where: { id: CURRENT.proposal.id }, select: { status: true, matchId: true } });
        if (OWN === null || !ACTIVE_PROPOSAL_STATUSES.includes(OWN.status as 'PENDING') || OWN.matchId !== null) throw new AppError('PROPUESTA_NO_DISPONIBLE', 'No hay una propuesta activa para descartar.', 409);
        await this.dissolveGroupSV(_tx, CURRENT.proposal.groupKey, CURRENT.id);
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
          select: { id: true, searchId: true, status: true, matchId: true },
        });
        const PLAYER_IDS = CURRENT.proposal.playerIds;
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
      //? Salir durante un ready check equivale a rechazarlo: el grupo se disuelve
      //? y el resto vuelve a la cola (S5), en vez de quedar con un cupo fantasma.
      if (CURRENT.proposal !== null && ACTIVE_PROPOSAL_STATUSES.includes(CURRENT.proposal.status as 'PENDING') && CURRENT.proposal.groupKey !== null) {
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${CURRENT.proposal.groupKey}))`;
        await this.dissolveGroupSV(_tx, CURRENT.proposal.groupKey, CURRENT.id);
      } else if (CURRENT.proposal !== null && ACTIVE_PROPOSAL_STATUSES.includes(CURRENT.proposal.status as 'PENDING')) {
        await _tx.quickMatchProposal.update({ where: { id: CURRENT.proposal.id }, data: { status: 'DISMISSED' } });
      }
      await _tx.quickMatchSearch.update({ where: { id: CURRENT.id }, data: { status: 'CANCELLED' } });
    });
  }

  private async expireProposalForUserSV(_userId: string): Promise<void> {
    await PRISMA.$transaction(async (_tx) => {
      const SEARCH = await _tx.quickMatchSearch.findUnique({ where: { userId: _userId }, include: SEARCH_INCLUDE });
      if (SEARCH?.proposal === null || SEARCH === null || SEARCH.proposal.expiresAt > new Date()) return;
      const GROUP_KEY = SEARCH.proposal.groupKey;
      if (GROUP_KEY !== null) {
        //? 1. NEW_GROUP: el vencimiento se resuelve para todo el grupo, lo lea quien lo lea
        //? (también quien ya aceptó). Un grupo con partido ya no vence.
        if (!ACTIVE_PROPOSAL_STATUSES.includes(SEARCH.proposal.status as 'PENDING') || SEARCH.proposal.matchId !== null) return;
        await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${GROUP_KEY}))`;
        const PENDING = await _tx.quickMatchProposal.count({ where: { groupKey: GROUP_KEY, status: 'PENDING', matchId: null, expiresAt: { lte: new Date() } } });
        if (PENDING === 0) return;
        await this.dissolveGroupSV(_tx, GROUP_KEY, null);
        return;
      }
      //? 2. OPEN_MATCH: vence solo la oferta de este jugador (sin cambios)
      if (SEARCH.proposal.status !== 'PENDING') return;
      await _tx.quickMatchProposal.update({ where: { id: SEARCH.proposal.id }, data: { status: 'EXPIRED' } });
      await _tx.quickMatchSearch.update({ where: { id: SEARCH.id }, data: { status: 'EXPIRED', noMatchYet: true } });
    });
  }
}
