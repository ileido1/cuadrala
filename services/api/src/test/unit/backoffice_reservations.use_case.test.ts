/**
 * Unit tests para Reservation Use Cases — backoffice-reservations API
 * Test pattern: TDD Red-Green-Refactor con Vitest.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AppError } from '../../domain/errors/app_error.js';
import {
  CreateReservationUseCase,
  type CreateReservationInput,
  ListReservationsUseCase,
  type ListReservationsInput,
  CancelReservationUseCase,
  type CancelReservationInput,
} from '../../application/use_cases/reservation.use_cases.js';
import { ReservationType, ReservationStatus } from '../../domain/entities/booking/reservation.entity.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mock factory para IReservationRepository. */
function createMockReservationRepository() {
  return {
    createReservationSV: vi.fn(),
    findByIdSV: vi.fn(),
    findByCourtAndScheduledAtSV: vi.fn(),
    listReservationsSV: vi.fn(),
    cancelReservationSV: vi.fn(),
  };
}

/** Mock factory para IVenueStaffRepository. */
function createMockVenueStaffRepository() {
  return {
    isUserStaffOfVenueSV: vi.fn(),
    findByIdSV: vi.fn(),
    listByVenueSV: vi.fn(),
    upsertSV: vi.fn(),
    findByVenueAndUserSV: vi.fn(),
    listByVenueIdSV: vi.fn(),
    listByUserIdSV: vi.fn(),
    removeByVenueAndUserSV: vi.fn(),
  };
}

function createMockCourtRepository() {
  return {
    findById: vi.fn().mockResolvedValue({
      id: COURT_ID,
      durationMinutes: 60,
      pricePerHourCents: null,
    }),
    findByVenue: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  };
}

function createMockCatalogRepository() {
  return {
    resolveSportIdForCourtSV: vi.fn().mockResolvedValue(SPORT_ID),
    resolveDefaultCategoryIdSV: vi.fn().mockResolvedValue(CATEGORY_ID),
  };
}

function createReservation(overrides: Partial<{
  id: string;
  venueId: string;
  courtId: string;
  sportId: string;
  categoryId: string;
  type: ReservationType;
  status: ReservationStatus;
  scheduledAt: Date;
  durationMinutes: number;
  notes: string | null;
  createdByUserId: string;
}> = {}) {
  return {
    id: 'reservation-1',
    venueId: 'venue-1',
    courtId: 'court-1',
    sportId: 'sport-1',
    categoryId: 'category-1',
    type: ReservationType.DIRECT,
    status: ReservationStatus.CONFIRMED,
    scheduledAt: new Date('2026-06-01T10:00:00Z'),
    durationMinutes: 60,
    notes: null,
    createdByUserId: 'user-1',
    createdAt: new Date('2026-05-01T00:00:00Z'),
    updatedAt: new Date('2026-05-01T00:00:00Z'),
    ...overrides,
  };
}

const ACTOR_USER_ID = 'staff-user-1';
const VENUE_ID = 'venue-1';
const COURT_ID = 'court-1';
const SPORT_ID = 'sport-1';
const CATEGORY_ID = 'category-1';

// ---------------------------------------------------------------------------
// CreateReservationUseCase
// ---------------------------------------------------------------------------

describe('CreateReservationUseCase', () => {
  let repo: ReturnType<typeof createMockReservationRepository>;
  let venueStaffRepo: ReturnType<typeof createMockVenueStaffRepository>;
  let courtRepo: ReturnType<typeof createMockCourtRepository>;
  let catalogRepo: ReturnType<typeof createMockCatalogRepository>;
  let useCase: CreateReservationUseCase;

  beforeEach(() => {
    repo = createMockReservationRepository();
    venueStaffRepo = createMockVenueStaffRepository();
    courtRepo = createMockCourtRepository();
    catalogRepo = createMockCatalogRepository();
    useCase = new CreateReservationUseCase(repo, venueStaffRepo, courtRepo, catalogRepo);
  });

  it('should create a DIRECT reservation when valid input provided', async () => {
    const input: CreateReservationInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'DIRECT',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
      durationMinutes: 60,
    };
    const expected = createReservation();
    repo.findByCourtAndScheduledAtSV.mockResolvedValue(null);
    repo.createReservationSV.mockResolvedValue(expected);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    const result = await useCase.executeSV(input, ACTOR_USER_ID);

    expect(result.reservation.status).toBe(ReservationStatus.CONFIRMED);
    expect(repo.createReservationSV).toHaveBeenCalled();
  });

  it('should throw VALIDACION_FALLIDA when durationMinutes is 0', async () => {
    const input: CreateReservationInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
      durationMinutes: 0,
    };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('durationMinutes debe ser mayor a 0.');
  });

  it('should throw NO_AUTORIZADO when user is not staff of venue', async () => {
    const input: CreateReservationInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
    };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(false);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('No tienes permisos para crear reservas en esta sede.');
  });

  it('should throw CONFLICTO when reservation already exists for court+scheduledAt', async () => {
    const input: CreateReservationInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
    };
    const existing = createReservation();
    repo.findByCourtAndScheduledAtSV.mockResolvedValue(existing);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('Ya existe una reserva confirmada para ese horario en esta cancha.');
  });

  it('should create BLOCKED reservation when type is BLOCKED', async () => {
    const input: CreateReservationInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'BLOCKED',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
    };
    const blocked = createReservation({ type: ReservationType.BLOCKED });
    repo.findByCourtAndScheduledAtSV.mockResolvedValue(null);
    repo.createReservationSV.mockResolvedValue(blocked);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    const result = await useCase.executeSV(input, ACTOR_USER_ID);

    expect(result.reservation.type).toBe(ReservationType.BLOCKED);
  });
});

// ---------------------------------------------------------------------------
// ListReservationsUseCase
// ---------------------------------------------------------------------------

describe('ListReservationsUseCase', () => {
  let repo: ReturnType<typeof createMockReservationRepository>;
  let venueStaffRepo: ReturnType<typeof createMockVenueStaffRepository>;
  let useCase: ListReservationsUseCase;

  beforeEach(() => {
    repo = createMockReservationRepository();
    venueStaffRepo = createMockVenueStaffRepository();
    useCase = new ListReservationsUseCase(repo, venueStaffRepo);
  });

  it('should return paginated reservations when called with valid params', async () => {
    const input: ListReservationsInput = {
      venueId: VENUE_ID,
      page: 1,
      limit: 20,
    };
    const items = [createReservation()];
    repo.listReservationsSV.mockResolvedValue({ items, total: 1 });
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    const result = await useCase.executeSV(input, ACTOR_USER_ID);

    expect(result.items).toHaveLength(1);
    expect(result.pageInfo.page).toBe(1);
    expect(result.pageInfo.limit).toBe(20);
    expect(result.pageInfo.total).toBe(1);
  });

  it('should throw PAGINACION_INVALIDA when page is less than 1', async () => {
    const input: ListReservationsInput = { venueId: VENUE_ID, page: 0, limit: 20 };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('page debe ser mayor o igual a 1.');
  });

  it('should throw PAGINACION_INVALIDA when limit exceeds 100', async () => {
    const input: ListReservationsInput = { venueId: VENUE_ID, page: 1, limit: 101 };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('limit debe estar entre 1 y 100.');
  });

  it('should throw NO_AUTORIZADO when user is not staff of venue', async () => {
    const input: ListReservationsInput = { venueId: VENUE_ID, page: 1, limit: 20 };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(false);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('No tienes permisos para ver las reservas de esta sede.');
  });

  it('should pass filters to repository', async () => {
    const input: ListReservationsInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      from: '2026-06-01',
      to: '2026-06-30',
      status: ReservationStatus.CONFIRMED,
      page: 1,
      limit: 20,
    };
    repo.listReservationsSV.mockResolvedValue({ items: [], total: 0 });
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await useCase.executeSV(input, ACTOR_USER_ID);

    expect(repo.listReservationsSV).toHaveBeenCalledWith(
      expect.objectContaining({
        venueId: VENUE_ID,
        courtId: COURT_ID,
        from: '2026-06-01',
        to: '2026-06-30',
        status: ReservationStatus.CONFIRMED,
      }),
      { page: 1, limit: 20 },
    );
  });
});

// ---------------------------------------------------------------------------
// CancelReservationUseCase
// ---------------------------------------------------------------------------

describe('CancelReservationUseCase', () => {
  let repo: ReturnType<typeof createMockReservationRepository>;
  let venueStaffRepo: ReturnType<typeof createMockVenueStaffRepository>;
  let useCase: CancelReservationUseCase;

  beforeEach(() => {
    repo = createMockReservationRepository();
    venueStaffRepo = createMockVenueStaffRepository();
    useCase = new CancelReservationUseCase(repo, venueStaffRepo);
  });

  it('should cancel an existing reservation', async () => {
    const input: CancelReservationInput = { reservationId: 'reservation-1' };
    const existing = createReservation();
    const cancelled = createReservation({ status: ReservationStatus.CANCELLED });
    repo.findByIdSV.mockResolvedValue(existing);
    repo.cancelReservationSV.mockResolvedValue(cancelled);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    const result = await useCase.executeSV(input, ACTOR_USER_ID);

    expect(result.reservation.status).toBe(ReservationStatus.CANCELLED);
    expect(repo.cancelReservationSV).toHaveBeenCalledWith('reservation-1');
  });

  it('should throw RESERVA_NO_ENCONTRADA when reservation does not exist', async () => {
    const input: CancelReservationInput = { reservationId: 'unknown' };
    repo.findByIdSV.mockResolvedValue(null);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('La reserva indicada no existe.');
  });

  it('should throw NO_AUTORIZADO when user is not staff of venue', async () => {
    const input: CancelReservationInput = { reservationId: 'reservation-1' };
    const existing = createReservation();
    repo.findByIdSV.mockResolvedValue(existing);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(false);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('No tienes permisos para cancelar reservas de esta sede.');
  });
});