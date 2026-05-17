import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { LIST_VENUE_MATCHES_UC } from '../composition/venue_dashboard.composition.js';
import { LIST_VENUE_MATCHES_QUERY_SCHEMA, VENUE_ID_PARAM_SCHEMA } from '../validation/venues.validation.js';

export async function listVenueMatchesCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = LIST_VENUE_MATCHES_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await LIST_VENUE_MATCHES_UC.executeSV(
    {
      venueId: PARAMS.venueId,
      ...(QUERY.courtId !== undefined ? { courtId: QUERY.courtId } : {}),
      ...(QUERY.date !== undefined ? { date: QUERY.date } : {}),
      ...(QUERY.status !== undefined ? { status: QUERY.status } : {}),
      page: QUERY.page,
      limit: QUERY.limit,
    },
    ACTOR_USER_ID,
  );

  _res.status(200).json({
    success: true,
    message: 'Reservas obtenidas correctamente.',
    data: {
      items: RESULT.items.map((_item) => ({
        id: _item.id,
        courtId: _item.courtId,
        courtName: _item.courtName,
        status: _item.status,
        scheduledAt: _item.scheduledAt,
        type: _item.type,
        participantCount: _item.participantCount,
        maxParticipants: _item.maxParticipants,
        pricePerPlayerCents: _item.pricePerPlayerCents,
        categoryName: _item.categoryName,
      })),
      pageInfo: RESULT.pageInfo,
    },
  });
}
