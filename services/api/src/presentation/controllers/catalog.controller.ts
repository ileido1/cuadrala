import type { Request, Response } from 'express';

import {
  LIST_FORMAT_PRESETS_BY_SPORT_UC,
  LIST_SPORTS_UC,
  PUBLISH_FORMAT_PRESET_VERSION_UC,
} from '../composition/catalog.composition.js';
import {
  FORMAT_PRESET_CODE_PARAM_SCHEMA,
  PUBLISH_FORMAT_PRESET_VERSION_BODY_SCHEMA,
  SPORT_ID_PARAM_SCHEMA,
} from '../validation/catalog.validation.js';

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

export async function postPublishFormatPresetVersionCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS_SPORT = SPORT_ID_PARAM_SCHEMA.parse(_req.params);
  const PARAMS_CODE = FORMAT_PRESET_CODE_PARAM_SCHEMA.parse({ code: _req.params.code });
  const BODY = PUBLISH_FORMAT_PRESET_VERSION_BODY_SCHEMA.parse(_req.body);

  const RESULT = await PUBLISH_FORMAT_PRESET_VERSION_UC.executeSV({
    sportId: PARAMS_SPORT.sportId,
    code: PARAMS_CODE.code,
    name: BODY.name,
    schemaVersion: BODY.schemaVersion,
    defaultParameters: BODY.defaultParameters,
    ...(BODY.effectiveFrom !== undefined ? { effectiveFrom: new Date(BODY.effectiveFrom) } : {}),
  });

  _res.status(201).json({
    success: true,
    message: 'Preset versionado publicado correctamente.',
    data: RESULT,
  });
}
