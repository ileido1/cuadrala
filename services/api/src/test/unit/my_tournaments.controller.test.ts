import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';

import { getMyTournamentsCON } from '../../presentation/controllers/my_tournaments.controller.js';

describe('getMyTournamentsCON', () => {
  it('rejects with 401 when there is no authenticated user', async () => {
    const REQ = { authUser: undefined } as unknown as Request;
    const RES = {} as Response;

    await expect(getMyTournamentsCON(REQ, RES)).rejects.toMatchObject({
      code: 'NO_AUTORIZADO',
      statusCode: 401,
    });
  });
});
