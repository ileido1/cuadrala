import { AppError } from '../../domain/errors/app_error.js';
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
  ) {}

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
    const PARTICIPANT_REGISTRATION_IDS = CONFIRMED_REGISTRATIONS.map((_r) => _r.id);

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

