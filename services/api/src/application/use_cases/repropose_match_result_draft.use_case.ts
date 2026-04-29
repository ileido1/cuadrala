import { AppError } from '../../domain/errors/app_error.js';
import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { MatchReadRepository } from '../../domain/ports/match_read_repository.js';
import type { MatchResultDraftDTO, MatchResultDraftRepository } from '../../domain/ports/match_result_draft_repository.js';

type DraftPayload = {
  scores: Array<{ userId: string; points: number }>;
};

function normalizeScoresSV(_scores: Array<{ userId: string; points: number }>): Array<{ userId: string; points: number }> {
  const BY_USER = new Map<string, number>();
  for (const _s of _scores) {
    BY_USER.set(_s.userId, _s.points);
  }
  return [...BY_USER.entries()]
    .map(([_userId, _points]) => ({ userId: _userId, points: _points }))
    .sort((_a, _b) => _a.userId.localeCompare(_b.userId));
}

export class ReproposeMatchResultDraftUseCase {
  constructor(
    private readonly _matchReadRepository: MatchReadRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository,
    private readonly _matchResultDraftRepository: MatchResultDraftRepository,
  ) {}

  async executeSV(_input: {
    matchId: string;
    actorUserId: string;
    scores: Array<{ userId: string; points: number }>;
  }): Promise<MatchResultDraftDTO> {
    const MATCH = await this._matchReadRepository.findByIdSV(_input.matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }
    if (MATCH.status !== 'FINISHED') {
      throw new AppError('PARTIDO_NO_FINALIZADO', 'El partido debe estar finalizado para registrar resultado.', 409);
    }

    const IS_PARTICIPANT = await this._matchParticipationRepository.userIsParticipantSV(_input.matchId, _input.actorUserId);
    if (!IS_PARTICIPANT) {
      throw new AppError('NO_AUTORIZADO', 'Solo participantes pueden operar resultados.', 403);
    }

    const PARTICIPANT_USER_IDS = await this._matchParticipationRepository.listParticipantUserIdsSV(_input.matchId);
    if (PARTICIPANT_USER_IDS.length !== 4) {
      throw new AppError('PARTICIPANTES_INVALIDOS', 'El MVP requiere exactamente 4 participantes para confirmar resultados.', 409);
    }
    const PARTICIPANT_SET = new Set(PARTICIPANT_USER_IDS);

    for (const _s of _input.scores) {
      if (!PARTICIPANT_SET.has(_s.userId)) {
        throw new AppError('VALIDACION_FALLIDA', 'scores incluye un userId que no pertenece al partido.', 400);
      }
    }
    const UNIQUE_USERS = new Set(_input.scores.map((_s) => _s.userId));
    if (UNIQUE_USERS.size !== 4) {
      throw new AppError('VALIDACION_FALLIDA', 'scores debe incluir exactamente 4 jugadores.', 400);
    }

    const LATEST = await this._matchResultDraftRepository.findLatestByMatchIdSV(_input.matchId);
    if (LATEST === null) {
      throw new AppError('BORRADOR_NO_ENCONTRADO', 'No existe borrador previo para reproponer.', 404);
    }
    if (LATEST.status === 'FINALIZED') {
      throw new AppError('RESULTADO_YA_FINALIZADO', 'El resultado ya fue finalizado.', 409);
    }
    if (LATEST.status !== 'REJECTED') {
      throw new AppError('BORRADOR_NO_RECHAZADO', 'Solo se puede reproponer después de un rechazo.', 409);
    }

    const NEW_PAYLOAD: DraftPayload = { scores: normalizeScoresSV(_input.scores) };
    const NEW_VERSION = LATEST.version + 1;

    return this._matchResultDraftRepository.createDraftSV({
      matchId: _input.matchId,
      version: NEW_VERSION,
      payload: NEW_PAYLOAD,
      proposedByUserId: _input.actorUserId,
    });
  }
}

