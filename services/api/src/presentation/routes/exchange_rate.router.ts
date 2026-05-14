import { Router } from 'express';

import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  listByCountrySV,
  upsertManySV,
} from '../../infrastructure/repositories/exchange_rate.repository.js';

const EXCHANGE_RATE_ROUTER = Router();

// GET /countries/:countryCode/exchange-rates — tasas de un país
EXCHANGE_RATE_ROUTER.get(
  '/countries/:countryCode/exchange-rates',
  asyncHandler(async (_req, _res) => {
    const { countryCode } = _req.params;
    const RATES = await listByCountrySV(countryCode);
    _res.status(200).json({
      success: true,
      data: { items: RATES },
    });
  }),
);

// POST /countries/:countryCode/exchange-rates/refresh — actualizar tasas (admin)
EXCHANGE_RATE_ROUTER.post(
  '/countries/:countryCode/exchange-rates/refresh',
  requireAuth,
  asyncHandler(async (_req, _res) => {
    const { countryCode } = _req.params;

    // Llamar a ve.dolarapi.com
    const RESP = await fetch('https://ve.dolarapi.com/v1/cotizaciones');
    if (!RESP.ok) {
      _res.status(502).json({
        success: false,
        message: 'No se pudo obtener las tasas de cambio.',
      });
      return;
    }
    const RAW: Array<{
      moneda: string;
      promedio: number | null;
      fuente: string;
      fechaActualizacion: string;
    }> = await RESP.json() as Array<{
      moneda: string;
      promedio: number | null;
      fuente: string;
      fechaActualizacion: string;
    }>;

    const USD_RATE = RAW.find(r => r.moneda === 'USD');
    const EUR_RATE = RAW.find(r => r.moneda === 'EUR');

    const TO_UPSERT = [];
    if (USD_RATE?.promedio != null) {
      TO_UPSERT.push({
        countryCode,
        currency: 'USD',
        rateToBs: USD_RATE.promedio,
        source: 'dolarapi.com',
      });
    }
    if (EUR_RATE?.promedio != null) {
      TO_UPSERT.push({
        countryCode,
        currency: 'EUR',
        rateToBs: EUR_RATE.promedio,
        source: 'dolarapi.com',
      });
    }

    if (TO_UPSERT.length === 0) {
      _res.status(422).json({
        success: false,
        message: 'No se encontraron tasas disponibles.',
      });
      return;
    }

    const UPDATED = await upsertManySV(TO_UPSERT);
    _res.status(200).json({
      success: true,
      message: 'Tasas actualizadas correctamente.',
      data: { items: UPDATED },
    });
  }),
);

export { EXCHANGE_RATE_ROUTER };