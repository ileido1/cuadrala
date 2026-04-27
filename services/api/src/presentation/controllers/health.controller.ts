import type { Request, Response } from 'express';

export function getHealthCON(_req: Request, _res: Response): void {
  _res.status(200).json({
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
  });
}
