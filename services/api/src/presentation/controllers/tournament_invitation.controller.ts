import type { Request, Response } from 'express';

import { requireActorUserIdSV } from '../helpers/require_actor_user_id.js';
import {
  CANCEL_TOURNAMENT_INVITATION_UC,
  INVITE_TOURNAMENT_PARTICIPANT_UC,
  LIST_TOURNAMENT_INVITATIONS_UC,
  RESPOND_TOURNAMENT_INVITATION_UC,
} from '../composition/tournament_invitation.composition.js';
import {
  CREATE_TOURNAMENT_INVITATION_BODY_SCHEMA,
  RESPOND_TOURNAMENT_INVITATION_BODY_SCHEMA,
  TOURNAMENT_INVITATION_ID_PARAMS_SCHEMA,
  TOURNAMENT_INVITATION_PARAMS_SCHEMA,
} from '../validation/tournament_invitation.validation.js';

export async function postInviteTournamentParticipantCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = requireActorUserIdSV(_req);
  const PARAMS = TOURNAMENT_INVITATION_PARAMS_SCHEMA.parse(_req.params);
  const BODY = CREATE_TOURNAMENT_INVITATION_BODY_SCHEMA.parse(_req.body);

  const RESULT = await INVITE_TOURNAMENT_PARTICIPANT_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    invitedUserId: BODY.userId,
    actorUserId: ACTOR_USER_ID,
  });

  _res.status(201).json({
    success: true,
    message: 'Invitación creada correctamente.',
    data: RESULT,
  });
}

export async function getTournamentInvitationsCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = requireActorUserIdSV(_req);
  const PARAMS = TOURNAMENT_INVITATION_PARAMS_SCHEMA.parse(_req.params);

  const RESULT = await LIST_TOURNAMENT_INVITATIONS_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    actorUserId: ACTOR_USER_ID,
  });

  _res.status(200).json({
    success: true,
    message: 'Invitaciones obtenidas correctamente.',
    data: RESULT,
  });
}

export async function postRespondTournamentInvitationCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = requireActorUserIdSV(_req);
  const PARAMS = TOURNAMENT_INVITATION_ID_PARAMS_SCHEMA.parse(_req.params);
  const BODY = RESPOND_TOURNAMENT_INVITATION_BODY_SCHEMA.parse(_req.body);

  const RESULT = await RESPOND_TOURNAMENT_INVITATION_UC.executeSV({
    invitationId: PARAMS.invitationId,
    actorUserId: ACTOR_USER_ID,
    action: BODY.action,
  });

  _res.status(200).json({
    success: true,
    message:
      BODY.action === 'ACCEPT'
        ? 'Invitación aceptada correctamente.'
        : 'Invitación rechazada correctamente.',
    data: RESULT,
  });
}

export async function deleteTournamentInvitationCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = requireActorUserIdSV(_req);
  const PARAMS = TOURNAMENT_INVITATION_ID_PARAMS_SCHEMA.parse(_req.params);

  await CANCEL_TOURNAMENT_INVITATION_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    invitationId: PARAMS.invitationId,
    actorUserId: ACTOR_USER_ID,
  });

  _res.status(204).send();
}
