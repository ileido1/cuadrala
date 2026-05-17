import type { Request, Response } from 'express';

import { CHECK_DATABASE_READY_UC } from '../composition/health.composition.js';

export function getHealthCON(_req: Request, _res: Response): void {
  _res.status(200).json({
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
  });
}

export async function getReadyCON(_req: Request, _res: Response): Promise<void> {
  try {
    await CHECK_DATABASE_READY_UC.executeSV();
    _res.status(200).json({
      status: 'ready',
      service: 'api',
      timestamp: new Date().toISOString(),
    });
  } catch {
    _res.status(503).json({
      status: 'not_ready',
      service: 'api',
      timestamp: new Date().toISOString(),
      message: 'Dependencias no disponibles (base de datos).',
    });
  }
}
