import { AppError } from '../../domain/errors/app_error.js';
import { collapsePairsToCompetitorsSV } from '../../domain/tournament/tournament_pairing.js';
import type { CreateTournamentNotificationEventUseCase } from './create_tournament_notification_event.use_case.js';
import type { ReserveTournamentScheduleSlotsUseCase } from './reserve_tournament_schedule_slots.use_case.js';
import { buildMaterializedMatchPlansSV } from '../../domain/tournament/tournament_match_materialization.js';
import { createAmericanoScheduleKeySV, generateAmericanoScheduleSV } from '../../domain/americano/americano_schedule_generator.js';
import { createRoundRobinScheduleKeySV, generateRoundRobinScheduleSV } from '../../domain/round_robin/round_robin_schedule_generator.js';
import { createSingleEliminationScheduleKeySV, generateSingleEliminationScheduleSV } from '../../domain/single_elimination/bracket_generator.js';
import type { FormatPresetRepository } from '../../domain/ports/format_preset_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

const STATUSES_ALLOWING_SCHEDULE_GENERATION = new Set(['DRAFT', 'OPEN']);

export class GenerateTournamentScheduleUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _formatPresetRepository: FormatPresetRepository,
    private readonly _tournamentScheduleRepository: TournamentScheduleRepository,
    private readonly _tournamentRegistrationRepository: TournamentRegistrationRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
    private readonly _createTournamentNotificationEvent: CreateTournamentNotificationEventUseCase | null = null,
    private readonly _reserveScheduleSlots: ReserveTournamentScheduleSlotsUseCase | null = null,
  ) {}

  /**
   * Aparta cancha y horario para cada partido del cuadro recien creado.
   *
   * Nunca tira abajo la generacion: si la sede no da o alguien gana la carrera
   * por un turno, el cuadro igual queda y el organizador ubica esos partidos a
   * mano. Un cuadro a medio planificar sirve; perderlo entero no.
   */
  private async _reserveSlotsSV(
    _tournament: {
      id: string;
      venueId: string | null;
      sportId: string;
      categoryId: string;
      organizerUserId: string | null;
      startsAt: Date | null;
    },
    _formatCode: string,
    _payload: unknown,
    _actorUserId: string,
  ): Promise<void> {
    if (this._reserveScheduleSlots === null) return;

    try {
      const PLANS = buildMaterializedMatchPlansSV({
        formatCode: _formatCode,
        payload: _payload,
      }).map((_p) => ({ roundNumber: _p.roundNumber, matchNumber: _p.matchNumber }));

      const RESULT = await this._reserveScheduleSlots.executeSV({
        tournamentId: _tournament.id,
        venueId: _tournament.venueId,
        sportId: _tournament.sportId,
        categoryId: _tournament.categoryId,
        organizerUserId: _tournament.organizerUserId ?? _actorUserId,
        startsAt: _tournament.startsAt,
        plans: PLANS,
      });

      if (RESULT.slots.length > 0) {
        await this._tournamentScheduleRepository.saveSlotPlanSV({
          tournamentId: _tournament.id,
          slotPlan: RESULT.slots,
        });
      }
    } catch {
      // No bloquear la generacion del cuadro si falla la reserva de turnos.
    }
  }

  /**
   * Avisa a los inscriptos confirmados que ya pueden ver cuándo juegan.
   * Nunca bloquea la generación del cuadro.
   */
  private async _notifyScheduleSV(
    _tournament: { id: string; name: string; categoryId: string },
    _userIds: string[],
  ): Promise<void> {
    if (this._createTournamentNotificationEvent === null) return;
    try {
      await this._createTournamentNotificationEvent.executeSV({
        type: 'TOURNAMENT_SCHEDULE_PUBLISHED',
        tournamentId: _tournament.id,
        categoryId: _tournament.categoryId,
        payload: { tournamentName: _tournament.name },
        userIds: _userIds,
      });
    } catch {
      // No bloquear la generacion del cuadro si falla la notificacion.
    }
  }

  async executeSV(_input: {
    tournamentId: string;
    actorUserId: string;
    doubleRound?: boolean;
    thirdPlaceMatch?: boolean;
  }): Promise<{
    created: boolean;
    schedule: { tournamentId: string; formatCode: string; scheduleKey: string; payload: unknown };
  }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? 1. Solo el organizador (o staff de la sede, si aplica) puede generar el calendario
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? 2. El calendario solo puede (re)generarse mientras el torneo está en DRAFT u OPEN
    if (!STATUSES_ALLOWING_SCHEDULE_GENERATION.has(TOURNAMENT.status)) {
      throw new AppError(
        'TORNEO_CERRADO',
        'El calendario no puede generarse en el estado actual del torneo.',
        409,
      );
    }

    //? 3. Los participantes se derivan de las inscripciones CONFIRMED; se ignora cualquier lista enviada por el cliente.
    //? El token de cada participante es `registration.id`, no `userId`: desde Slice 1
    //? (tournament-guest-registration) las inscripciones GUEST no tienen `userId`, así que el
    //? calendario debe referenciar la inscripción (resuelta luego en materialización), no al usuario.
    const CONFIRMED_REGISTRATIONS = await this._tournamentRegistrationRepository.listByTournamentIdAndStatusSV(
      TOURNAMENT.id,
      'CONFIRMED',
    );
    //? En un torneo de duplas fijas el competidor es la pareja, no la persona:
    //? el cuadro cruza duplas. Una inscripcion sin companero queda afuera —
    //? media pareja no compite— y el organizador tiene que emparejarla o
    //? sacarla antes de generar.
    const COLLAPSED = TOURNAMENT.pairedRegistration
      ? collapsePairsToCompetitorsSV(CONFIRMED_REGISTRATIONS)
      : { competitorIds: CONFIRMED_REGISTRATIONS.map((_r) => _r.id), unpairedIds: [] };

    if (TOURNAMENT.pairedRegistration && COLLAPSED.unpairedIds.length > 0) {
      throw new AppError(
        'DUPLAS_INCOMPLETAS',
        `Hay ${COLLAPSED.unpairedIds.length} inscripción(es) sin dupla. Emparejalas o quitalas antes de generar el calendario.`,
        409,
      );
    }

    const PARTICIPANT_REGISTRATION_IDS = COLLAPSED.competitorIds;
    //? A quién avisarle: los invitados sin cuenta (`userId` nulo) juegan el
    //? torneo pero no tienen dónde recibir la notificación.
    const CONFIRMED_USER_IDS = CONFIRMED_REGISTRATIONS.map((_r) => _r.userId).filter(
      (_id): _id is string => _id !== null,
    );

    const PRESET = await this._formatPresetRepository.findByIdSV(TOURNAMENT.formatPresetId);
    if (PRESET === null) {
      throw new AppError('FORMATO_NO_ENCONTRADO', 'El formato de torneo indicado no existe.', 404);
    }

    const FORMAT_CODE = PRESET.code;

    if (FORMAT_CODE === 'AMERICANO') {
      const SCHEDULE_KEY = createAmericanoScheduleKeySV({ participantRegistrationIds: PARTICIPANT_REGISTRATION_IDS });
      const PAYLOAD = generateAmericanoScheduleSV({ participantRegistrationIds: PARTICIPANT_REGISTRATION_IDS });
      const RES = await this._tournamentScheduleRepository.createOrValidateIdempotencySV({
        tournamentId: TOURNAMENT.id,
        formatCode: FORMAT_CODE,
        scheduleKey: SCHEDULE_KEY,
        payload: PAYLOAD,
      });
      //? Solo en la creación real: regenerar un cuadro idéntico es idempotente
      //? y volver a avisar por cada intento sería ruido.
      if (RES.created) {
        await this._reserveSlotsSV(TOURNAMENT, FORMAT_CODE, RES.schedule.payload, _input.actorUserId);
        await this._notifyScheduleSV(TOURNAMENT, CONFIRMED_USER_IDS);
      }
      return {
        created: RES.created,
        schedule: {
          tournamentId: RES.schedule.tournamentId,
          formatCode: RES.schedule.formatCode,
          scheduleKey: RES.schedule.scheduleKey,
          payload: RES.schedule.payload,
        },
      };
    }

    if (FORMAT_CODE === 'ROUND_ROBIN') {
      const RR_INPUT: { participantRegistrationIds: string[]; doubleRound?: boolean } = {
        participantRegistrationIds: PARTICIPANT_REGISTRATION_IDS,
      };
      if (_input.doubleRound !== undefined) {
        RR_INPUT.doubleRound = _input.doubleRound;
      }
      const SCHEDULE_KEY = createRoundRobinScheduleKeySV(RR_INPUT);
      const PAYLOAD = generateRoundRobinScheduleSV(RR_INPUT);
      const RES = await this._tournamentScheduleRepository.createOrValidateIdempotencySV({
        tournamentId: TOURNAMENT.id,
        formatCode: FORMAT_CODE,
        scheduleKey: SCHEDULE_KEY,
        payload: PAYLOAD,
      });
      //? Solo en la creación real: regenerar un cuadro idéntico es idempotente
      //? y volver a avisar por cada intento sería ruido.
      if (RES.created) {
        await this._reserveSlotsSV(TOURNAMENT, FORMAT_CODE, RES.schedule.payload, _input.actorUserId);
        await this._notifyScheduleSV(TOURNAMENT, CONFIRMED_USER_IDS);
      }
      return {
        created: RES.created,
        schedule: {
          tournamentId: RES.schedule.tournamentId,
          formatCode: RES.schedule.formatCode,
          scheduleKey: RES.schedule.scheduleKey,
          payload: RES.schedule.payload,
        },
      };
    }

    if (FORMAT_CODE === 'SINGLE_ELIMINATION') {
      const SE_INPUT: { participantRegistrationIds: string[]; thirdPlaceMatch?: boolean } = {
        participantRegistrationIds: PARTICIPANT_REGISTRATION_IDS,
      };
      if (_input.thirdPlaceMatch !== undefined) {
        SE_INPUT.thirdPlaceMatch = _input.thirdPlaceMatch;
      }
      const SCHEDULE_KEY = createSingleEliminationScheduleKeySV(SE_INPUT);
      const PAYLOAD = generateSingleEliminationScheduleSV(SE_INPUT);
      const RES = await this._tournamentScheduleRepository.createOrValidateIdempotencySV({
        tournamentId: TOURNAMENT.id,
        formatCode: FORMAT_CODE,
        scheduleKey: SCHEDULE_KEY,
        payload: PAYLOAD,
      });
      //? Solo en la creación real: regenerar un cuadro idéntico es idempotente
      //? y volver a avisar por cada intento sería ruido.
      if (RES.created) {
        await this._reserveSlotsSV(TOURNAMENT, FORMAT_CODE, RES.schedule.payload, _input.actorUserId);
        await this._notifyScheduleSV(TOURNAMENT, CONFIRMED_USER_IDS);
      }
      return {
        created: RES.created,
        schedule: {
          tournamentId: RES.schedule.tournamentId,
          formatCode: RES.schedule.formatCode,
          scheduleKey: RES.schedule.scheduleKey,
          payload: RES.schedule.payload,
        },
      };
    }

    throw new AppError('FORMATO_NO_SOPORTADO', 'Formato no soportado aún.', 501);
  }
}

