import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../../domain/errors/app_error.js';

export function errorMiddleware(
  _err: unknown,
  _req: Request,
  _res: Response,
  _next: NextFunction,
): void {
  if (_res.headersSent) {
    _next(_err);
    return;
  }

  if (_err instanceof AppError) {
    _res.status(_err.statusCode).json({
      success: false,
      code: _err.code,
      message: _err.message,
      details: _err.details,
    });
    return;
  }

  if (_err instanceof ZodError) {
    _res.status(400).json({
      success: false,
      code: 'VALIDACION_FALLIDA',
      message: 'Los datos enviados no son validos.',
      details: _err.flatten(),
    });
    return;
  }

  console.error(_err);
  _res.status(500).json({
    success: false,
    code: 'ERROR_INTERNO',
    message: 'Ocurrió un error interno. Intente nuevamente más tarde.',
  });
}
