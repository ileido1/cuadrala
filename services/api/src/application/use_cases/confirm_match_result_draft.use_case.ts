import { AppError } from '../../domain/errors/app_error.js';
import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { MatchReadRepository } from '../../domain/ports/match_read_repository.js';
import type { MatchResultDraftRepository } from '../../domain/ports/match_result_draft_repository.js';
import type { ApplyEloAfterMatchResultUseCase } from './apply_elo_after_match_result.use_case.js';

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

export class ConfirmMatchResultDraftUseCase {
  constructor(
    private readonly _matchReadRepository: MatchReadRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository,
    private readonly _matchResultDraftRepository: MatchResultDraftRepository,
    private readonly _applyEloAfterMatchResultUseCase: ApplyEloAfterMatchResultUseCase,
    private readonly _eloConfig: {
      kFactor: number;
      initialRating: number;
      minRating: number;
      maxRating: number;
      provisionalGames: number;
      provisionalKMultiplier: number;
    },
  ) {}

  async executeSV(_input: {
    matchId: string;
    actorUserId: string;
    status: 'CONFIRMED' | 'REJECTED';
  }): Promise<
    | { kind: 'CONFIRMATION_RECORDED'; confirmedCount: number; required: 4 }
    | { kind: 'REJECTED'; required: 4 }
    | { kind: 'FINALIZED'; resultId: string; matchId: string }
  > {
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

    const DRAFT = await this._matchResultDraftRepository.findLatestByMatchIdSV(_input.matchId);
    if (DRAFT === null) {
      throw new AppError('BORRADOR_NO_ENCONTRADO', 'No existe borrador de resultado para este partido.', 404);
    }
    if (DRAFT.status === 'FINALIZED') {
      throw new AppError('RESULTADO_YA_FINALIZADO', 'El resultado ya fue finalizado.', 409);
    }
    if (DRAFT.status === 'REJECTED') {
      throw new AppError(
        'BORRADOR_RECHAZADO',
        'El borrador fue rechazado. Debes crear una nueva propuesta para continuar.',
        409,
      );
    }

    await this._matchResultDraftRepository.upsertConfirmationSV({
      draftId: DRAFT.id,
      userId: _input.actorUserId,
      status: _input.status,
    });

    if (_input.status === 'REJECTED') {
      await this._matchResultDraftRepository.updateDraftSV(DRAFT.id, { status: 'REJECTED' });
      return { kind: 'REJECTED', required: 4 };
    }

    const CONFIRMATIONS = await this._matchResultDraftRepository.listConfirmationsByDraftIdSV(DRAFT.id);
    const HAS_REJECTED = CONFIRMATIONS.some((_c) => _c.status === 'REJECTED');
    if (HAS_REJECTED) {
      await this._matchResultDraftRepository.updateDraftSV(DRAFT.id, { status: 'REJECTED' });
      return { kind: 'REJECTED', required: 4 };
    }

    const CONFIRMED_COUNT = CONFIRMATIONS.filter((_c) => _c.status === 'CONFIRMED').length;
    if (CONFIRMED_COUNT !== 4) {
      return { kind: 'CONFIRMATION_RECORDED', confirmedCount: CONFIRMED_COUNT, required: 4 };
    }

    const PAYLOAD = DRAFT.payload as DraftPayload;
    const SCORES = normalizeScoresSV(PAYLOAD.scores);

    const CREATED = await this._matchResultDraftRepository.createMatchResultAndFinalizeDraftSV({
      matchId: _input.matchId,
      draftId: DRAFT.id,
      scores: SCORES,
    });

    await this._applyEloAfterMatchResultUseCase.executeSV({
      resultId: CREATED.resultId,
      ...this._eloConfig,
    });

    return { kind: 'FINALIZED', resultId: CREATED.resultId, matchId: _input.matchId };
  }
}

