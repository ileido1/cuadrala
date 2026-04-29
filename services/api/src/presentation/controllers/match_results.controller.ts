import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ENV_CONST } from '../../config/env.js';
import { APPLY_ELO_AFTER_MATCH_RESULT_UC } from '../composition/ratings.composition.js';
import {
  CONFIRM_MATCH_RESULT_DRAFT_BODY_SCHEMA,
  MATCH_ID_PARAM_SCHEMA,
  UPSERT_MATCH_RESULT_DRAFT_BODY_SCHEMA,
} from '../validation/matches.validation.js';

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

function payloadEqualsSV(_a: DraftPayload, _b: DraftPayload): boolean {
  const A = normalizeScoresSV(_a.scores);
  const B = normalizeScoresSV(_b.scores);
  if (A.length !== B.length) return false;
  for (let i = 0; i < A.length; i++) {
    if (A[i]!.userId !== B[i]!.userId) return false;
    if (A[i]!.points !== B[i]!.points) return false;
  }
  return true;
}

async function assertActorIsParticipantSV(_matchId: string, _userId: string): Promise<void> {
  const PARTICIPANT = await PRISMA.matchParticipant.findUnique({
    where: { matchId_userId: { matchId: _matchId, userId: _userId } },
    select: { id: true },
  });
  if (PARTICIPANT === null) {
    throw new AppError('NO_AUTORIZADO', 'Solo participantes pueden operar resultados.', 403);
  }
}

export async function putMatchResultDraftCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPSERT_MATCH_RESULT_DRAFT_BODY_SCHEMA.parse(_req.body);

  await assertActorIsParticipantSV(PARAMS.matchId, USER_ID);

  const MATCH = await PRISMA.match.findUnique({
    where: { id: PARAMS.matchId },
    select: { id: true, status: true },
  });
  if (MATCH === null) {
    throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
  }
  if (MATCH.status !== 'FINISHED') {
    throw new AppError('PARTIDO_NO_FINALIZADO', 'El partido debe estar finalizado para registrar resultado.', 409);
  }

  const PARTICIPANTS = await PRISMA.matchParticipant.findMany({
    where: { matchId: PARAMS.matchId },
    select: { userId: true },
  });
  if (PARTICIPANTS.length !== 4) {
    throw new AppError('PARTICIPANTES_INVALIDOS', 'El MVP requiere exactamente 4 participantes para confirmar resultados.', 409);
  }
  const PARTICIPANT_IDS = new Set(PARTICIPANTS.map((_p) => _p.userId));

  for (const _s of BODY.scores) {
    if (!PARTICIPANT_IDS.has(_s.userId)) {
      throw new AppError('VALIDACION_FALLIDA', 'scores incluye un userId que no pertenece al partido.', 400);
    }
  }
  const UNIQUE_USERS = new Set(BODY.scores.map((_s) => _s.userId));
  if (UNIQUE_USERS.size !== 4) {
    throw new AppError('VALIDACION_FALLIDA', 'scores debe incluir exactamente 4 jugadores.', 400);
  }

  const NEW_PAYLOAD: DraftPayload = { scores: normalizeScoresSV(BODY.scores) };

  const EXISTING = await PRISMA.matchResultDraft.findUnique({
    where: { matchId: PARAMS.matchId },
    include: { confirmations: true },
  });

  if (EXISTING !== null && EXISTING.status === 'FINALIZED') {
    throw new AppError('RESULTADO_YA_FINALIZADO', 'El resultado ya fue finalizado.', 409);
  }

  if (EXISTING !== null) {
    const EXISTING_PAYLOAD = EXISTING.payload as unknown as DraftPayload;
    if (!payloadEqualsSV(EXISTING_PAYLOAD, NEW_PAYLOAD)) {
      await PRISMA.matchResultConfirmation.deleteMany({ where: { draftId: EXISTING.id } });
    }
  }

  const SAVED = await PRISMA.matchResultDraft.upsert({
    where: { matchId: PARAMS.matchId },
    create: {
      matchId: PARAMS.matchId,
      status: 'DRAFT',
      payload: NEW_PAYLOAD,
      createdByUserId: USER_ID,
    },
    update: {
      payload: NEW_PAYLOAD,
      status: 'DRAFT',
    },
    select: { id: true, matchId: true, status: true, payload: true, updatedAt: true, createdAt: true },
  });

  _res.status(EXISTING === null ? 201 : 200).json({
    success: true,
    message: 'Borrador de resultado guardado correctamente.',
    data: SAVED,
  });
}

export async function postConfirmMatchResultDraftCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CONFIRM_MATCH_RESULT_DRAFT_BODY_SCHEMA.parse(_req.body);

  await assertActorIsParticipantSV(PARAMS.matchId, USER_ID);

  const MATCH = await PRISMA.match.findUnique({
    where: { id: PARAMS.matchId },
    select: { id: true, status: true },
  });
  if (MATCH === null) {
    throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
  }
  if (MATCH.status !== 'FINISHED') {
    throw new AppError('PARTIDO_NO_FINALIZADO', 'El partido debe estar finalizado para registrar resultado.', 409);
  }

  const DRAFT = await PRISMA.matchResultDraft.findUnique({
    where: { matchId: PARAMS.matchId },
    include: { confirmations: true },
  });
  if (DRAFT === null) {
    throw new AppError('BORRADOR_NO_ENCONTRADO', 'No existe borrador de resultado para este partido.', 404);
  }
  if (DRAFT.status === 'FINALIZED') {
    throw new AppError('RESULTADO_YA_FINALIZADO', 'El resultado ya fue finalizado.', 409);
  }

  await PRISMA.matchResultConfirmation.upsert({
    where: { draftId_userId: { draftId: DRAFT.id, userId: USER_ID } },
    create: {
      draftId: DRAFT.id,
      userId: USER_ID,
      status: BODY.status,
    },
    update: {
      status: BODY.status,
    },
  });

  const CONFIRMATIONS = await PRISMA.matchResultConfirmation.findMany({
    where: { draftId: DRAFT.id },
    select: { status: true },
  });
  const CONFIRMED_COUNT = CONFIRMATIONS.filter((_c) => _c.status === 'CONFIRMED').length;

  if (CONFIRMED_COUNT === 4) {
    const PAYLOAD = DRAFT.payload as unknown as DraftPayload;
    const SCORES = normalizeScoresSV(PAYLOAD.scores);

    const CREATED = await PRISMA.$transaction(async (_tx) => {
      const RESULT = await _tx.matchResult.create({
        data: {
          matchId: PARAMS.matchId,
          scores: {
            create: SCORES.map((_s) => ({
              userId: _s.userId,
              points: _s.points,
            })),
          },
        },
        include: { scores: true },
      });

      await _tx.matchResultDraft.update({
        where: { id: DRAFT.id },
        data: { status: 'FINALIZED' },
      });

      return RESULT;
    });

    await APPLY_ELO_AFTER_MATCH_RESULT_UC.executeSV({
      resultId: CREATED.id,
      kFactor: ENV_CONST.ELO_K_FACTOR,
      initialRating: ENV_CONST.ELO_INITIAL_RATING,
      minRating: ENV_CONST.ELO_MIN_RATING,
      maxRating: ENV_CONST.ELO_MAX_RATING,
      provisionalGames: ENV_CONST.ELO_PROVISIONAL_GAMES,
      provisionalKMultiplier: ENV_CONST.ELO_PROVISIONAL_K_MULTIPLIER,
    });

    _res.status(201).json({
      success: true,
      message: 'Resultado finalizado correctamente.',
      data: { resultId: CREATED.id, matchId: CREATED.matchId },
    });
    return;
  }

  _res.status(200).json({
    success: true,
    message: 'Confirmación registrada correctamente.',
    data: { confirmedCount: CONFIRMED_COUNT, required: 4 },
  });
}

