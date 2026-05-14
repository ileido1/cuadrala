import { Router } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import type { VenuePaymentMethodRepository } from '../../domain/ports/venue_payment_method_repository.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import {
  createSV as createVenuePaymentMethodSV,
  deleteSV as deleteVenuePaymentMethodSV,
  getNextPositionSV,
  listActiveByVenueSV,
  listByVenueSV,
  updateSV as updateVenuePaymentMethodSV,
} from '../../infrastructure/repositories/venue_payment_method.repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';

const VENUE_STAFF_REPO: VenueStaffRepository = new PrismaVenueStaffRepository();

export const VENUE_PAYMENT_METHOD_ROUTER = Router();

// Helper: verificar que el usuario es staff del venue
async function assertIsStaff(userId: string, venueId: string): Promise<void> {
  const IS_STAFF = await VENUE_STAFF_REPO.isUserStaffOfVenueSV(userId, venueId);
  if (!IS_STAFF) {
    throw new AppError('NO_AUTORIZADO', 'Solo el staff de la sede puede gestionar los métodos de pago.', 403);
  }
}

// GET /venues/:venueId/payment-methods — lista métodos activos
VENUE_PAYMENT_METHOD_ROUTER.get(
  '/venues/:venueId/payment-methods',
  asyncHandler(async (_req, _res) => {
    const VENUE_ID = _req.params.venueId as string;
    const METHODS = await listActiveByVenueSV(VENUE_ID);
    _res.status(200).json({
      success: true,
      data: { items: METHODS },
    });
  }),
);

// GET /venues/:venueId/payment-methods/all — lista todos (incluye inactivos)
VENUE_PAYMENT_METHOD_ROUTER.get(
  '/venues/:venueId/payment-methods/all',
  requireAuth,
  asyncHandler(async (_req, _res) => {
    const VENUE_ID = _req.params.venueId as string;
    const ACTOR_USER_ID = _req.authUser!.id;
    await assertIsStaff(ACTOR_USER_ID, VENUE_ID);
    const METHODS = await listByVenueSV(VENUE_ID);
    _res.status(200).json({
      success: true,
      data: { items: METHODS },
    });
  }),
);

// POST /venues/:venueId/payment-methods — crear método
VENUE_PAYMENT_METHOD_ROUTER.post(
  '/venues/:venueId/payment-methods',
  requireAuth,
  asyncHandler(async (_req, _res) => {
    const VENUE_ID = _req.params.venueId as string;
    const ACTOR_USER_ID = _req.authUser!.id;
    await assertIsStaff(ACTOR_USER_ID, VENUE_ID);

    const { type, name, config } = _req.body as {
      type: string;
      name: string;
      config?: unknown;
    };

    if (!type || !name) {
      throw new AppError('VALIDACION_FALLIDA', 'type y name son requeridos.', 400);
    }

    const VALID_TYPES = ['CASH', 'BANK_TRANSFER', 'PAGO_MOVIL', 'POS', 'OTHER'];
    if (!VALID_TYPES.includes(type)) {
      throw new AppError('VALIDACION_FALLIDA', `type debe ser uno de: ${VALID_TYPES.join(', ')}.`, 400);
    }

    // Validar idType en config si viene presente (BANK_TRANSFER o PAGO_MOVIL)
    if (config != null && typeof config === 'object') {
      const CTYPE = (config as Record<string, unknown>).type as string | undefined;
      const IDTYPE = (config as Record<string, unknown>).idType as string | undefined;
      if (IDTYPE !== undefined) {
        const VALID_ID_TYPES = ['V', 'E', 'P', 'J', 'G', 'R'];
        if (!VALID_ID_TYPES.includes(IDTYPE)) {
          throw new AppError(
            'VALIDACION_FALLIDA',
            `idType debe ser uno de: ${VALID_ID_TYPES.join(', ')}.`,
            400,
          );
        }
      }
      // Validar que config.type coincida con el type del body
      if (CTYPE !== undefined && CTYPE !== type) {
        throw new AppError(
          'VALIDACION_FALLIDA',
          'El type en config no coincide con el type del body.',
          400,
        );
      }
    }

    const POSITION = await getNextPositionSV(VENUE_ID);
    const CREATED = await createVenuePaymentMethodSV({
      venueId: VENUE_ID,
      type: type as 'CASH' | 'BANK_TRANSFER' | 'PAGO_MOVIL' | 'POS' | 'OTHER',
      name,
      config: config as never ?? null,
      position: POSITION,
    });

    _res.status(201).json({
      success: true,
      message: 'Método de pago creado correctamente.',
      data: CREATED,
    });
  }),
);

// PUT /venues/:venueId/payment-methods/:paymentMethodId — actualizar método
VENUE_PAYMENT_METHOD_ROUTER.put(
  '/venues/:venueId/payment-methods/:paymentMethodId',
  requireAuth,
  asyncHandler(async (_req, _res) => {
    const VENUE_ID = _req.params.venueId as string;
    const PAYMENT_METHOD_ID = _req.params.paymentMethodId as string;
    const ACTOR_USER_ID = _req.authUser!.id;
    await assertIsStaff(ACTOR_USER_ID, VENUE_ID);

    const { type, name, config, isActive, position } = _req.body as {
      type?: string;
      name?: string;
      config?: unknown;
      isActive?: boolean;
      position?: number;
    };

    if (type !== undefined) {
      const VALID_TYPES = ['CASH', 'BANK_TRANSFER', 'PAGO_MOVIL', 'POS', 'OTHER'];
      if (!VALID_TYPES.includes(type)) {
        throw new AppError('VALIDACION_FALLIDA', `type debe ser uno de: ${VALID_TYPES.join(', ')}.`, 400);
      }
    }

    // Validar idType en config si viene presente
    if (config != null && typeof config === 'object') {
      const IDTYPE = (config as Record<string, unknown>).idType as string | undefined;
      if (IDTYPE !== undefined) {
        const VALID_ID_TYPES = ['V', 'E', 'P', 'J', 'G', 'R'];
        if (!VALID_ID_TYPES.includes(IDTYPE)) {
          throw new AppError(
            'VALIDACION_FALLIDA',
            `idType debe ser uno de: ${VALID_ID_TYPES.join(', ')}.`,
            400,
          );
        }
      }
    }

    const UPDATED = await updateVenuePaymentMethodSV(PAYMENT_METHOD_ID, {
      ...(type !== undefined && { type: type as 'CASH' | 'BANK_TRANSFER' | 'PAGO_MOVIL' | 'POS' | 'OTHER' }),
      ...(name !== undefined && { name }),
      ...(config !== undefined && { config: config as never }),
      ...(isActive !== undefined && { isActive }),
      ...(position !== undefined && { position }),
    });

    _res.status(200).json({
      success: true,
      message: 'Método de pago actualizado.',
      data: UPDATED,
    });
  }),
);

// DELETE /venues/:venueId/payment-methods/:paymentMethodId — eliminar método
VENUE_PAYMENT_METHOD_ROUTER.delete(
  '/venues/:venueId/payment-methods/:paymentMethodId',
  requireAuth,
  asyncHandler(async (_req, _res) => {
    const VENUE_ID = _req.params.venueId as string;
    const PAYMENT_METHOD_ID = _req.params.paymentMethodId as string;
    const ACTOR_USER_ID = _req.authUser!.id;
    await assertIsStaff(ACTOR_USER_ID, VENUE_ID);
    await deleteVenuePaymentMethodSV(PAYMENT_METHOD_ID);
    _res.status(200).json({
      success: true,
      message: 'Método de pago eliminado.',
    });
  }),
);
