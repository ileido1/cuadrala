import type { Request, Response } from 'express';

import { ADMIN_CANCEL_MATCH_UC } from '../composition/matches.composition.js';
import { MATCH_ID_PARAM_SCHEMA } from '../validation/matches.validation.js';

/**
 * @name    :patchAdminCancelMatchCON
 * @version :2.0.0
 * @description :Cancela un partido desde operación. La autorización la resuelve
 * `requireSecret` en el router.
 * @param {Request} _req - Request de Express
 * @param {Response} _res - Response de Express
 * @return {Promise<void>}
 */
export async function patchAdminCancelMatchCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const RESULT = await ADMIN_CANCEL_MATCH_UC.executeSV(PARAMS.matchId);

  _res.status(200).json({
    success: true,
    message: 'Partido cancelado correctamente.',
    data: { match: RESULT },
  });
}
