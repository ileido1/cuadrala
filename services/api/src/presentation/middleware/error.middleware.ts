import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../../domain/errors/app_error.js';
import { logError } from '../observability/error_logger.js';

const BLOCK_SLOT_ROUTE_PATH = '/venues/:venueId/courts/:courtId/slots/block';

function isBlockSlotPostRequestSV(_req: Request): boolean {
  if (_req.method !== 'POST') return false;

  if (_req.route?.path === BLOCK_SLOT_ROUTE_PATH) return true;

  const PATH = _req.path.replace(/^\/api\/v1/, '');
  return /^\/venues\/[^/]+\/courts\/[^/]+\/slots\/block$/.test(PATH);
}

function bodyTypeSV(_body: unknown): string {
  if (_body === null) return 'null';
  if (Array.isArray(_body)) return 'array';
  return typeof _body;
}

function sortedKeysSV(_value: unknown): string[] {
  if (_value === null || typeof _value !== 'object') return [];
  return Object.keys(_value).sort();
}

function blockSlotZodDiagnosticsSV(_req: Request, _error: ZodError): Record<string, unknown> {
  return {
    diagnostics: {
      bodyType: bodyTypeSV(_req.body),
      bodyKeys: sortedKeysSV(_req.body),
      routeParamKeys: sortedKeysSV(_req.params),
      zodIssues: _error.issues.map((_issue) => ({
        code: _issue.code,
        path: _issue.path,
        ...(_issue.code === 'unrecognized_keys' && {
          unrecognizedKeys: [..._issue.keys].sort(),
        }),
      })),
    },
  };
}

/**
 * @name    :errorMiddleware
 * @version :1.0.0
 * @description :Middleware de error de Express. Traduce cualquier excepción a
 * una respuesta JSON uniforme (`success`, `code`, `message`) y la registra con
 * contexto. Una excepción inesperada nunca se filtra al cliente: sale como 500
 * con mensaje genérico.
 * @param {unknown} _err - Excepción lanzada por un handler o middleware previo
 * @param {Request} _req - Request de Express; aporta contexto al log
 * @param {Response} _res - Response de Express donde se escribe la respuesta
 * @param {NextFunction} _next - Solo se invoca si la respuesta ya empezó a enviarse
 * @return {void}
 */
export function errorMiddleware(
  _err: unknown,
  _req: Request,
  _res: Response,
  _next: NextFunction,
): void {
  //? 1. La respuesta ya empezó a enviarse: no se puede reescribir el status ni
  //? el body, así que delega en el handler por defecto de Express.
  if (_res.headersSent) {
    _next(_err);
    return;
  }

  //? 2. Error de dominio: 4xx es error de quien llama (warn), 5xx es nuestro (error).
  if (_err instanceof AppError) {
    logError(_err.statusCode >= 500 ? 'error' : 'warn', _err.code, _err.message, _req, _err);
    _res.status(_err.statusCode).json({
      success: false,
      code: _err.code,
      message: _err.message,
      details: _err.details,
    });
    return;
  }

  //? 3. Body o params malformados: se devuelve el detalle de Zod para que el
  //? cliente sepa qué campo corregir.
  if (_err instanceof ZodError) {
    logError(
      'warn',
      'VALIDACION_FALLIDA',
      'Datos de entrada malformados.',
      _req,
      _err,
      isBlockSlotPostRequestSV(_req) ? blockSlotZodDiagnosticsSV(_req, _err) : undefined,
    );
    _res.status(400).json({
      success: false,
      code: 'VALIDACION_FALLIDA',
      message: 'Los datos enviados no son válidos.',
      details: _err.flatten(),
    });
    return;
  }

  //? 4. Excepción inesperada: se loguea con stack, pero al cliente solo va un
  //? mensaje genérico. Nunca se filtra `_err` en la respuesta.
  logError('error', 'ERROR_INTERNO', 'Error interno no controlado.', _req, _err);
  _res.status(500).json({
    success: false,
    code: 'ERROR_INTERNO',
    message: 'Ocurrió un error interno. Intente nuevamente más tarde.',
  });
}
