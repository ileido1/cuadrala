/**
 * Unit tests para Court Use Cases — US-W1-05 CRUD Courts — PR2
 *
 * Test pattern: TDD Red-Green-Refactor con Vitest.
 * Usa mocks de ICourtRepository para aislar los use cases.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AppError } from '../../domain/errors/app_error.js';
import { CourtStatus, SportType, type Court } from '../../domain/entities/booking/court.entity.js';
import {
  CreateCourtUseCase,
  type CreateCourtInputDTO,
  ListCourtsUseCase,
  UpdateCourtUseCase,
  type UpdateCourtInputDTO,
  CancelCourtUseCase,
  type CancelCourtInputDTO,
} from '../../application/use_cases/court.use_cases.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mock factory para ICourtRepository. */
function createMockRepository() {
  return {
    findById: vi.fn<() => Promise<Court | null>>(),
    findByVenue: vi.fn<() => Promise<Court[]>>(),
    create: vi.fn<() => Promise<Court>>(),
    update: vi.fn<() => Promise<Court>>(),
    cancel: vi.fn<() => Promise<Court>>(),
  };
}

function createMockVenueRepository() {
  return {
    findByIdSV: vi.fn().mockResolvedValue({ id: 'venue-1', name: 'Venue' }),
    getOpeningHoursSV: vi.fn().mockResolvedValue(null),
    updateSV: vi.fn(),
    getPaymentInfoSV: vi.fn(),
    listVenuesSV: vi.fn(),
    listVenuesNearSV: vi.fn(),
    listVenuesForUserSV: vi.fn(),
    createVenueSV: vi.fn(),
    getVenueDetailSV: vi.fn(),
    getPaymentInfoWithNameSV: vi.fn(),
  };
}

/** Mock factory para VenueStaffRepository. Por defecto el actor SI es staff. */
function createMockVenueStaffRepository(_isStaff = true) {
  return {
    isUserStaffOfVenueSV: vi.fn().mockResolvedValue(_isStaff),
    upsertSV: vi.fn(),
    findByVenueAndUserSV: vi.fn(),
    listByUserIdSV: vi.fn(),
    removeByVenueAndUserSV: vi.fn(),
  };
}

/** Actor usado en todos los casos felices: staff de venue-1. */
const ACTOR_USER_ID = 'user-staff-1';

/** Fixture Court activa. */
function activeCourt(overrides: Partial<Court> = {}): Court {
  return {
    id: 'court-1',
    venueId: 'venue-1',
    name: 'Cancha 1',
    sportType: SportType.PADEL,
    indoor: false,
    lighting: false,
    surfaceType: null,
    status: CourtStatus.ACTIVE,
    pricePerHourCents: null,
    capacity: null,
    durationMinutes: 60,
    createdAt: new Date('2025-01-01'),
    pricingTiers: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// CreateCourtUseCase
// ---------------------------------------------------------------------------

describe('CreateCourtUseCase', () => {
  let repo: ReturnType<typeof createMockRepository>;
  let staffRepo: ReturnType<typeof createMockVenueStaffRepository>;
  let venueRepo: ReturnType<typeof createMockVenueRepository>;
  let useCase: CreateCourtUseCase;

  beforeEach(() => {
    repo = createMockRepository();
    venueRepo = createMockVenueRepository();
    staffRepo = createMockVenueStaffRepository();
    useCase = new CreateCourtUseCase(repo, venueRepo, staffRepo);
  });

  it('should create court with defaults (sportType=PADEL, indoor=false, lighting=false, status=ACTIVE) when only name provided', async () => {
    const input: CreateCourtInputDTO = {
      venueId: 'venue-1',
      actorUserId: ACTOR_USER_ID,
      name: 'Nueva Cancha',
    };
    const expected = activeCourt({ name: 'Nueva Cancha' });
    repo.create.mockResolvedValue(expected);

    const result = await useCase.executeSV(input);

    //? `actorUserId` es solo para autorizar: no viaja al repositorio.
    expect(repo.create).toHaveBeenCalledWith({
      venueId: 'venue-1',
      name: 'Nueva Cancha',
      sportType: undefined, // usa default del repo
      indoor: undefined,
      lighting: undefined,
      surfaceType: undefined,
    });
    expect(result.court.name).toBe('Nueva Cancha');
    expect(result.court.status).toBe(CourtStatus.ACTIVE);
  });

  it('should create court with all provided fields', async () => {
    const input: CreateCourtInputDTO = {
      venueId: 'venue-1',
      actorUserId: ACTOR_USER_ID,
      name: 'Cancha Techada',
      sportType: 'TENNIS',
      indoor: true,
      lighting: true,
      surfaceType: 'arcilla',
    };
    const expected = activeCourt({
      name: 'Cancha Techada',
      sportType: SportType.TENNIS,
      indoor: true,
      lighting: true,
      surfaceType: 'arcilla',
    });
    repo.create.mockResolvedValue(expected);

    const result = await useCase.executeSV(input);

    expect(result.court.sportType).toBe(SportType.TENNIS);
    expect(result.court.indoor).toBe(true);
    expect(result.court.lighting).toBe(true);
    expect(result.court.surfaceType).toBe('arcilla');
  });

  it('should throw VALIDACION_FALLIDA when name is empty', async () => {
    const input: CreateCourtInputDTO = {
      venueId: 'venue-1',
      actorUserId: ACTOR_USER_ID,
      name: '   ',
    };

    await expect(useCase.executeSV(input)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input)).rejects.toThrow('El nombre de la cancha es requerido.');
  });

  it('should throw VALIDACION_FALLIDA when name exceeds 120 characters', async () => {
    const input: CreateCourtInputDTO = {
      venueId: 'venue-1',
      actorUserId: ACTOR_USER_ID,
      name: 'A'.repeat(121),
    };

    await expect(useCase.executeSV(input)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input)).rejects.toThrow(
      'El nombre no puede superar los 120 caracteres.',
    );
  });
});

// ---------------------------------------------------------------------------
// ListCourtsUseCase
// ---------------------------------------------------------------------------

describe('ListCourtsUseCase', () => {
  let repo: ReturnType<typeof createMockRepository>;
  let venueRepo: ReturnType<typeof createMockVenueRepository>;
  let useCase: ListCourtsUseCase;

  beforeEach(() => {
    repo = createMockRepository();
    venueRepo = createMockVenueRepository();
    useCase = new ListCourtsUseCase(repo, venueRepo);
  });

  it('should list all courts for a venue when no status filter provided', async () => {
    const courts = [activeCourt(), activeCourt({ id: 'court-2', name: 'Cancha 2' })];
    repo.findByVenue.mockResolvedValue(courts);

    const result = await useCase.executeSV({ venueId: 'venue-1' });

    expect(repo.findByVenue).toHaveBeenCalledWith('venue-1', undefined);
    expect(result.courts).toHaveLength(2);
  });

  it('should filter by ACTIVE status', async () => {
    repo.findByVenue.mockResolvedValue([activeCourt()]);

    await useCase.executeSV({ venueId: 'venue-1', status: 'ACTIVE' });

    expect(repo.findByVenue).toHaveBeenCalledWith('venue-1', CourtStatus.ACTIVE);
  });

  it('should filter by INACTIVE status', async () => {
    repo.findByVenue.mockResolvedValue([activeCourt({ status: CourtStatus.INACTIVE })]);

    await useCase.executeSV({ venueId: 'venue-1', status: 'INACTIVE' });

    expect(repo.findByVenue).toHaveBeenCalledWith('venue-1', CourtStatus.INACTIVE);
  });
});

// ---------------------------------------------------------------------------
// UpdateCourtUseCase
// ---------------------------------------------------------------------------

describe('UpdateCourtUseCase', () => {
  let repo: ReturnType<typeof createMockRepository>;
  let staffRepo: ReturnType<typeof createMockVenueStaffRepository>;
  let useCase: UpdateCourtUseCase;

  beforeEach(() => {
    repo = createMockRepository();
    staffRepo = createMockVenueStaffRepository();
    useCase = new UpdateCourtUseCase(repo, staffRepo);
  });

  it('should update court name', async () => {
    const input: UpdateCourtInputDTO = {
      venueId: 'venue-1',
      courtId: 'court-1',
      actorUserId: ACTOR_USER_ID,
      name: 'Cancha Renombrada',
    };
    const updated = activeCourt({ name: 'Cancha Renombrada' });
    repo.findById.mockResolvedValue(activeCourt());
    repo.update.mockResolvedValue(updated);

    const result = await useCase.executeSV(input);

    expect(result.court.name).toBe('Cancha Renombrada');
    expect(repo.update).toHaveBeenCalledWith('court-1', { name: 'Cancha Renombrada' });
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateCourtInputDTO = {
      venueId: 'venue-1',
      courtId: 'court-1',
      actorUserId: ACTOR_USER_ID,
      name: 'Cancha Mixta',
      sportType: 'TENNIS',
      indoor: true,
      lighting: true,
      surfaceType: 'cemento',
    };
    const updated = activeCourt({
      name: 'Cancha Mixta',
      sportType: SportType.TENNIS,
      indoor: true,
      lighting: true,
      surfaceType: 'cemento',
    });
    repo.findById.mockResolvedValue(activeCourt());
    repo.update.mockResolvedValue(updated);

    const result = await useCase.executeSV(input);

    expect(result.court.sportType).toBe(SportType.TENNIS);
    expect(result.court.indoor).toBe(true);
    expect(result.court.lighting).toBe(true);
  });

  it('should throw CANCHA_NO_ENCONTRADA when court does not exist', async () => {
    const input: UpdateCourtInputDTO = {
      venueId: 'venue-1',
      courtId: 'unknown',
      actorUserId: ACTOR_USER_ID,
      name: 'Test',
    };
    repo.findById.mockResolvedValue(null);

    await expect(useCase.executeSV(input)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input)).rejects.toThrow('La cancha indicada no existe.');
  });

  it('should throw VALIDACION_FALLIDA when name is empty string', async () => {
    const input: UpdateCourtInputDTO = {
      venueId: 'venue-1',
      courtId: 'court-1',
      actorUserId: ACTOR_USER_ID,
      name: '',
    };
    repo.findById.mockResolvedValue(activeCourt());

    await expect(useCase.executeSV(input)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input)).rejects.toThrow('El nombre de la cancha es requerido.');
  });
});

// ---------------------------------------------------------------------------
// CancelCourtUseCase
// ---------------------------------------------------------------------------

describe('CancelCourtUseCase', () => {
  let repo: ReturnType<typeof createMockRepository>;
  let staffRepo: ReturnType<typeof createMockVenueStaffRepository>;
  let useCase: CancelCourtUseCase;

  beforeEach(() => {
    repo = createMockRepository();
    staffRepo = createMockVenueStaffRepository();
    useCase = new CancelCourtUseCase(repo, staffRepo);
  });

  it('should cancel an active court (soft-delete)', async () => {
    const input: CancelCourtInputDTO = {
      venueId: 'venue-1',
      courtId: 'court-1',
      actorUserId: ACTOR_USER_ID,
    };
    const cancelled = activeCourt({ status: CourtStatus.INACTIVE });
    repo.findById.mockResolvedValue(activeCourt());
    repo.cancel.mockResolvedValue(cancelled);

    const result = await useCase.executeSV(input);

    expect(result.court.status).toBe(CourtStatus.INACTIVE);
    expect(repo.cancel).toHaveBeenCalledWith('court-1');
  });

  it('should be idempotent: cancelling already INACTIVE court returns 200', async () => {
    const input: CancelCourtInputDTO = {
      venueId: 'venue-1',
      courtId: 'court-1',
      actorUserId: ACTOR_USER_ID,
    };
    const alreadyInactive = activeCourt({ status: CourtStatus.INACTIVE });
    repo.findById.mockResolvedValue(alreadyInactive);
    repo.cancel.mockResolvedValue(alreadyInactive);

    const result = await useCase.executeSV(input);

    // El use case no lanza error — idempotencia garantizada por el repo
    expect(result.court.status).toBe(CourtStatus.INACTIVE);
    expect(repo.cancel).toHaveBeenCalledWith('court-1');
  });

  it('should throw CANCHA_NO_ENCONTRADA when court does not exist', async () => {
    const input: CancelCourtInputDTO = {
      venueId: 'venue-1',
      courtId: 'unknown',
      actorUserId: ACTOR_USER_ID,
    };
    repo.findById.mockResolvedValue(null);

    await expect(useCase.executeSV(input)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input)).rejects.toThrow('La cancha indicada no existe.');
  });
});

// ---------------------------------------------------------------------------
// Autorización — solo staff de la sede, y solo sobre canchas de esa sede
// ---------------------------------------------------------------------------

describe('Court write authorization', () => {
  let repo: ReturnType<typeof createMockRepository>;
  let venueRepo: ReturnType<typeof createMockVenueRepository>;

  beforeEach(() => {
    repo = createMockRepository();
    venueRepo = createMockVenueRepository();
  });

  it('should throw 403 when creating a court on a venue the actor is not staff of', async () => {
    const useCase = new CreateCourtUseCase(repo, venueRepo, createMockVenueStaffRepository(false));

    await expect(
      useCase.executeSV({ venueId: 'venue-1', actorUserId: 'intruso', name: 'Cancha' }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('should throw 403 (not 404) when the venue does not exist and the actor is not staff', async () => {
    //? Si el 404 saliera primero, el codigo de respuesta revelaria que sedes
    //? existen a alguien que no tiene acceso a ninguna.
    venueRepo.findByIdSV.mockResolvedValue(null);
    const useCase = new CreateCourtUseCase(repo, venueRepo, createMockVenueStaffRepository(false));

    await expect(
      useCase.executeSV({ venueId: 'venue-inexistente', actorUserId: 'intruso', name: 'Cancha' }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' });
    expect(venueRepo.findByIdSV).not.toHaveBeenCalled();
  });

  it('should throw 403 when updating a court of a venue the actor is not staff of', async () => {
    const useCase = new UpdateCourtUseCase(repo, createMockVenueStaffRepository(false));
    repo.findById.mockResolvedValue(activeCourt());

    await expect(
      useCase.executeSV({
        venueId: 'venue-1',
        courtId: 'court-1',
        actorUserId: 'intruso',
        name: 'Robada',
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('should throw 403 when cancelling a court of a venue the actor is not staff of', async () => {
    const useCase = new CancelCourtUseCase(repo, createMockVenueStaffRepository(false));
    repo.findById.mockResolvedValue(activeCourt());

    await expect(
      useCase.executeSV({ venueId: 'venue-1', courtId: 'court-1', actorUserId: 'intruso' }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' });
    expect(repo.cancel).not.toHaveBeenCalled();
  });

  //? El agujero real: staff de la sede A no puede tocar una cancha de la sede B
  //? poniendo su propio venueId en el path.
  it('should throw 400 when the court belongs to another venue', async () => {
    const useCase = new UpdateCourtUseCase(repo, createMockVenueStaffRepository(true));
    repo.findById.mockResolvedValue(activeCourt({ venueId: 'venue-ajena' }));

    await expect(
      useCase.executeSV({
        venueId: 'venue-1',
        courtId: 'court-1',
        actorUserId: ACTOR_USER_ID,
        name: 'Cruzada',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'CANCHA_NO_PERTENECE_A_SEDE' });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('should throw 400 when cancelling a court that belongs to another venue', async () => {
    const useCase = new CancelCourtUseCase(repo, createMockVenueStaffRepository(true));
    repo.findById.mockResolvedValue(activeCourt({ venueId: 'venue-ajena' }));

    await expect(
      useCase.executeSV({ venueId: 'venue-1', courtId: 'court-1', actorUserId: ACTOR_USER_ID }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'CANCHA_NO_PERTENECE_A_SEDE' });
    expect(repo.cancel).not.toHaveBeenCalled();
  });
});
