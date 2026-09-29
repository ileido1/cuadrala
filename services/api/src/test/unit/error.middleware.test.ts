import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { AppError } from '../../domain/errors/app_error.js';
import { errorMiddleware } from '../../presentation/middleware/error.middleware.js';

function buildResSV(_headersSent = false) {
  const RES = {
    headersSent: _headersSent,
    statusCode: 0,
    body: undefined as unknown,
    status(_code: number) {
      this.statusCode = _code;
      return this;
    },
    json(_payload: unknown) {
      this.body = _payload;
      return this;
    },
  };
  return RES as unknown as Response & {
    statusCode: number;
    body: { code?: string; message?: string; details?: unknown };
  };
}

const REQ = { method: 'GET', path: '/api/v1/test' } as unknown as Request;

describe('errorMiddleware', () => {
  it('delega en Express si la respuesta ya empezó a enviarse', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const RES = buildResSV(true);
    const NEXT = vi.fn() as unknown as NextFunction;
    const ERR = new Error('boom');

    errorMiddleware(ERR, REQ, RES, NEXT);

    expect(NEXT).toHaveBeenCalledWith(ERR);
    expect(RES.statusCode).toBe(0);
    vi.restoreAllMocks();
  });

  it('responde con el status y el código del AppError', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const RES = buildResSV();

    errorMiddleware(
      new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404),
      REQ,
      RES,
      vi.fn() as unknown as NextFunction,
    );

    expect(RES.statusCode).toBe(404);
    expect(RES.body).toMatchObject({
      success: false,
      code: 'TORNEO_NO_ENCONTRADO',
      message: 'El torneo indicado no existe.',
    });
    vi.restoreAllMocks();
  });

  it('responde 400 con el detalle de Zod ante un body malformado', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const RES = buildResSV();
    const PARSED = z.object({ id: z.string().uuid() }).safeParse({ id: 'no-uuid' });

    errorMiddleware(
      (PARSED as { error: unknown }).error,
      REQ,
      RES,
      vi.fn() as unknown as NextFunction,
    );

    expect(RES.statusCode).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
    expect(RES.body.details).toBeDefined();
    vi.restoreAllMocks();
  });

  it('registra diagnóstico saneado para Zod en el bloqueo de horario', () => {
    const SPY = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const RES = buildResSV();
    const BODY = {
      scheduledAt: '2026-10-01T12:00:00.000Z',
      durationMinutes: 60,
      courtId: 'court-secret-id',
      notes: 'private player note',
      token: 'body-secret-token',
    };
    const PARSED = z
      .object({ scheduledAt: z.string(), durationMinutes: z.number() })
      .strict()
      .safeParse(BODY);
    const REQ = {
      method: 'POST',
      path: '/api/v1/venues/venue-private/courts/court-private/slots/block',
      params: { venueId: 'venue-private', courtId: 'court-private' },
      body: BODY,
      headers: { authorization: 'Bearer authorization-secret' },
    } as unknown as Request;

    errorMiddleware(
      (PARSED as { error: unknown }).error,
      REQ,
      RES,
      vi.fn() as unknown as NextFunction,
    );

    const OUTPUT = SPY.mock.calls[0]?.[0] as string;
    const ENTRY = JSON.parse(OUTPUT);
    expect(ENTRY.diagnostics).toEqual({
      bodyType: 'object',
      bodyKeys: ['courtId', 'durationMinutes', 'notes', 'scheduledAt', 'token'],
      routeParamKeys: ['courtId', 'venueId'],
      zodIssues: [
        { code: 'unrecognized_keys', path: [], unrecognizedKeys: ['courtId', 'notes', 'token'] },
      ],
    });
    expect(OUTPUT).not.toContain('2026-10-01T12:00:00.000Z');
    expect(OUTPUT).not.toContain('court-secret-id');
    expect(OUTPUT).not.toContain('private player note');
    expect(OUTPUT).not.toContain('body-secret-token');
    expect(OUTPUT).not.toContain('authorization-secret');
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');

    SPY.mockRestore();
  });

  //? Frontera de seguridad: una excepción inesperada nunca debe llegar al cliente.
  it('ante una excepción inesperada responde 500 sin filtrar el error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const RES = buildResSV();
    const ERR = new Error('conexión a la base falló en el host interno db-prod-01');

    errorMiddleware(ERR, REQ, RES, vi.fn() as unknown as NextFunction);

    expect(RES.statusCode).toBe(500);
    expect(RES.body).toEqual({
      success: false,
      code: 'ERROR_INTERNO',
      message: 'Ocurrió un error interno. Intente nuevamente más tarde.',
    });

    const SERIALIZED = JSON.stringify(RES.body);
    expect(SERIALIZED).not.toContain('db-prod-01');
    expect(SERIALIZED).not.toContain('stack');
    vi.restoreAllMocks();
  });
});
