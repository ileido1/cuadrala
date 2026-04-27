import type { Request, Response } from 'express';

import { listFormatPresetsBySportSV, listSportsSV } from '../../application/catalog.service.js';
import { SPORT_ID_PARAM_SCHEMA } from '../validation/catalog.validation.js';

export async function getSportsCON(_req: Request, _res: Response): Promise<void> {
  const DATA = await listSportsSV();

  _res.status(200).json({
    success: true,
    message: 'Deportes obtenidos correctamente.',
    data: { sports: DATA },
  });
}

export async function getTournamentFormatPresetsBySportCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const PARAMS = SPORT_ID_PARAM_SCHEMA.parse(_req.params);

  const PRESETS = await listFormatPresetsBySportSV(PARAMS.sportId);

  _res.status(200).json({
    success: true,
    message: 'Formatos de torneo obtenidos correctamente.',
    data: { presets: PRESETS },
  });
}
