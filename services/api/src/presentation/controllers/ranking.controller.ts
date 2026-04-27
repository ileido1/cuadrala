import type { Request, Response } from 'express';

import { recalculateRankingSV } from '../../application/ranking.service.js';
import { RECALCULATE_RANKING_PARAMS_SCHEMA } from '../validation/ranking.validation.js';

export async function postRecalculateRankingCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = RECALCULATE_RANKING_PARAMS_SCHEMA.parse(_req.params);

  const RESULT = await recalculateRankingSV(PARAMS.categoryId);

  _res.status(200).json({
    success: true,
    message: 'Ranking recalculado correctamente.',
    data: RESULT,
  });
}
