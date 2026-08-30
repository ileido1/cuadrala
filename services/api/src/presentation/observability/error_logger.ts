import type { Request } from 'express';

//? Aporta la augmentation `Express.Request.authUser`. Es ambiente (declare
//? global), pero se importa explícitamente para que la dependencia se vea.
import type {} from '../../types/express.js';

/**
 * @name    :logError
 * @version :1.0.0
 * @description :Registra un error como una línea JSON con contexto de request.
 * Nunca serializa headers: es lo que evita filtrar `authorization` u otros
 * secretos al log.
 * @param {'error'|'warn'} _level - Nivel del log; el stack solo se adjunta en
 * `error`, porque los 4xx son volumen controlado por quien llama
 * @param {string} _code - Código de error del dominio (ej. `TORNEO_NO_ENCONTRADO`)
 * @param {string} _message - Mensaje legible del error
 * @param {Request} [_req] - Request de Express; aporta método, ruta y actor.
 * El actor sale de `_req.authUser`, que ya resolvieron `requireAuth`/`optionalAuth`
 * @param {unknown} [_error] - Error original; su stack se adjunta solo en nivel `error`
 * @return {void}
 */
export function logError(
  _level: 'error' | 'warn',
  _code: string,
  _message: string,
  _req?: Request,
  _error?: unknown,
): void {
  const STACK = _level === 'error' && _error instanceof Error ? _error.stack : undefined;

  //? Logging estructurado: un JSON por línea, por el stream que marca el nivel.
  console[_level](
    JSON.stringify({
      '@timestamp': new Date().toISOString(),
      level: _level.toUpperCase(),
      code: _code,
      message: _message,
      http: {
        method: _req?.method ?? 'UNKNOWN',
        path: _req?.path ?? 'N/A',
        actor: _req?.authUser?.id ?? 'anonymous',
      },
      ...(STACK !== undefined && { stack: STACK }),
    }),
  );
}
