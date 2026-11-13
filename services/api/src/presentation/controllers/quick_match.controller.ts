import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import type { QuickMatchSearchDTO } from '../../domain/ports/quick_match_repository.js';
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

/**
 * Vista para el cliente: un buscador solo vive en un lobby de 1 (para poder
 * invitar por disponibilidad, S12), pero el contrato dice que solo en la cola no
 * hay propuesta (`proposal: null`, `noMatchYet: true`). `invitedByAvailability`
 * siempre viaja a nivel de búsqueda.
 */
function toClientSearchSV(_search: QuickMatchSearchDTO | null): QuickMatchSearchDTO | null {
  const PROPOSAL = _search?.proposal ?? null;
  if (_search === null || PROPOSAL === null || PROPOSAL.type !== 'NEW_GROUP' || PROPOSAL.status !== 'LOBBY' || PROPOSAL.playerIds.length > 1) return _search;
  return { ..._search, proposal: null, noMatchYet: true, acceptedCount: 0 };
}

export async function getMyQuickMatchCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = actorUserIdSV(_req);
  const SEARCH = await GET_MY_QUICK_MATCH_UC.executeSV(USER_ID);
  //? Corre en todo estado: busca si está en cola y repone cupos si está en un grupo (S5).
  const MATCHED = SEARCH === null ? null : await MATCH_QUICK_MATCH_UC.executeSV(SEARCH, USER_ID);
  _res.status(200).json({
    success: true,
    message: 'Estado de búsqueda obtenido correctamente.',
    data: toClientSearchSV(MATCHED),
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
    data: toClientSearchSV(MATCHED),
  });
}

export async function deleteMyQuickMatchCON(_req: Request, _res: Response): Promise<void> {
  await CANCEL_MY_QUICK_MATCH_UC.executeSV(actorUserIdSV(_req));
  _res.status(204).send();
}

export async function postDismissMyQuickMatchProposalCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = actorUserIdSV(_req);
  const SEARCH = await DISMISS_MY_QUICK_MATCH_PROPOSAL_UC.executeSV(USER_ID);
  //? NEW_GROUP: rechazar saca solo a este jugador de la cola y su cupo se repone
  //? en el acto con el siguiente jugador compatible (S5).
  //? OPEN_MATCH: sigue buscando otra partida (S8).
  if (SEARCH.proposal?.type === 'NEW_GROUP') {
    if (typeof SEARCH.proposal.groupKey === 'string') await MATCH_QUICK_MATCH_UC.refillGroupSV(SEARCH.proposal.groupKey, USER_ID);
    _res.status(200).json({ success: true, message: 'Partida rechazada; saliste de la cola.', data: toClientSearchSV(SEARCH) });
    return;
  }
  const MATCHED = await MATCH_QUICK_MATCH_UC.executeSV(SEARCH, USER_ID);
  _res.status(200).json({ success: true, message: 'Propuesta descartada; seguimos buscando.', data: toClientSearchSV(MATCHED) });
}

export async function postConfirmMyQuickMatchProposalCON(_req: Request, _res: Response): Promise<void> {
  const BODY = CONFIRM_QUICK_MATCH_PROPOSAL_BODY_SCHEMA.parse(_req.body ?? {});
  const VENUE_SELECTION = BODY.venueId === undefined ? undefined : {
    venueId: BODY.venueId,
    courtId: BODY.courtId!,
    scheduledAt: BODY.scheduledAt!,
  };
  const USER_ID = actorUserIdSV(_req);
  const SEARCH = await CONFIRM_MY_QUICK_MATCH_PROPOSAL_UC.executeSV(USER_ID, VENUE_SELECTION);
  //? S12/S13/S2: un invitado que acepta entra al lobby; se avisa a los que ya estaban.
  await MATCH_QUICK_MATCH_UC.notifyAfterAcceptSV(SEARCH, USER_ID);
  _res.status(200).json({ success: true, message: 'Partida confirmada correctamente.', data: toClientSearchSV(SEARCH) });
}
