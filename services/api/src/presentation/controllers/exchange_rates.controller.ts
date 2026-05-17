import type { Request, Response } from 'express';

import {
  LIST_EXCHANGE_RATES_BY_COUNTRY_UC,
  REFRESH_EXCHANGE_RATES_UC,
} from '../composition/exchange_rates.composition.js';

export async function getExchangeRatesByCountryCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const COUNTRY_CODE = _req.params.countryCode as string;
  const RESULT = await LIST_EXCHANGE_RATES_BY_COUNTRY_UC.executeSV(COUNTRY_CODE);
  _res.status(200).json({
    success: true,
    data: RESULT,
  });
}

export async function postRefreshExchangeRatesCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const COUNTRY_CODE = _req.params.countryCode as string;
  const RESULT = await REFRESH_EXCHANGE_RATES_UC.executeSV(COUNTRY_CODE);
  _res.status(200).json({
    success: true,
    message: 'Tasas actualizadas correctamente.',
    data: RESULT,
  });
}
