import type { NextFunction, Request, Response } from 'express';

/** Permite usar controladores async con propagación al middleware de errores. */
export function asyncHandler(
  _fn: (_req: Request, _res: Response, _next: NextFunction) => Promise<void>,
) {
  return (_req: Request, _res: Response, _next: NextFunction): void => {
    void _fn(_req, _res, _next).catch(_next);
  };
}
