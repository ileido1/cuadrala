import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import {
  CREATE_PRICING_TIER_BODY_SCHEMA,
  LIST_PRICING_TIERS_QUERY_SCHEMA,
  PRICING_TIER_ID_PARAM_SCHEMA,
  UPDATE_PRICING_TIER_BODY_SCHEMA,
} from '../validation/court_pricing.validation.js';
import { COURT_ID_PARAM_SCHEMA, VENUE_ID_PARAM_SCHEMA } from '../validation/venues.validation.js';

// ---------------------------------------------------------------------------
// GET /venues/:venueId/courts/:courtId/pricing-tiers
// ---------------------------------------------------------------------------

export async function getCourtPricingTiersCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTENTICADO', 'Se requiere autenticación.', 401);
  }

  const PARAMS = {
    ...VENUE_ID_PARAM_SCHEMA.parse(_req.params),
    ...COURT_ID_PARAM_SCHEMA.parse(_req.params),
  };
  LIST_PRICING_TIERS_QUERY_SCHEMA.parse(_req.query);

  // Verificar que la sede existe y el usuario tiene acceso
  const VENUE = await PRISMA.venue.findUnique({
    where: { id: PARAMS.venueId },
    select: { id: true, ownerUserId: true, staff: { select: { userId: true } } },
  });

  if (VENUE === null) {
    throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
  }

  const IS_OWNER_OR_STAFF =
    VENUE.ownerUserId === ACTOR_USER_ID ||
    VENUE.staff.some((_s) => _s.userId === ACTOR_USER_ID);

  if (!IS_OWNER_OR_STAFF) {
    throw new AppError('NO_AUTORIZADO', 'No tienes acceso a esta sede.', 403);
  }

  // Verificar que la cancha pertenece a la sede
  const COURT = await PRISMA.court.findUnique({
    where: { id: PARAMS.courtId },
    select: { id: true, venueId: true },
  });

  if (COURT === null) {
    throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha indicada no existe.', 404);
  }

  if (COURT.venueId !== PARAMS.venueId) {
    throw new AppError('CANCHA_NO_PERTENECE_A_SEDE', 'La cancha no pertenece a esta sede.', 400);
  }

  // Obtener las tarifas ordenadas por startTime
  const TIERS = await PRISMA.courtPricingTier.findMany({
    where: { courtId: PARAMS.courtId },
    orderBy: { startTime: 'asc' },
  });

  _res.status(200).json({
    success: true,
    message: 'Tarifas obtenidas correctamente.',
    data: { items: TIERS },
  });
}

// ---------------------------------------------------------------------------
// POST /venues/:venueId/courts/:courtId/pricing-tiers
// ---------------------------------------------------------------------------

export async function postCourtPricingTierCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTENTICADO', 'Se requiere autenticación.', 401);
  }

  const PARAMS = {
    ...VENUE_ID_PARAM_SCHEMA.parse(_req.params),
    ...COURT_ID_PARAM_SCHEMA.parse(_req.params),
  };
  const BODY = CREATE_PRICING_TIER_BODY_SCHEMA.parse(_req.body);

  // Verificar que la sede existe y el usuario tiene acceso
  const VENUE = await PRISMA.venue.findUnique({
    where: { id: PARAMS.venueId },
    select: { id: true, ownerUserId: true, staff: { select: { userId: true } } },
  });

  if (VENUE === null) {
    throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
  }

  const IS_OWNER_OR_STAFF =
    VENUE.ownerUserId === ACTOR_USER_ID ||
    VENUE.staff.some((_s) => _s.userId === ACTOR_USER_ID);

  if (!IS_OWNER_OR_STAFF) {
    throw new AppError('NO_AUTORIZADO', 'No tienes acceso a esta sede.', 403);
  }

  // Verificar que la cancha existe y pertenece a la sede
  const COURT = await PRISMA.court.findUnique({
    where: { id: PARAMS.courtId },
    select: { id: true, venueId: true },
  });

  if (COURT === null) {
    throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha indicada no existe.', 404);
  }

  if (COURT.venueId !== PARAMS.venueId) {
    throw new AppError('CANCHA_NO_PERTENECE_A_SEDE', 'La cancha no pertenece a esta sede.', 400);
  }

  // Validar que startTime < endTime
  if (BODY.startTime >= BODY.endTime) {
    throw new AppError(
      'HORA_INVALIDA',
      'La hora de inicio debe ser menor que la hora de fin.',
      400
    );
  }

  const CREATED = await PRISMA.courtPricingTier.create({
    data: {
      courtId: PARAMS.courtId,
      label: BODY.label,
      startTime: BODY.startTime,
      endTime: BODY.endTime,
      pricePerHourCents: BODY.pricePerHourCents,
    },
  });

  _res.status(201).json({
    success: true,
    message: 'Tarifa creada correctamente.',
    data: CREATED,
  });
}

// ---------------------------------------------------------------------------
// PUT /venues/:venueId/courts/:courtId/pricing-tiers/:tierId
// ---------------------------------------------------------------------------

export async function putCourtPricingTierCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTENTICADO', 'Se requiere autenticación.', 401);
  }

  const PARAMS = {
    ...VENUE_ID_PARAM_SCHEMA.parse(_req.params),
    ...COURT_ID_PARAM_SCHEMA.parse(_req.params),
    ...PRICING_TIER_ID_PARAM_SCHEMA.parse(_req.params),
  };
  const BODY = UPDATE_PRICING_TIER_BODY_SCHEMA.parse(_req.body);

  // Verificar que la sede existe y el usuario tiene acceso
  const VENUE = await PRISMA.venue.findUnique({
    where: { id: PARAMS.venueId },
    select: { id: true, ownerUserId: true, staff: { select: { userId: true } } },
  });

  if (VENUE === null) {
    throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
  }

  const IS_OWNER_OR_STAFF =
    VENUE.ownerUserId === ACTOR_USER_ID ||
    VENUE.staff.some((_s) => _s.userId === ACTOR_USER_ID);

  if (!IS_OWNER_OR_STAFF) {
    throw new AppError('NO_AUTORIZADO', 'No tienes acceso a esta sede.', 403);
  }

  // Verificar que la cancha existe y pertenece a la sede
  const COURT = await PRISMA.court.findUnique({
    where: { id: PARAMS.courtId },
    select: { id: true, venueId: true },
  });

  if (COURT === null) {
    throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha indicada no existe.', 404);
  }

  if (COURT.venueId !== PARAMS.venueId) {
    throw new AppError('CANCHA_NO_PERTENECE_A_SEDE', 'La cancha no pertenece a esta sede.', 400);
  }

  // Verificar que la tarifa existe y pertenece a la cancha
  const TIER = await PRISMA.courtPricingTier.findUnique({
    where: { id: PARAMS.tierId },
    select: { id: true, courtId: true },
  });

  if (TIER === null) {
    throw new AppError('TARIFA_NO_ENCONTRADA', 'La tarifa indicada no existe.', 404);
  }

  if (TIER.courtId !== PARAMS.courtId) {
    throw new AppError('TARIFA_NO_PERTENECE_A_CANCHA', 'La tarifa no pertenece a esta cancha.', 400);
  }

  // Validar que startTime < endTime si se actualizan
  const CURRENT_TIER = await PRISMA.courtPricingTier.findUnique({
    where: { id: PARAMS.tierId },
  });

  if (CURRENT_TIER === null) {
    throw new AppError('TARIFA_NO_ENCONTRADA', 'La tarifa indicada no existe.', 404);
  }

  const START_TO_VALIDATE = BODY.startTime ?? CURRENT_TIER.startTime;
  const END_TO_VALIDATE = BODY.endTime ?? CURRENT_TIER.endTime;

  if (START_TO_VALIDATE >= END_TO_VALIDATE) {
    throw new AppError(
      'HORA_INVALIDA',
      'La hora de inicio debe ser menor que la hora de fin.',
      400
    );
  }

  const UPDATED = await PRISMA.courtPricingTier.update({
    where: { id: PARAMS.tierId },
    data: {
      ...(BODY.label !== undefined ? { label: BODY.label } : {}),
      ...(BODY.startTime !== undefined ? { startTime: BODY.startTime } : {}),
      ...(BODY.endTime !== undefined ? { endTime: BODY.endTime } : {}),
      ...(BODY.pricePerHourCents !== undefined ? { pricePerHourCents: BODY.pricePerHourCents } : {}),
    },
  });

  _res.status(200).json({
    success: true,
    message: 'Tarifa actualizada correctamente.',
    data: UPDATED,
  });
}

// ---------------------------------------------------------------------------
// DELETE /venues/:venueId/courts/:courtId/pricing-tiers/:tierId
// ---------------------------------------------------------------------------

export async function deleteCourtPricingTierCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTENTICADO', 'Se requiere autenticación.', 401);
  }

  const PARAMS = {
    ...VENUE_ID_PARAM_SCHEMA.parse(_req.params),
    ...COURT_ID_PARAM_SCHEMA.parse(_req.params),
    ...PRICING_TIER_ID_PARAM_SCHEMA.parse(_req.params),
  };

  // Verificar que la sede existe y el usuario tiene acceso
  const VENUE = await PRISMA.venue.findUnique({
    where: { id: PARAMS.venueId },
    select: { id: true, ownerUserId: true, staff: { select: { userId: true } } },
  });

  if (VENUE === null) {
    throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
  }

  const IS_OWNER_OR_STAFF =
    VENUE.ownerUserId === ACTOR_USER_ID ||
    VENUE.staff.some((_s) => _s.userId === ACTOR_USER_ID);

  if (!IS_OWNER_OR_STAFF) {
    throw new AppError('NO_AUTORIZADO', 'No tienes acceso a esta sede.', 403);
  }

  // Verificar que la cancha existe y pertenece a la sede
  const COURT = await PRISMA.court.findUnique({
    where: { id: PARAMS.courtId },
    select: { id: true, venueId: true },
  });

  if (COURT === null) {
    throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha indicada no existe.', 404);
  }

  if (COURT.venueId !== PARAMS.venueId) {
    throw new AppError('CANCHA_NO_PERTENECE_A_SEDE', 'La cancha no pertenece a esta sede.', 400);
  }

  // Verificar que la tarifa existe y pertenece a la cancha
  const TIER = await PRISMA.courtPricingTier.findUnique({
    where: { id: PARAMS.tierId },
    select: { id: true, courtId: true },
  });

  if (TIER === null) {
    throw new AppError('TARIFA_NO_ENCONTRADA', 'La tarifa indicada no existe.', 404);
  }

  if (TIER.courtId !== PARAMS.courtId) {
    throw new AppError('TARIFA_NO_PERTENECE_A_CANCHA', 'La tarifa no pertenece a esta cancha.', 400);
  }

  await PRISMA.courtPricingTier.delete({
    where: { id: PARAMS.tierId },
  });

  _res.status(200).json({
    success: true,
    message: 'Tarifa eliminada correctamente.',
    data: null,
  });
}
