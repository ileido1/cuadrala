import type { Request, Response } from 'express';
import { AppError } from '../../domain/errors/app_error.js';
import { ListVenueMatchesUseCase } from '../../application/use_cases/list_venue_matches.use_case.js';
import { PrismaMatchQueryRepository } from '../../infrastructure/adapters/prisma_match_query_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { LIST_VENUE_MATCHES_QUERY_SCHEMA, VENUE_ID_PARAM_SCHEMA } from '../validation/venues.validation.js';

const _matchQueryRepo = new PrismaMatchQueryRepository();
const _venueStaffRepo = new PrismaVenueStaffRepository();
const _useCase = new ListVenueMatchesUseCase(_matchQueryRepo, _venueStaffRepo);

export async function listVenueMatchesCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = LIST_VENUE_MATCHES_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await _useCase.executeSV(
    {
      venueId: PARAMS.venueId,
      ...QUERY,
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