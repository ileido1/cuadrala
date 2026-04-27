import type { Prisma } from '../generated/prisma/client.js';

import { AppError } from '../domain/errors/app_error.js';
import { findFormatPresetByIdRepo } from '../infrastructure/repositories/format_preset.repository.js';
import { findCategoryByIdRepo } from '../infrastructure/repositories/category.repository.js';
import { findSportByIdRepo } from '../infrastructure/repositories/sport.repository.js';
import { createTournamentRepo } from '../infrastructure/repositories/tournament.repository.js';

export type CreateParametrizedTournamentInput = {
  name: string;
  categoryId: string;
  sportId: string;
  formatPresetId: string;
  formatParameters?: Prisma.InputJsonValue;
  startsAt?: Date;
};

/** Crea un torneo con formato parametrizable (preset + parámetros opcionales). */
export async function createParametrizedTournamentSV(
  _input: CreateParametrizedTournamentInput,
): Promise<{
  tournamentId: string;
  sportId: string;
  formatPresetId: string;
  presetSchemaVersion: number;
  status: string;
}> {
  const CATEGORY = await findCategoryByIdRepo(_input.categoryId);
  if (!CATEGORY) {
    throw new AppError('CATEGORIA_NO_ENCONTRADA', 'La categoría indicada no existe.', 404);
  }

  const SPORT = await findSportByIdRepo(_input.sportId);
  if (!SPORT) {
    throw new AppError('DEPORTE_NO_ENCONTRADO', 'El deporte indicado no existe.', 404);
  }

  const PRESET = await findFormatPresetByIdRepo(_input.formatPresetId);
  if (!PRESET) {
    throw new AppError('FORMATO_NO_ENCONTRADO', 'El formato de torneo indicado no existe.', 404);
  }

  if (PRESET.sportId !== _input.sportId) {
    throw new AppError(
      'FORMATO_DEPORTE_INVALIDO',
      'El formato no pertenece al deporte seleccionado.',
      400,
    );
  }

  if (!PRESET.isActive) {
    throw new AppError('FORMATO_INACTIVO', 'El formato de torneo no está activo.', 400);
  }

  const CREATED = await createTournamentRepo({
    name: _input.name,
    categoryId: _input.categoryId,
    sportId: _input.sportId,
    formatPresetId: _input.formatPresetId,
    presetSchemaVersion: PRESET.schemaVersion,
    ...(_input.formatParameters !== undefined
      ? { formatParameters: _input.formatParameters }
      : {}),
    ...(_input.startsAt !== undefined ? { startsAt: _input.startsAt } : {}),
  });

  return {
    tournamentId: CREATED.id,
    sportId: CREATED.sportId,
    formatPresetId: CREATED.formatPresetId,
    presetSchemaVersion: CREATED.presetSchemaVersion,
    status: CREATED.status,
  };
}
