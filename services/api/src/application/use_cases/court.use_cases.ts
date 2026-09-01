/**
 * Use Cases para Court — US-W1-05 CRUD Courts — PR2
 *
 * Capa de aplicación: orquestan lógica de negocio sin conocer detalles de infraestructura.
 * Cada service naming: [verbo]+[recurso]+UseCase → executeSV().
 */

import { AppError } from '../../domain/errors/app_error.js';
import type { ICourtRepository } from '../../domain/ports/court_repository.js';
import type { VenueRepository } from '../../domain/ports/venue_repository.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import {
  assertVenueStaffAndCourtSV,
  assertVenueStaffSV,
} from '../helpers/assert_venue_court_access.js';
import type {
  Court,
  CreateCourtInput,
  UpdateCourtInput,
} from '../../domain/entities/booking/court.entity.js';
import {
  CourtStatus,
  courtStatusFromStringSV,
  SportType,
  sportTypeFromStringSV,
} from '../../domain/entities/booking/court.entity.js';

//? ---------------------------------------------------------------------------
//? CreateCourtSV
//? ---------------------------------------------------------------------------

export interface CreateCourtInputDTO {
  venueId: string;
  actorUserId: string;
  name: string;
  sportType?: `${SportType}`;
  indoor?: boolean;
  lighting?: boolean;
  surfaceType?: string | null;
  pricePerHourCents?: number | null;
  capacity?: string | null;
  durationMinutes?: number;
}

export interface CreateCourtOutputDTO {
  court: Court;
}

export class CreateCourtUseCase {
  constructor(
    private readonly _courtRepository: ICourtRepository,
    private readonly _venueRepository: VenueRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  /**
   * @name    :executeSV
   * @version :1.0.0
   * @description :Crea una cancha en una sede. Solo el staff de esa sede.
   * @param {CreateCourtInputDTO} _input - Datos de entrada del caso de uso
   * @return {Promise<CreateCourtOutputDTO>}
   * @throws {AppError} 403 si el actor no es staff, 404 si la sede no existe
   */
  async executeSV(_input: CreateCourtInputDTO): Promise<CreateCourtOutputDTO> {
    //? Autorizacion antes que la lectura: si el 404 saliera primero, el codigo
    //? de respuesta le diria a un no-staff que sedes existen y cuales no.
    await assertVenueStaffSV(_input.actorUserId, _input.venueId, this._venueStaffRepository);

    const VENUE = await this._venueRepository.findByIdSV(_input.venueId);
    if (VENUE === null) {
      throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
    }

    //? Validar name no vacío
    if (!_input.name || _input.name.trim().length === 0) {
      throw new AppError('VALIDACION_FALLIDA', 'El nombre de la cancha es requerido.', 400);
    }
    if (_input.name.length > 120) {
      throw new AppError(
        'VALIDACION_FALLIDA',
        'El nombre no puede superar los 120 caracteres.',
        400,
      );
    }

    const INPUT: CreateCourtInput = {
      venueId: _input.venueId,
      name: _input.name.trim(),
      ...(_input.sportType !== undefined
        ? { sportType: sportTypeFromStringSV(_input.sportType) }
        : {}),
      ...(_input.indoor !== undefined ? { indoor: _input.indoor } : {}),
      ...(_input.lighting !== undefined ? { lighting: _input.lighting } : {}),
      ...(_input.surfaceType !== undefined ? { surfaceType: _input.surfaceType } : {}),
      ...(_input.pricePerHourCents !== undefined
        ? { pricePerHourCents: _input.pricePerHourCents }
        : {}),
      ...(_input.capacity !== undefined ? { capacity: _input.capacity } : {}),
      ...(_input.durationMinutes !== undefined ? { durationMinutes: _input.durationMinutes } : {}),
    };

    const COURT = await this._courtRepository.create(INPUT);
    return { court: COURT };
  }
}

//? ---------------------------------------------------------------------------
//? ListCourtsSV
//? ---------------------------------------------------------------------------

export interface ListCourtsInputDTO {
  venueId: string;
  status?: `${CourtStatus}`;
}

export interface ListCourtsOutputDTO {
  courts: Court[];
}

export class ListCourtsUseCase {
  constructor(
    private readonly _courtRepository: ICourtRepository,
    private readonly _venueRepository: VenueRepository,
  ) {}

  /**
   * @name    :executeSV
   * @version :1.0.0
   * @description :Lista las canchas de una sede, con filtro opcional por estado.
   * @param {ListCourtsInputDTO} _input - Datos de entrada del caso de uso
   * @return {Promise<ListCourtsOutputDTO>}
   */
  async executeSV(_input: ListCourtsInputDTO): Promise<ListCourtsOutputDTO> {
    const VENUE = await this._venueRepository.findByIdSV(_input.venueId);
    if (VENUE === null) {
      throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
    }

    const STATUS = _input.status !== undefined ? courtStatusFromStringSV(_input.status) : undefined;

    const COURTS = await this._courtRepository.findByVenue(_input.venueId, STATUS);
    return { courts: COURTS };
  }
}

//? ---------------------------------------------------------------------------
//? UpdateCourtSV
//? ---------------------------------------------------------------------------

export interface UpdateCourtInputDTO {
  venueId: string;
  courtId: string;
  actorUserId: string;
  //? `| undefined` explicito: con exactOptionalPropertyTypes el controller
  //? esparce el body tal cual, y sin esto haria falta un cast que apaga el
  //? chequeo de propiedades faltantes en una ruta de autorizacion.
  name?: string | undefined;
  sportType?: `${SportType}` | undefined;
  indoor?: boolean | undefined;
  lighting?: boolean | undefined;
  surfaceType?: string | null | undefined;
  pricePerHourCents?: number | null | undefined;
  capacity?: string | null | undefined;
  durationMinutes?: number | undefined;
  status?: `${CourtStatus}` | undefined;
}

export interface UpdateCourtOutputDTO {
  court: Court;
}

export class UpdateCourtUseCase {
  constructor(
    private readonly _courtRepository: ICourtRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  /**
   * @name    :executeSV
   * @version :1.0.0
   * @description :Actualiza los datos de una cancha existente. Solo el staff de
   * la sede dueña de la cancha.
   * @param {UpdateCourtInputDTO} _input - Datos de entrada del caso de uso
   * @return {Promise<UpdateCourtOutputDTO>}
   * @throws {AppError} 403 si el actor no es staff, 400 si la cancha es de otra sede
   */
  async executeSV(_input: UpdateCourtInputDTO): Promise<UpdateCourtOutputDTO> {
    //? Autorizacion antes que nada: no confirmar ni negar datos de la cancha a
    //? quien no tiene acceso a la sede.
    await assertVenueStaffAndCourtSV(
      {
        venueId: _input.venueId,
        courtId: _input.courtId,
        actorUserId: _input.actorUserId,
      },
      this._venueStaffRepository,
      this._courtRepository,
    );

    //? Validar name si viene presente
    if (_input.name !== undefined) {
      if (_input.name.trim().length === 0) {
        throw new AppError('VALIDACION_FALLIDA', 'El nombre de la cancha es requerido.', 400);
      }
      if (_input.name.length > 120) {
        throw new AppError(
          'VALIDACION_FALLIDA',
          'El nombre no puede superar los 120 caracteres.',
          400,
        );
      }
    }

    const INPUT: UpdateCourtInput = {
      ...(_input.name !== undefined ? { name: _input.name.trim() } : {}),
      ...(_input.sportType !== undefined
        ? { sportType: sportTypeFromStringSV(_input.sportType) }
        : {}),
      ...(_input.indoor !== undefined ? { indoor: _input.indoor } : {}),
      ...(_input.lighting !== undefined ? { lighting: _input.lighting } : {}),
      ...(_input.surfaceType !== undefined ? { surfaceType: _input.surfaceType } : {}),
      ...(_input.pricePerHourCents !== undefined
        ? { pricePerHourCents: _input.pricePerHourCents }
        : {}),
      ...(_input.capacity !== undefined ? { capacity: _input.capacity } : {}),
      ...(_input.durationMinutes !== undefined ? { durationMinutes: _input.durationMinutes } : {}),
      ...(_input.status !== undefined ? { status: courtStatusFromStringSV(_input.status) } : {}),
    };

    const UPDATED = await this._courtRepository.update(_input.courtId, INPUT);
    return { court: UPDATED };
  }
}

//? ---------------------------------------------------------------------------
//? CancelCourtSV
//? ---------------------------------------------------------------------------

export interface CancelCourtInputDTO {
  venueId: string;
  courtId: string;
  actorUserId: string;
}

export interface CancelCourtOutputDTO {
  court: Court;
}

export class CancelCourtUseCase {
  constructor(
    private readonly _courtRepository: ICourtRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  /**
   * @name    :executeSV
   * @version :1.0.0
   * @description :Da de baja una cancha. Solo el staff de la sede dueña.
   * Idempotente: si ya está cancelada devuelve la misma entidad.
   * @param {CancelCourtInputDTO} _input - Datos de entrada del caso de uso
   * @return {Promise<CancelCourtOutputDTO>}
   * @throws {AppError} 403 si el actor no es staff, 400 si la cancha es de otra sede
   */
  async executeSV(_input: CancelCourtInputDTO): Promise<CancelCourtOutputDTO> {
    //? Autorizacion + existencia + pertenencia a la sede, en un solo lugar.
    await assertVenueStaffAndCourtSV(
      {
        venueId: _input.venueId,
        courtId: _input.courtId,
        actorUserId: _input.actorUserId,
      },
      this._venueStaffRepository,
      this._courtRepository,
    );

    //? Idempotente: si ya está cancelada, retornar la misma entidad
    const COURT = await this._courtRepository.cancel(_input.courtId);
    return { court: COURT };
  }
}
