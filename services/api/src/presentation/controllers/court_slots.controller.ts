import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { GET_COURT_AVAILABILITY_UC } from '../composition/court_slots.composition.js';
import {
  COURT_SLOTS_PARAMS_SCHEMA,
  COURT_SLOTS_QUERY_SCHEMA,
} from '../validation/court_slots.validation.js';

export async function getCourtSlotsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = COURT_SLOTS_PARAMS_SCHEMA.parse(_req.params ?? {});
  const QUERY = COURT_SLOTS_QUERY_SCHEMA.parse(_req.query ?? {});

  const [yearStr, monthStr, dayStr] = QUERY.date.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const FROM = new Date(year, month - 1, day, 0, 0, 0);
  const TO = new Date(year, month - 1, day, 23, 59, 59);

  const DURATION = QUERY.durationMinutes ?? 60;
  const STEP = QUERY.stepMinutes ?? 30;

  const RESULT = await GET_COURT_AVAILABILITY_UC.executeSV({
    venueId: PARAMS.venueId,
    courtId: PARAMS.courtId,
    from: FROM,
    to: TO,
    durationMinutes: DURATION,
    stepMinutes: STEP,
    ...(QUERY.sportId !== undefined ? { sportId: QUERY.sportId } : {}),
    ...(QUERY.categoryId !== undefined ? { categoryId: QUERY.categoryId } : {}),
  });

  // Flatten courts array (always 1 court) to match spec response shape
  const COURT = RESULT.courts[0];
  if (!COURT) {
    throw new AppError(
      'CANCHA_NO_EN_SEDE',
      'La cancha no pertenece a la sede seleccionada.',
      400,
    );
  }

  _res.status(200).json({
    courtId: COURT.court.id,
    date: QUERY.date,
    durationMinutes: RESULT.durationMinutes,
    stepMinutes: RESULT.stepMinutes,
    slots: COURT.slots.map((s) => ({
      start: s.scheduledAt,
      end: new Date(
        new Date(s.scheduledAt).getTime() + RESULT.durationMinutes * 60_000,
      ).toISOString(),
      isAvailable: s.isAvailable,
      ...(s.reason !== undefined ? { reason: s.reason } : {}),
    })),
  });
}
