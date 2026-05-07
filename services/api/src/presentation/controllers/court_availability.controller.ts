import type { Request, Response } from 'express';

import { GET_COURT_AVAILABILITY_UC } from '../composition/court_availability.composition.js';
import {
  VENUE_AVAILABILITY_PARAMS_SCHEMA,
  VENUE_AVAILABILITY_QUERY_SCHEMA,
} from '../validation/court_availability.validation.js';

export async function getVenueCourtAvailabilityCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = VENUE_AVAILABILITY_PARAMS_SCHEMA.parse(_req.params ?? {});
  const QUERY = VENUE_AVAILABILITY_QUERY_SCHEMA.parse(_req.query ?? {});

  const RESULT = await GET_COURT_AVAILABILITY_UC.executeSV({
    venueId: PARAMS.venueId,
    ...(QUERY.courtId !== undefined ? { courtId: QUERY.courtId } : {}),
    from: new Date(QUERY.from),
    to: new Date(QUERY.to),
    ...(QUERY.durationMinutes !== undefined ? { durationMinutes: QUERY.durationMinutes } : {}),
    ...(QUERY.stepMinutes !== undefined ? { stepMinutes: QUERY.stepMinutes } : {}),
    ...(QUERY.sportId !== undefined ? { sportId: QUERY.sportId } : {}),
    ...(QUERY.categoryId !== undefined ? { categoryId: QUERY.categoryId } : {}),
  });

  _res.status(200).json({
    success: true,
    message: 'Disponibilidad obtenida correctamente.',
    data: RESULT,
  });
}

