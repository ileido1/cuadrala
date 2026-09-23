import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  CANCEL_MY_QUICK_MATCH_UC,
  CONFIRM_MY_QUICK_MATCH_PROPOSAL_UC,
  DISMISS_MY_QUICK_MATCH_PROPOSAL_UC,
  GET_MY_QUICK_MATCH_UC,
  MATCH_QUICK_MATCH_UC,
  START_QUICK_MATCH_UC,
} from '../composition/quick_match.composition.js';
import { CONFIRM_QUICK_MATCH_PROPOSAL_BODY_SCHEMA, START_QUICK_MATCH_BODY_SCHEMA } from '../validation/quick_match.validation.js';

function actorUserIdSV(_req: Request): string {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  return USER_ID;
}

export async function getMyQuickMatchCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = actorUserIdSV(_req);
  const SEARCH = await GET_MY_QUICK_MATCH_UC.executeSV(USER_ID);
  const MATCHED = SEARCH?.status === 'SEARCHING' ? await MATCH_QUICK_MATCH_UC.executeSV(SEARCH, USER_ID) : SEARCH;
  _res.status(200).json({
    success: true,
    message: 'Estado de búsqueda obtenido correctamente.',
    data: MATCHED,
  });
}

export async function postQuickMatchCON(_req: Request, _res: Response): Promise<void> {
  const BODY = START_QUICK_MATCH_BODY_SCHEMA.parse(_req.body);
  const USER_ID = actorUserIdSV(_req);
  const SEARCH = await START_QUICK_MATCH_UC.executeSV(USER_ID, BODY);
  const MATCHED = await MATCH_QUICK_MATCH_UC.executeSV(SEARCH, USER_ID);
  _res.status(201).json({
    success: true,
    message: 'Búsqueda de partida iniciada correctamente.',
    data: MATCHED,
  });
}

export async function deleteMyQuickMatchCON(_req: Request, _res: Response): Promise<void> {
  await CANCEL_MY_QUICK_MATCH_UC.executeSV(actorUserIdSV(_req));
  _res.status(204).send();
}

export async function postDismissMyQuickMatchProposalCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = actorUserIdSV(_req);
  const SEARCH = await DISMISS_MY_QUICK_MATCH_PROPOSAL_UC.executeSV(USER_ID);
  const MATCHED = await MATCH_QUICK_MATCH_UC.executeSV(SEARCH, USER_ID);
  _res.status(200).json({ success: true, message: 'Propuesta descartada; seguimos buscando.', data: MATCHED });
}

export async function postConfirmMyQuickMatchProposalCON(_req: Request, _res: Response): Promise<void> {
  const BODY = CONFIRM_QUICK_MATCH_PROPOSAL_BODY_SCHEMA.parse(_req.body ?? {});
  const VENUE_SELECTION = BODY.venueId === undefined ? undefined : {
    venueId: BODY.venueId,
    courtId: BODY.courtId!,
    scheduledAt: BODY.scheduledAt!,
  };
  const SEARCH = await CONFIRM_MY_QUICK_MATCH_PROPOSAL_UC.executeSV(actorUserIdSV(_req), VENUE_SELECTION);
  _res.status(200).json({ success: true, message: 'Partida confirmada correctamente.', data: SEARCH });
}
