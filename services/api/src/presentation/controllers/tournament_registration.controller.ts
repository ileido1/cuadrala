import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  LIST_TOURNAMENT_REGISTRATIONS_UC,
  REGISTER_TOURNAMENT_PARTICIPANT_UC,
  WITHDRAW_TOURNAMENT_REGISTRATION_UC,
} from '../composition/tournament_registration.composition.js';
import {
  CREATE_TOURNAMENT_REGISTRATION_BODY_SCHEMA,
  TOURNAMENT_REGISTRATION_PARAMS_SCHEMA,
  WITHDRAW_TOURNAMENT_REGISTRATION_PARAMS_SCHEMA,
} from '../validation/tournament_registration.validation.js';

export async function postRegisterTournamentParticipantCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = TOURNAMENT_REGISTRATION_PARAMS_SCHEMA.parse(_req.params);
  const BODY = CREATE_TOURNAMENT_REGISTRATION_BODY_SCHEMA.parse(_req.body);

  const RESULT = await REGISTER_TOURNAMENT_PARTICIPANT_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    userId: BODY.userId,
  });

  _res.status(RESULT.created ? 201 : 200).json({
    success: true,
    message: RESULT.created ? 'Inscripción registrada correctamente.' : 'Inscripción actualizada correctamente.',
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

export async function withdrawTournamentRegistrationCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = WITHDRAW_TOURNAMENT_REGISTRATION_PARAMS_SCHEMA.parse(_req.params);

  await WITHDRAW_TOURNAMENT_REGISTRATION_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    userId: PARAMS.userId,
  });

  _res.status(204).send();
}
