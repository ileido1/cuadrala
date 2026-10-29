import type { Request, Response } from 'express';

import { requireActorUserIdSV } from '../helpers/require_actor_user_id.js';
import {
  CREATE_TOURNAMENT_INVITE_LINK_UC,
  LIST_TOURNAMENT_INVITE_LINKS_UC,
  REVOKE_TOURNAMENT_INVITE_LINK_UC,
  GET_TOURNAMENT_INVITE_LINK_PREVIEW_UC,
  REGISTER_VIA_TOURNAMENT_INVITE_LINK_UC,
} from '../composition/tournament_invite_link.composition.js';
import {
  CREATE_TOURNAMENT_INVITE_LINK_BODY_SCHEMA,
  TOURNAMENT_INVITE_LINK_ID_PARAMS_SCHEMA,
  TOURNAMENT_INVITE_LINK_TOKEN_PARAMS_SCHEMA,
  TOURNAMENT_INVITE_LINK_TOURNAMENT_PARAMS_SCHEMA,
} from '../validation/tournament_invite_link.validation.js';
import { INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA } from '../validation/tournament_registration.validation.js';

/** REQ-TIL-001: solo el organizador o staff de su sede puede generar un link. */
export async function postCreateTournamentInviteLinkCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = requireActorUserIdSV(_req);
  const PARAMS = TOURNAMENT_INVITE_LINK_TOURNAMENT_PARAMS_SCHEMA.parse(_req.params);
  const BODY = CREATE_TOURNAMENT_INVITE_LINK_BODY_SCHEMA.parse(_req.body);

  const RESULT = await CREATE_TOURNAMENT_INVITE_LINK_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    actorUserId: ACTOR_USER_ID,
    ...(BODY.expiresAt !== undefined ? { expiresAt: BODY.expiresAt } : {}),
    ...(BODY.maxUses !== undefined ? { maxUses: BODY.maxUses } : {}),
  });

  _res.status(201).json({
    success: true,
    message: 'Enlace de invitación generado correctamente.',
    data: RESULT,
  });
}

/** REQ-TIL-006: listado de links con quién se registró por cada uno. */
export async function getTournamentInviteLinksCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = requireActorUserIdSV(_req);
  const PARAMS = TOURNAMENT_INVITE_LINK_TOURNAMENT_PARAMS_SCHEMA.parse(_req.params);

  const RESULT = await LIST_TOURNAMENT_INVITE_LINKS_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    actorUserId: ACTOR_USER_ID,
  });

  _res.status(200).json({
    success: true,
    message: 'Enlaces de invitación obtenidos correctamente.',
    data: RESULT,
  });
}

/** REQ-TIL-005: revocación idempotente. */
export async function deleteTournamentInviteLinkCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = requireActorUserIdSV(_req);
  const PARAMS = TOURNAMENT_INVITE_LINK_ID_PARAMS_SCHEMA.parse(_req.params);

  await REVOKE_TOURNAMENT_INVITE_LINK_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    linkId: PARAMS.linkId,
    actorUserId: ACTOR_USER_ID,
  });

  _res.status(204).send();
}

/** Público, `optionalAuth`: previsualización del torneo detrás del link. */
export async function getTournamentInviteLinkPreviewCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const PARAMS = TOURNAMENT_INVITE_LINK_TOKEN_PARAMS_SCHEMA.parse(_req.params);

  const RESULT = await GET_TOURNAMENT_INVITE_LINK_PREVIEW_UC.executeSV(PARAMS.token);

  _res.status(200).json({
    success: true,
    message: 'Previsualización del enlace de invitación.',
    data: RESULT,
  });
}

/**
 * Público, `optionalAuth`: si hay sesión (`_req.authUser`), se ignora el body
 * de invitado y se registra al usuario autenticado (REQ-TIL-007); si no, el
 * body se valida con el mismo schema que usa el organizador para invitar
 * (REQ-TIL-008, NFR-TIL-003).
 */
export async function postRegisterViaTournamentInviteLinkCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const PARAMS = TOURNAMENT_INVITE_LINK_TOKEN_PARAMS_SCHEMA.parse(_req.params);
  const ACTOR_USER_ID = _req.authUser?.id ?? null;

  const GUEST_INPUT =
    ACTOR_USER_ID === null
      ? (() => {
          const BODY = INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA.parse(_req.body);
          return { name: BODY.name, phone: BODY.phone ?? null, email: BODY.email };
        })()
      : null;

  const RESULT = await REGISTER_VIA_TOURNAMENT_INVITE_LINK_UC.executeSV({
    token: PARAMS.token,
    actorUserId: ACTOR_USER_ID,
    guestInput: GUEST_INPUT,
  });

  _res.status(201).json({
    success: true,
    message: 'Inscripción registrada correctamente.',
    data: RESULT,
  });
}
