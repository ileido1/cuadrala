import type { Request, Response } from 'express';

import { CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA } from '../validation/parametrized_tournament.validation.js';
import { CREATE_PARAMETRIZED_TOURNAMENT_UC } from '../composition/tournaments.composition.js';

export async function postParametrizedTournamentCON(_req: Request, _res: Response): Promise<void> {
  const BODY = CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA.parse(_req.body);

  const INPUT: Parameters<typeof CREATE_PARAMETRIZED_TOURNAMENT_UC.executeSV>[0] = {
    name: BODY.name,
    categoryId: BODY.categoryId,
    sportId: BODY.sportId,
  };
  //? Si el llamador está autenticado (token válido), se registra como
  //? organizador del torneo. Sin sesión, el torneo queda sin organizador.
  if (_req.authUser !== undefined) {
    INPUT.organizerUserId = _req.authUser.id;
  }
  if (BODY.formatPresetId !== undefined) {
    INPUT.formatPresetId = BODY.formatPresetId;
  }
  if (BODY.formatPresetCode !== undefined) {
    INPUT.formatPresetCode = BODY.formatPresetCode;
  }
  if (BODY.formatParameters !== undefined) {
    INPUT.formatParameters = BODY.formatParameters;
  }
  if (BODY.startsAt !== undefined) {
    INPUT.startsAt = new Date(BODY.startsAt);
  }
  if (BODY.visibility !== undefined) {
    INPUT.visibility = BODY.visibility;
  }
  if (BODY.venueId !== undefined) {
    INPUT.venueId = BODY.venueId;
  }
  if (BODY.inscriptionPrice !== undefined) {
    INPUT.inscriptionPrice = BODY.inscriptionPrice;
  }
  if (BODY.maxSlots !== undefined) {
    INPUT.maxSlots = BODY.maxSlots;
  }
  if (BODY.registrationClosesAt !== undefined) {
    INPUT.registrationClosesAt = new Date(BODY.registrationClosesAt);
  }

  const RESULT = await CREATE_PARAMETRIZED_TOURNAMENT_UC.executeSV(INPUT);

  _res.status(201).json({
    success: true,
    message: 'Torneo creado correctamente.',
    data: RESULT,
  });
}
