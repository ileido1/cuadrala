import { AppError } from '../../domain/errors/app_error.js';
import { createAmericanoScheduleKeySV, generateAmericanoScheduleSV } from '../../domain/americano/americano_schedule_generator.js';
import { createRoundRobinScheduleKeySV, generateRoundRobinScheduleSV } from '../../domain/round_robin/round_robin_schedule_generator.js';
import { createSingleEliminationScheduleKeySV, generateSingleEliminationScheduleSV } from '../../domain/single_elimination/bracket_generator.js';
import type { FormatPresetRepository } from '../../domain/ports/format_preset_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';

export class GenerateTournamentScheduleUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _formatPresetRepository: FormatPresetRepository,
    private readonly _tournamentScheduleRepository: TournamentScheduleRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    participantUserIds: string[];
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

    const PRESET = await this._formatPresetRepository.findByIdSV(TOURNAMENT.formatPresetId);
    if (PRESET === null) {
      throw new AppError('FORMATO_NO_ENCONTRADO', 'El formato de torneo indicado no existe.', 404);
    }

    const FORMAT_CODE = PRESET.code;

    if (FORMAT_CODE === 'AMERICANO') {
      const SCHEDULE_KEY = createAmericanoScheduleKeySV({ participantUserIds: _input.participantUserIds });
      const PAYLOAD = generateAmericanoScheduleSV({ participantUserIds: _input.participantUserIds });
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
      const RR_INPUT: { participantUserIds: string[]; doubleRound?: boolean } = {
        participantUserIds: _input.participantUserIds,
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
      const SE_INPUT: { participantUserIds: string[]; thirdPlaceMatch?: boolean } = {
        participantUserIds: _input.participantUserIds,
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

