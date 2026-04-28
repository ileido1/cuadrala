import type { Request, Response } from 'express';

import {
  LIST_FORMAT_PRESETS_BY_SPORT_UC,
  LIST_SPORTS_UC,
} from '../composition/catalog.composition.js';
import { SPORT_ID_PARAM_SCHEMA } from '../validation/catalog.validation.js';

export async function getSportsCON(_req: Request, _res: Response): Promise<void> {
  const DATA = await LIST_SPORTS_UC.executeSV();

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

  const PRESETS = await LIST_FORMAT_PRESETS_BY_SPORT_UC.executeSV(PARAMS.sportId);

  _res.status(200).json({
    success: true,
    message: 'Formatos de torneo obtenidos correctamente.',
    data: { presets: PRESETS },
  });
}
