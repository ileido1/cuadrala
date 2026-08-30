import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { logError } from '../../presentation/observability/error_logger.js';

describe('logError', () => {
  it('registra nivel, código, contexto http y stack', () => {
    const SPY = vi.spyOn(console, 'error').mockImplementation(() => {});
    const REQ = {
      method: 'POST',
      path: '/api/v1/tournaments',
      authUser: { id: 'user-123', email: 'test@cuadrala.app' },
    } as unknown as Request;

    logError('error', 'SCHEDULE_CONFLICT', 'Conflicto de calendario', REQ, new Error('boom'));

    const ENTRY = JSON.parse(SPY.mock.calls[0]?.[0] as string);
    expect(ENTRY).toMatchObject({
      level: 'ERROR',
      code: 'SCHEDULE_CONFLICT',
      message: 'Conflicto de calendario',
      http: { method: 'POST', path: '/api/v1/tournaments', actor: 'user-123' },
    });
    expect(ENTRY.stack).toBeDefined();
    expect(ENTRY['@timestamp']).toBeDefined();

    SPY.mockRestore();
  });

  it('no adjunta stack en nivel warn', () => {
    const SPY = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logError('warn', 'VALIDACION_FALLIDA', 'Datos malformados.', undefined, new Error('boom'));

    const ENTRY = JSON.parse(SPY.mock.calls[0]?.[0] as string);
    expect(ENTRY.level).toBe('WARN');
    expect(ENTRY.stack).toBeUndefined();

    SPY.mockRestore();
  });

  it('no filtra el header authorization y cae a actor anónimo', () => {
    const SPY = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const REQ = {
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: { authorization: 'Bearer secret-token-xyz' },
    } as unknown as Request;

    logError('warn', 'TOKEN_INVALIDO', 'Token invalido o expirado.', REQ);

    const OUTPUT = SPY.mock.calls[0]?.[0] as string;
    expect(OUTPUT).not.toContain('secret-token-xyz');
    expect(OUTPUT).toContain('"actor":"anonymous"');

    SPY.mockRestore();
  });
});
