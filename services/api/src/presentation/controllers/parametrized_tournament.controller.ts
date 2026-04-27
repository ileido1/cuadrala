import type { Request, Response } from 'express';

import type { Prisma } from '../../generated/prisma/client.js';

import { createParametrizedTournamentSV } from '../../application/parametrized_tournament.service.js';
import { CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA } from '../validation/parametrized_tournament.validation.js';

export async function postParametrizedTournamentCON(_req: Request, _res: Response): Promise<void> {
  const BODY = CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA.parse(_req.body);

  const INPUT: Parameters<typeof createParametrizedTournamentSV>[0] = {
    name: BODY.name,
    categoryId: BODY.categoryId,
    sportId: BODY.sportId,
    formatPresetId: BODY.formatPresetId,
  };
  if (BODY.formatParameters !== undefined) {
    INPUT.formatParameters = BODY.formatParameters as Prisma.InputJsonValue;
  }
  if (BODY.startsAt !== undefined) {
    INPUT.startsAt = new Date(BODY.startsAt);
  }

  const RESULT = await createParametrizedTournamentSV(INPUT);

  _res.status(201).json({
    success: true,
    message: 'Torneo creado correctamente.',
    data: RESULT,
  });
}
