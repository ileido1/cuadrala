import type { Request, Response } from 'express';

import { GET_USER_RATING_HISTORY_UC, GET_USER_RATINGS_UC } from '../composition/ratings_read.composition.js';
import {
  GET_USER_RATING_HISTORY_PARAMS_SCHEMA,
  GET_USER_RATING_HISTORY_QUERY_SCHEMA,
  GET_USER_RATINGS_PARAMS_SCHEMA,
  GET_USER_RATINGS_QUERY_SCHEMA,
} from '../validation/ratings.validation.js';

export async function getUserRatingsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = GET_USER_RATINGS_PARAMS_SCHEMA.parse(_req.params);
  const QUERY = GET_USER_RATINGS_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await GET_USER_RATINGS_UC.executeSV({
    userId: PARAMS.userId,
    categoryId: QUERY.categoryId,
  });

  _res.status(200).json({
    success: true,
    message: 'Ratings obtenidos correctamente.',
    data: RESULT,
  });
}

export async function getUserRatingHistoryCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = GET_USER_RATING_HISTORY_PARAMS_SCHEMA.parse(_req.params);
  const QUERY = GET_USER_RATING_HISTORY_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await GET_USER_RATING_HISTORY_UC.executeSV({
    userId: PARAMS.userId,
    categoryId: QUERY.categoryId,
    page: QUERY.page,
    limit: QUERY.limit,
  });

  _res.status(200).json({
    success: true,
    message: 'Historial de ratings obtenido correctamente.',
    data: RESULT,
  });
}

