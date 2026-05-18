import type { Request, Response } from 'express';

import type { CurrencyCode } from '../../domain/money/currency_code.js';
import { AppError } from '../../domain/errors/app_error.js';
import { isReservationPaymentLedgerEnabledSV } from '../../config/feature_flags.js';
import { ASSERT_VENUE_STAFF_UC } from '../composition/venue_dashboard.composition.js';
import { CREATE_COMPENSATORY_LEDGER_ADJUSTMENT_UC } from '../composition/reservation_ledger.composition.js';
import {
  COMPENSATORY_LEDGER_BODY_SCHEMA,
  COMPENSATORY_LEDGER_PARAMS_SCHEMA,
} from '../validation/reservation_ledger.validation.js';

export async function postCompensatoryLedgerAdjustmentCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = COMPENSATORY_LEDGER_PARAMS_SCHEMA.parse(_req.params);
  const BODY = COMPENSATORY_LEDGER_BODY_SCHEMA.parse(_req.body);

  if (!isReservationPaymentLedgerEnabledSV()) {
    throw new AppError(
      'FUNCIONALIDAD_NO_DISPONIBLE',
      'El libro mayor de reservas no está activo.',
      503,
    );
  }

  await ASSERT_VENUE_STAFF_UC.executeSV({
    actorUserId: ACTOR_USER_ID,
    venueId: PARAMS.venueId,
    forbiddenMessage: 'No tienes permisos financieros para ajustar el libro mayor.',
  });

  const RESULT = await CREATE_COMPENSATORY_LEDGER_ADJUSTMENT_UC.executeSV({
    venueId: PARAMS.venueId,
    reservationId: PARAMS.reservationId,
    amountMinor: BigInt(BODY.amount.amountMinor),
    currencyCode: BODY.amount.currencyCode as CurrencyCode,
    amountBsMinor: BigInt(BODY.amountBsMinor),
    actorUserId: ACTOR_USER_ID,
    reason: BODY.reason,
  });

  _res.status(201).json({
    success: true,
    message: 'Ajuste compensatorio registrado correctamente.',
    data: RESULT,
  });
}
