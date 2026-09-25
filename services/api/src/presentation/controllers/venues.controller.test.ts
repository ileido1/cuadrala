import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const createVenueExecuteSV = vi.hoisted(() => vi.fn());

vi.mock('../composition/venues.composition.js', () => ({
  CANCEL_COURT_UC: {},
  CREATE_COURT_UC: {},
  CREATE_VENUE_UC: { executeSV: createVenueExecuteSV },
  GET_VENUE_DETAIL_UC: {},
  GET_VENUE_PAYMENT_INFO_UC: {},
  LIST_COURTS_UC: {},
  LIST_MY_VENUES_UC: {},
  LIST_VENUES_UC: {},
  UPDATE_COURT_UC: {},
}));

import { postVenueCON } from './venues.controller.js';

function createResponse(): Response {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

describe('postVenueCON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should assign the authenticated actor as venue owner', async () => {
    createVenueExecuteSV.mockResolvedValue({ id: 'venue-1', name: 'Club Cuadrala' });
    const response = createResponse();
    const request = {
      authUser: { id: 'actor-user-id', email: 'owner@example.com' },
      body: { name: 'Club Cuadrala', address: 'Caracas' },
    } as unknown as Request;

    await postVenueCON(request, response);

    expect(createVenueExecuteSV).toHaveBeenCalledWith({
      name: 'Club Cuadrala',
      address: 'Caracas',
      latitude: undefined,
      longitude: undefined,
      paymentHolder: undefined,
      paymentBank: undefined,
      paymentCvu: undefined,
      paymentAlias: undefined,
      paymentNotes: undefined,
      ownerUserId: 'actor-user-id',
    });
    expect(response.status).toHaveBeenCalledWith(201);
  });
});
