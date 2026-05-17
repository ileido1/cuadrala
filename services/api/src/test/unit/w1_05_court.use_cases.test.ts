/**
 * Unit tests para Court Use Cases — US-W1-05 CRUD Courts — PR2
 *
 * Test pattern: TDD Red-Green-Refactor con Vitest.
 * Usa mocks de ICourtRepository para aislar los use cases.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AppError } from '../../domain/errors/app_error.js';
import {
  CourtStatus,
  SportType,
  type Court,
} from '../../domain/entities/booking/court.entity.js';
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
  let venueRepo: ReturnType<typeof createMockVenueRepository>;
  let useCase: CreateCourtUseCase;

  beforeEach(() => {
    repo = createMockRepository();
    venueRepo = createMockVenueRepository();
    useCase = new CreateCourtUseCase(repo, venueRepo);
  });

  it('should create court with defaults (sportType=PADEL, indoor=false, lighting=false, status=ACTIVE) when only name provided', async () => {
    const input: CreateCourtInputDTO = { venueId: 'venue-1', name: 'Nueva Cancha' };
    const expected = activeCourt({ name: 'Nueva Cancha' });
    repo.create.mockResolvedValue(expected);

    const result = await useCase.executeSV(input);

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
    const input: CreateCourtInputDTO = { venueId: 'venue-1', name: '   ' };

    await expect(useCase.executeSV(input)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input)).rejects.toThrow('El nombre de la cancha es requerido.');
  });

  it('should throw VALIDACION_FALLIDA when name exceeds 120 characters', async () => {
    const input: CreateCourtInputDTO = { venueId: 'venue-1', name: 'A'.repeat(121) };

    await expect(useCase.executeSV(input)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input)).rejects.toThrow('El nombre no puede superar los 120 caracteres.');
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
  let useCase: UpdateCourtUseCase;

  beforeEach(() => {
    repo = createMockRepository();
    useCase = new UpdateCourtUseCase(repo);
  });

  it('should update court name', async () => {
    const input: UpdateCourtInputDTO = { courtId: 'court-1', name: 'Cancha Renombrada' };
    const updated = activeCourt({ name: 'Cancha Renombrada' });
    repo.findById.mockResolvedValue(activeCourt());
    repo.update.mockResolvedValue(updated);

    const result = await useCase.executeSV(input);

    expect(result.court.name).toBe('Cancha Renombrada');
    expect(repo.update).toHaveBeenCalledWith('court-1', { name: 'Cancha Renombrada' });
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateCourtInputDTO = {
      courtId: 'court-1',
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
    const input: UpdateCourtInputDTO = { courtId: 'unknown', name: 'Test' };
    repo.findById.mockResolvedValue(null);

    await expect(useCase.executeSV(input)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input)).rejects.toThrow('La cancha indicada no existe.');
  });

  it('should throw VALIDACION_FALLIDA when name is empty string', async () => {
    const input: UpdateCourtInputDTO = { courtId: 'court-1', name: '' };

    await expect(useCase.executeSV(input)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input)).rejects.toThrow('El nombre de la cancha es requerido.');
  });
});

// ---------------------------------------------------------------------------
// CancelCourtUseCase
// ---------------------------------------------------------------------------

describe('CancelCourtUseCase', () => {
  let repo: ReturnType<typeof createMockRepository>;
  let useCase: CancelCourtUseCase;

  beforeEach(() => {
    repo = createMockRepository();
    useCase = new CancelCourtUseCase(repo);
  });

  it('should cancel an active court (soft-delete)', async () => {
    const input: CancelCourtInputDTO = { courtId: 'court-1' };
    const cancelled = activeCourt({ status: CourtStatus.INACTIVE });
    repo.findById.mockResolvedValue(activeCourt());
    repo.cancel.mockResolvedValue(cancelled);

    const result = await useCase.executeSV(input);

    expect(result.court.status).toBe(CourtStatus.INACTIVE);
    expect(repo.cancel).toHaveBeenCalledWith('court-1');
  });

  it('should be idempotent: cancelling already INACTIVE court returns 200', async () => {
    const input: CancelCourtInputDTO = { courtId: 'court-1' };
    const alreadyInactive = activeCourt({ status: CourtStatus.INACTIVE });
    repo.findById.mockResolvedValue(alreadyInactive);
    repo.cancel.mockResolvedValue(alreadyInactive);

    const result = await useCase.executeSV(input);

    // El use case no lanza error — idempotencia garantizada por el repo
    expect(result.court.status).toBe(CourtStatus.INACTIVE);
    expect(repo.cancel).toHaveBeenCalledWith('court-1');
  });

  it('should throw CANCHA_NO_ENCONTRADA when court does not exist', async () => {
    const input: CancelCourtInputDTO = { courtId: 'unknown' };
    repo.findById.mockResolvedValue(null);

    await expect(useCase.executeSV(input)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input)).rejects.toThrow('La cancha indicada no existe.');
  });
});
