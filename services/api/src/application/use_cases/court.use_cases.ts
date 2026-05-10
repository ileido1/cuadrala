/**
 * Use Cases para Court — US-W1-05 CRUD Courts — PR2
 *
 * Capa de aplicación: orquestan lógica de negocio sin conocer detalles de infraestructura.
 * Cada service naming: [verbo]+[recurso]+UseCase → executeSV().
 */

import { AppError } from '../../domain/errors/app_error.js';
import type { ICourtRepository } from '../../domain/ports/court_repository.js';
import type { Court, CourtStatus, CreateCourtInput, UpdateCourtInput } from '../../domain/entities/court.entity.js';
import { CourtStatus as CourtStatusEnum, SportType } from '../../domain/entities/court.entity.js';

// ---------------------------------------------------------------------------
// CreateCourtSV
// ---------------------------------------------------------------------------

export interface CreateCourtInputDTO {
  venueId: string;
  name: string;
  sportType?: 'PADEL' | 'TENNIS';
  indoor?: boolean;
  lighting?: boolean;
  surfaceType?: string | null;
}

export interface CreateCourtOutputDTO {
  court: Court;
}

export class CreateCourtUseCase {
  constructor(private readonly _courtRepository: ICourtRepository) {}

  async executeSV(_input: CreateCourtInputDTO): Promise<CreateCourtOutputDTO> {
    // Validar name no vacío
    if (!_input.name || _input.name.trim().length === 0) {
      throw new AppError('VALIDACION_FALLIDA', 'El nombre de la cancha es requerido.', 400);
    }
    if (_input.name.length > 120) {
      throw new AppError('VALIDACION_FALLIDA', 'El nombre no puede superar los 120 caracteres.', 400);
    }

    const INPUT: CreateCourtInput = {
      venueId: _input.venueId,
      name: _input.name.trim(),
      ...(_input.sportType !== undefined ? { sportType: _input.sportType === 'TENNIS' ? SportType.TENNIS : SportType.PADEL } : {}),
      ...(_input.indoor !== undefined ? { indoor: _input.indoor } : {}),
      ...(_input.lighting !== undefined ? { lighting: _input.lighting } : {}),
      ...(_input.surfaceType !== undefined ? { surfaceType: _input.surfaceType } : {}),
    };

    const court = await this._courtRepository.create(INPUT);
    return { court };
  }
}

// ---------------------------------------------------------------------------
// ListCourtsSV
// ---------------------------------------------------------------------------

export interface ListCourtsInputDTO {
  venueId: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface ListCourtsOutputDTO {
  courts: Court[];
}

export class ListCourtsUseCase {
  constructor(private readonly _courtRepository: ICourtRepository) {}

  async executeSV(_input: ListCourtsInputDTO): Promise<ListCourtsOutputDTO> {
    let status: CourtStatus | undefined;
    if (_input.status === 'INACTIVE') {
      status = CourtStatusEnum.INACTIVE;
    } else if (_input.status === 'ACTIVE') {
      status = CourtStatusEnum.ACTIVE;
    }

    const courts = await this._courtRepository.findByVenue(_input.venueId, status);
    return { courts };
  }
}

// ---------------------------------------------------------------------------
// UpdateCourtSV
// ---------------------------------------------------------------------------

export interface UpdateCourtInputDTO {
  courtId: string;
  name?: string;
  sportType?: 'PADEL' | 'TENNIS';
  indoor?: boolean;
  lighting?: boolean;
  surfaceType?: string | null;
}

export interface UpdateCourtOutputDTO {
  court: Court;
}

export class UpdateCourtUseCase {
  constructor(private readonly _courtRepository: ICourtRepository) {}

  async executeSV(_input: UpdateCourtInputDTO): Promise<UpdateCourtOutputDTO> {
    // Validar name si viene presente
    if (_input.name !== undefined) {
      if (_input.name.trim().length === 0) {
        throw new AppError('VALIDACION_FALLIDA', 'El nombre de la cancha es requerido.', 400);
      }
      if (_input.name.length > 120) {
        throw new AppError('VALIDACION_FALLIDA', 'El nombre no puede superar los 120 caracteres.', 400);
      }
    }

    // Verificar existencia
    const existing = await this._courtRepository.findById(_input.courtId);
    if (existing === null) {
      throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha indicada no existe.', 404);
    }

    const INPUT: UpdateCourtInput = {
      ...(_input.name !== undefined ? { name: _input.name.trim() } : {}),
      ...(_input.sportType !== undefined ? { sportType: _input.sportType === 'TENNIS' ? SportType.TENNIS : SportType.PADEL } : {}),
      ...(_input.indoor !== undefined ? { indoor: _input.indoor } : {}),
      ...(_input.lighting !== undefined ? { lighting: _input.lighting } : {}),
      ...(_input.surfaceType !== undefined ? { surfaceType: _input.surfaceType } : {}),
    };

    const updated = await this._courtRepository.update(_input.courtId, INPUT);
    return { court: updated };
  }
}

// ---------------------------------------------------------------------------
// CancelCourtSV
// ---------------------------------------------------------------------------

export interface CancelCourtInputDTO {
  courtId: string;
}

export interface CancelCourtOutputDTO {
  court: Court;
}

export class CancelCourtUseCase {
  constructor(private readonly _courtRepository: ICourtRepository) {}

  async executeSV(_input: CancelCourtInputDTO): Promise<CancelCourtOutputDTO> {
    // Verificar existencia
    const existing = await this._courtRepository.findById(_input.courtId);
    if (existing === null) {
      throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha indicada no existe.', 404);
    }

    // Idempotente: si ya está cancelada, retornar la misma entidad
    const court = await this._courtRepository.cancel(_input.courtId);
    return { court };
  }
}
