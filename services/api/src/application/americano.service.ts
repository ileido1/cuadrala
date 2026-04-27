import type { Prisma } from '../generated/prisma/client.js';

import { AppError } from '../domain/errors/app_error.js';
import { findCategoryByIdRepo } from '../infrastructure/repositories/category.repository.js';
import { findFormatPresetBySportAndCodeRepo } from '../infrastructure/repositories/format_preset.repository.js';
import { createMatchWithParticipantsRepo } from '../infrastructure/repositories/match.repository.js';
import { findSportByCodeRepo, findSportByIdRepo } from '../infrastructure/repositories/sport.repository.js';
import { findTournamentByIdRepo } from '../infrastructure/repositories/tournament.repository.js';
import { findCourtByIdRepo } from '../infrastructure/repositories/court.repository.js';
import { countUsersByIdsRepo } from '../infrastructure/repositories/user.repository.js';

export type CreateAmericanoInput = {
  categoryId: string;
  /** Si se omite y no hay torneo, se usa el deporte PADEL del catálogo. */
  sportId?: string;
  courtId?: string;
  tournamentId?: string;
  scheduledAt?: Date;
  participantUserIds: string[];
};

async function resolveSportFormatAndParametersSV(
  _input: CreateAmericanoInput,
): Promise<{
  sportId: string;
  formatPresetId: string;
  formatParameters?: Prisma.InputJsonValue;
}> {
  if (_input.tournamentId !== undefined) {
    const TOURNAMENT = await findTournamentByIdRepo(_input.tournamentId);
    if (!TOURNAMENT) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }
    if (TOURNAMENT.categoryId !== _input.categoryId) {
      throw new AppError(
        'TORNEO_CATEGORIA_INVALIDA',
        'El torneo no pertenece a la categoría seleccionada.',
        400,
      );
    }
    if (_input.sportId !== undefined && _input.sportId !== TOURNAMENT.sportId) {
      throw new AppError(
        'DEPORTE_TORNEO_CONFLICTO',
        'El deporte enviado no coincide con el del torneo.',
        400,
      );
    }
    const OUT: {
      sportId: string;
      formatPresetId: string;
      formatParameters?: Prisma.InputJsonValue;
    } = {
      sportId: TOURNAMENT.sportId,
      formatPresetId: TOURNAMENT.formatPresetId,
    };
    if (TOURNAMENT.formatParameters !== null && TOURNAMENT.formatParameters !== undefined) {
      OUT.formatParameters = TOURNAMENT.formatParameters as Prisma.InputJsonValue;
    }
    return OUT;
  }

  let RESOLVED_SPORT_ID: string;
  if (_input.sportId !== undefined) {
    const SPORT = await findSportByIdRepo(_input.sportId);
    if (!SPORT) {
      throw new AppError('DEPORTE_NO_ENCONTRADO', 'El deporte indicado no existe.', 404);
    }
    RESOLVED_SPORT_ID = SPORT.id;
  } else {
    const PADEL = await findSportByCodeRepo('PADEL');
    if (PADEL === null) {
      throw new AppError(
        'DEPORTE_NO_CONFIGURADO',
        'No hay deporte PADEL en el catálogo. Ejecute el seed de catálogo.',
        500,
      );
    }
    RESOLVED_SPORT_ID = PADEL.id;
  }

  const PRESET = await findFormatPresetBySportAndCodeRepo(RESOLVED_SPORT_ID, 'AMERICANO');
  if (PRESET === null) {
    throw new AppError(
      'FORMATO_NO_CONFIGURADO',
      'No existe el preset AMERICANO para el deporte seleccionado.',
      500,
    );
  }

  return {
    sportId: RESOLVED_SPORT_ID,
    formatPresetId: PRESET.id,
  };
}

export async function createAmericanoSV(_input: CreateAmericanoInput): Promise<{
  matchId: string;
  status: string;
  type: string;
  sportId: string;
  formatPresetId: string;
  participantCount: number;
}> {
  const CATEGORY = await findCategoryByIdRepo(_input.categoryId);
  if (!CATEGORY) {
    throw new AppError('CATEGORIA_NO_ENCONTRADA', 'La categoría indicada no existe.', 404);
  }

  if (_input.courtId !== undefined) {
    const COURT = await findCourtByIdRepo(_input.courtId);
    if (!COURT) {
      throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha indicada no existe.', 404);
    }
  }

  const UNIQUE_IDS = new Set(_input.participantUserIds);
  if (UNIQUE_IDS.size !== _input.participantUserIds.length) {
    throw new AppError('PARTICIPANTES_DUPLICADOS', 'No se permiten participantes duplicados.', 400);
  }

  const FOUND = await countUsersByIdsRepo(_input.participantUserIds);
  if (FOUND !== _input.participantUserIds.length) {
    throw new AppError('USUARIOS_INVALIDOS', 'Uno o más participantes no existen.', 400);
  }

  const FORMAT = await resolveSportFormatAndParametersSV(_input);

  const CREATE_PAYLOAD: Parameters<typeof createMatchWithParticipantsRepo>[0] = {
    categoryId: _input.categoryId,
    sportId: FORMAT.sportId,
    formatPresetId: FORMAT.formatPresetId,
    participantUserIds: _input.participantUserIds,
  };
  if (FORMAT.formatParameters !== undefined) {
    CREATE_PAYLOAD.formatParameters = FORMAT.formatParameters;
  }
  if (_input.courtId !== undefined) {
    CREATE_PAYLOAD.courtId = _input.courtId;
  }
  if (_input.tournamentId !== undefined) {
    CREATE_PAYLOAD.tournamentId = _input.tournamentId;
  }
  if (_input.scheduledAt !== undefined) {
    CREATE_PAYLOAD.scheduledAt = _input.scheduledAt;
  }

  const CREATED = await createMatchWithParticipantsRepo(CREATE_PAYLOAD);

  return {
    matchId: CREATED.id,
    status: CREATED.status,
    type: CREATED.type,
    sportId: CREATED.sportId,
    formatPresetId: CREATED.formatPresetId ?? FORMAT.formatPresetId,
    participantCount: CREATED.participants.length,
  };
}
