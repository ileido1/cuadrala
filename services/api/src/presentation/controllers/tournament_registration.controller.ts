import type { Request, Response } from 'express';

import { requireActorUserIdSV } from '../helpers/require_actor_user_id.js';
import {
  INVITE_GUEST_TOURNAMENT_PARTICIPANT_UC,
  LIST_TOURNAMENT_REGISTRATIONS_UC,
  REGISTER_TOURNAMENT_PARTICIPANT_UC,
  REMOVE_TOURNAMENT_REGISTRATION_UC,
  UPDATE_TOURNAMENT_REGISTRATION_STATUS_UC,
  WITHDRAW_TOURNAMENT_REGISTRATION_UC,
} from '../composition/tournament_registration.composition.js';
import {
  CREATE_TOURNAMENT_REGISTRATION_BODY_SCHEMA,
  INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA,
  TOURNAMENT_REGISTRATION_ID_PARAMS_SCHEMA,
  TOURNAMENT_REGISTRATION_PARAMS_SCHEMA,
  UPDATE_TOURNAMENT_REGISTRATION_STATUS_BODY_SCHEMA,
  WITHDRAW_TOURNAMENT_REGISTRATION_PARAMS_SCHEMA,
} from '../validation/tournament_registration.validation.js';

export async function postRegisterTournamentParticipantCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  //? TODO: el actor se autentica pero no se usa — el userId sale del body, asi
  //? que cualquier autenticado puede inscribir a otro. Falta definir criterio.
  requireActorUserIdSV(_req);

  const PARAMS = TOURNAMENT_REGISTRATION_PARAMS_SCHEMA.parse(_req.params);
  const BODY = CREATE_TOURNAMENT_REGISTRATION_BODY_SCHEMA.parse(_req.body);

  const RESULT = await REGISTER_TOURNAMENT_PARTICIPANT_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    userId: BODY.userId,
  });

  _res.status(RESULT.created ? 201 : 200).json({
    success: true,
    message: RESULT.created
      ? 'Inscripción registrada correctamente.'
      : 'Inscripción actualizada correctamente.',
    data: RESULT.registration,
  });
}

export async function getTournamentRegistrationsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = TOURNAMENT_REGISTRATION_PARAMS_SCHEMA.parse(_req.params);

  const RESULT = await LIST_TOURNAMENT_REGISTRATIONS_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
  });

  _res.status(200).json({
    success: true,
    message: 'Inscripciones obtenidas correctamente.',
    data: RESULT,
  });
}

export async function withdrawTournamentRegistrationCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  //? TODO: el actor se autentica pero no se usa — el userId sale del path, asi
  //? que cualquier autenticado puede dar de baja a otro. Falta definir criterio.
  requireActorUserIdSV(_req);

  const PARAMS = WITHDRAW_TOURNAMENT_REGISTRATION_PARAMS_SCHEMA.parse(_req.params);

  await WITHDRAW_TOURNAMENT_REGISTRATION_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    userId: PARAMS.userId,
  });

  _res.status(204).send();
}

export async function postInviteGuestTournamentParticipantCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = requireActorUserIdSV(_req);
  const PARAMS = TOURNAMENT_REGISTRATION_PARAMS_SCHEMA.parse(_req.params);
  const BODY = INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA.parse(_req.body);

  const RESULT = await INVITE_GUEST_TOURNAMENT_PARTICIPANT_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    guestName: BODY.name,
    guestPhone: BODY.phone ?? null,
    guestEmail: BODY.email ?? null,
    actorUserId: ACTOR_USER_ID,
  });

  _res.status(201).json({
    success: true,
    message: 'Invitado agregado correctamente.',
    data: RESULT,
  });
}

export async function patchTournamentRegistrationStatusCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = requireActorUserIdSV(_req);
  const PARAMS = TOURNAMENT_REGISTRATION_ID_PARAMS_SCHEMA.parse(_req.params);
  const BODY = UPDATE_TOURNAMENT_REGISTRATION_STATUS_BODY_SCHEMA.parse(_req.body);

  const RESULT = await UPDATE_TOURNAMENT_REGISTRATION_STATUS_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    registrationId: PARAMS.registrationId,
    status: BODY.status,
    actorUserId: ACTOR_USER_ID,
  });

  _res.status(200).json({
    success: true,
    message: 'Inscripción confirmada correctamente.',
    data: RESULT,
  });
}

export async function deleteTournamentRegistrationCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = requireActorUserIdSV(_req);
  const PARAMS = TOURNAMENT_REGISTRATION_ID_PARAMS_SCHEMA.parse(_req.params);

  await REMOVE_TOURNAMENT_REGISTRATION_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    registrationId: PARAMS.registrationId,
    actorUserId: ACTOR_USER_ID,
  });

  _res.status(204).send();
}
