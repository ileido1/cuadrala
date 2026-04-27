import type { Request, Response } from 'express';

import { createAmericanoSV } from '../../application/americano.service.js';
import { CREATE_AMERICANO_BODY_SCHEMA } from '../validation/americano.validation.js';

export async function postAmericanoCON(_req: Request, _res: Response): Promise<void> {
  const BODY = CREATE_AMERICANO_BODY_SCHEMA.parse(_req.body);

  const INPUT: Parameters<typeof createAmericanoSV>[0] = {
    categoryId: BODY.categoryId,
    participantUserIds: BODY.participantUserIds,
  };
  if (BODY.sportId !== undefined) {
    INPUT.sportId = BODY.sportId;
  }
  if (BODY.courtId !== undefined) {
    INPUT.courtId = BODY.courtId;
  }
  if (BODY.tournamentId !== undefined) {
    INPUT.tournamentId = BODY.tournamentId;
  }
  if (BODY.scheduledAt !== undefined) {
    INPUT.scheduledAt = new Date(BODY.scheduledAt);
  }

  const RESULT = await createAmericanoSV(INPUT);

  _res.status(201).json({
    success: true,
    message: 'Americano creado correctamente.',
    data: RESULT,
  });
}
