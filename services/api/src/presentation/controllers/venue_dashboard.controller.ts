/**
 * Controlador para stats y configuración de Venue (Backoffice Dashboard API).
 *
 * GET  /api/v1/venues/:venueId/dashboard-stats
 * GET  /api/v1/venues/:venueId/transactions/stats
 * GET  /api/v1/venues/:venueId/transactions/history
 * PATCH /api/v1/venues/:venueId
 */

import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { GetDashboardStatsUseCase } from '../../application/use_cases/venue_dashboard.use_cases.js';
import { GetTransactionStatsUseCase } from '../../application/use_cases/venue_transactions.use_cases.js';
import { UpdateVenueUseCase } from '../../application/use_cases/venue.use_cases.js';
import { PrismaMatchQueryRepository } from '../../infrastructure/adapters/prisma_match_query_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { ListVenueMatchesUseCase } from '../../application/use_cases/list_venue_matches.use_case.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import {
  DASHBOARD_STATS_QUERY_SCHEMA,
  TRANSACTIONS_STATS_QUERY_SCHEMA,
  TRANSACTIONS_HISTORY_QUERY_SCHEMA,
  UPDATE_VENUE_BODY_SCHEMA,
  VENUE_MATCHES_QUERY_SCHEMA,
  VENUE_ID_PARAM_SCHEMA,
} from '../validation/venues.validation.js';

const _dashboardUseCase = new GetDashboardStatsUseCase();
const _transactionStatsUseCase = new GetTransactionStatsUseCase();
const _updateVenueUseCase = new UpdateVenueUseCase();
const _matchQueryRepo = new PrismaMatchQueryRepository();
const _venueStaffRepo = new PrismaVenueStaffRepository();
const _listMatchesUseCase = new ListVenueMatchesUseCase(_matchQueryRepo, _venueStaffRepo);

// ---------------------------------------------------------------------------
// GET /venues/:venueId/dashboard-stats
// ---------------------------------------------------------------------------

export async function getDashboardStatsCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  DASHBOARD_STATS_QUERY_SCHEMA.parse(_req.query); // validación sin uso por ahora

  // Verificar que el usuario es staff de la sede
  const IS_STAFF = await _venueStaffRepo.isUserStaffOfVenueSV(ACTOR_USER_ID, PARAMS.venueId);
  if (!IS_STAFF) {
    throw new AppError('NO_AUTORIZADO', 'No tienes permisos para ver stats de esta sede.', 403);
  }

  const STATS = await _dashboardUseCase.executeSV(PARAMS.venueId);

  _res.status(200).json({
    success: true,
    message: 'Stats obtenidos correctamente.',
    data: STATS,
  });
}

// ---------------------------------------------------------------------------
// GET /venues/:venueId/transactions/stats
// ---------------------------------------------------------------------------

export async function getTransactionStatsCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  TRANSACTIONS_STATS_QUERY_SCHEMA.parse(_req.query);

  const IS_STAFF = await _venueStaffRepo.isUserStaffOfVenueSV(ACTOR_USER_ID, PARAMS.venueId);
  if (!IS_STAFF) {
    throw new AppError('NO_AUTORIZADO', 'No tienes permisos para ver transacciones de esta sede.', 403);
  }

  const STATS = await _transactionStatsUseCase.executeSV(PARAMS.venueId);

  _res.status(200).json({
    success: true,
    message: 'Stats de transacciones obtenidos correctamente.',
    data: STATS,
  });
}

// ---------------------------------------------------------------------------
// GET /venues/:venueId/transactions/history
// ---------------------------------------------------------------------------

export async function getTransactionHistoryCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = TRANSACTIONS_HISTORY_QUERY_SCHEMA.parse(_req.query);

  const IS_STAFF = await _venueStaffRepo.isUserStaffOfVenueSV(ACTOR_USER_ID, PARAMS.venueId);
  if (!IS_STAFF) {
    throw new AppError('NO_AUTORIZADO', 'No tienes permisos para ver transacciones de esta sede.', 403);
  }

  const SKIP = (QUERY.page - 1) * QUERY.limit;

  const [TOTAL, ROWS] = await PRISMA.$transaction([
    PRISMA.transaction.count({
      where: { match: { court: { venueId: PARAMS.venueId } } },
    }),
    PRISMA.transaction.findMany({
      where: { match: { court: { venueId: PARAMS.venueId } } },
      include: {
        user: { select: { name: true } },
        match: {
          include: {
            court: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: SKIP,
      take: QUERY.limit,
    }),
  ]);

  const items = ROWS.map((tx) => ({
    id: tx.id,
    date: tx.createdAt.toISOString().split('T')[0],
    clientName: tx.user.name.split(' ')[0] + '.', // "Juan P."
    courtName: tx.match.court?.name ?? 'N/A',
    amount: Number(tx.amountTotal),
    status: tx.status,
  }));

  _res.status(200).json({
    success: true,
    message: 'Historial de transacciones obtenido correctamente.',
    data: { items, total: TOTAL },
  });
}

// ---------------------------------------------------------------------------
// PATCH /venues/:venueId
// ---------------------------------------------------------------------------

export async function patchVenueCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPDATE_VENUE_BODY_SCHEMA.parse(_req.body);

  const IS_STAFF = await _venueStaffRepo.isUserStaffOfVenueSV(ACTOR_USER_ID, PARAMS.venueId);
  if (!IS_STAFF) {
    throw new AppError('NO_AUTORIZADO', 'No tienes permisos para editar esta sede.', 403);
  }

  // Zod incluye undefined en optionals; excluimos campos undefined para enviar solo los presentes
  const BODY_FOR_USE_CASE = {
    phone: BODY.phone,
    email: BODY.email,
    description: BODY.description,
    openingHours: BODY.openingHours,
  };
  const RESULT = await _updateVenueUseCase.executeSV(PARAMS.venueId, BODY_FOR_USE_CASE as Parameters<typeof _updateVenueUseCase.executeSV>[1]);

  _res.status(200).json({
    success: true,
    message: 'Sede actualizada correctamente.',
    data: RESULT,
  });
}

// ---------------------------------------------------------------------------
// GET /venues/:venueId/matches (rango from/to para calendario)
// ---------------------------------------------------------------------------

export async function getVenueMatchesCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = VENUE_MATCHES_QUERY_SCHEMA.parse(_req.query);

  const IS_STAFF = await _venueStaffRepo.isUserStaffOfVenueSV(ACTOR_USER_ID, PARAMS.venueId);
  if (!IS_STAFF) {
    throw new AppError('NO_AUTORIZADO', 'No tienes permisos para ver partidos de esta sede.', 403);
  }

  const FILTERS: {
    courtId?: string;
    from?: string;
    to?: string;
    date?: string;
    status?: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  } = {};

  if (QUERY.from !== undefined) FILTERS.from = QUERY.from;
  if (QUERY.to !== undefined) FILTERS.to = QUERY.to;
  if (QUERY.courtId !== undefined) FILTERS.courtId = QUERY.courtId;
  if (QUERY.status !== undefined) FILTERS.status = QUERY.status;

  const PAGE = { page: QUERY.page, limit: QUERY.limit };

  const RESULT = await _listMatchesUseCase.executeSV(
    { venueId: PARAMS.venueId, ...FILTERS, page: PAGE.page, limit: PAGE.limit },
    ACTOR_USER_ID,
  );

  _res.status(200).json({
    success: true,
    message: 'Partidos obtenidos correctamente.',
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
        categoryName: (_item as unknown as { categoryName?: string }).categoryName,
      })),
      pageInfo: RESULT.pageInfo,
    },
  });
}
