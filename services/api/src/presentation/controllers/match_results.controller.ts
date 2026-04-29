import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  CONFIRM_MATCH_RESULT_DRAFT_UC,
  REPROPOSE_MATCH_RESULT_DRAFT_UC,
  UPSERT_MATCH_RESULT_DRAFT_UC,
} from '../composition/match_results.composition.js';
import {
  CONFIRM_MATCH_RESULT_DRAFT_BODY_SCHEMA,
  MATCH_ID_PARAM_SCHEMA,
  UPSERT_MATCH_RESULT_DRAFT_BODY_SCHEMA,
} from '../validation/matches.validation.js';

export async function putMatchResultDraftCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPSERT_MATCH_RESULT_DRAFT_BODY_SCHEMA.parse(_req.body);

  const RESULT = await UPSERT_MATCH_RESULT_DRAFT_UC.executeSV({
    matchId: PARAMS.matchId,
    actorUserId: USER_ID,
    scores: BODY.scores,
  });

  _res.status(RESULT.created ? 201 : 200).json({
    success: true,
    message: 'Borrador de resultado guardado correctamente.',
    data: RESULT.draft,
  });
}

export async function postConfirmMatchResultDraftCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CONFIRM_MATCH_RESULT_DRAFT_BODY_SCHEMA.parse(_req.body);

  const RESULT = await CONFIRM_MATCH_RESULT_DRAFT_UC.executeSV({
    matchId: PARAMS.matchId,
    actorUserId: USER_ID,
    status: BODY.status,
  });

  if (RESULT.kind === 'FINALIZED') {
    _res.status(201).json({
      success: true,
      message: 'Resultado finalizado correctamente.',
      data: { resultId: RESULT.resultId, matchId: RESULT.matchId },
    });
    return;
  }

  if (RESULT.kind === 'REJECTED') {
    _res.status(200).json({
      success: true,
      message: 'Borrador rechazado correctamente.',
      data: { required: RESULT.required },
    });
    return;
  }

  _res.status(200).json({
    success: true,
    message: 'Confirmación registrada correctamente.',
    data: { confirmedCount: RESULT.confirmedCount, required: RESULT.required },
  });
}

export async function postReproposeMatchResultDraftCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPSERT_MATCH_RESULT_DRAFT_BODY_SCHEMA.parse(_req.body);

  const DRAFT = await REPROPOSE_MATCH_RESULT_DRAFT_UC.executeSV({
    matchId: PARAMS.matchId,
    actorUserId: USER_ID,
    scores: BODY.scores,
  });

  _res.status(201).json({
    success: true,
    message: 'Repropuesta de resultado creada correctamente.',
    data: DRAFT,
  });
}

