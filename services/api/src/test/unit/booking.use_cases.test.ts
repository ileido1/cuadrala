/**
 * Unit tests para Booking Use Cases — unificado (DIRECT, BLOCKED, MATCH).
 * Design: sdd/unificar-match-reservation (PR2 — Domain + Application Layer)
 * Test pattern: TDD Red-Green-Refactor con Vitest.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AppError } from '../../domain/errors/app_error.js';
import {
  CreateBookingUseCase,
  type CreateBookingInput,
  ListBookingsUseCase,
  type ListBookingsInput,
  CancelBookingUseCase,
  type CancelBookingInput,
  UpdateBookingUseCase,
  type UpdateBookingInput,
} from '../../../application/use_cases/booking.use_cases';
import {
  ReservationType,
  ReservationStatus,
  Visibility,
  MatchStatus,
} from '../../../domain/entities/reservation.entity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mock factory para IBookingRepository. */
function createMockBookingRepository() {
  return {
    createBookingSV: vi.fn(),
    listBookingsSV: vi.fn(),
    findByIdSV: vi.fn(),
    assertAvailableSV: vi.fn(),
    updateBookingSV: vi.fn(),
    cancelBookingSV: vi.fn(),
  };
}

/** Mock factory para IVenueStaffRepository. */
function createMockVenueStaffRepository() {
  return {
    isUserStaffOfVenueSV: vi.fn(),
    findByIdSV: vi.fn(),
    listByVenueSV: vi.fn(),
  };
}

/** Mock factory para ICourtRepository. */
function createMockCourtRepository() {
  return {
    findById: vi.fn(),
    findByVenue: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  };
}

/** Fixture base booking (DIRECT). */
function createBookingDTO(overrides: Partial<{
  id: string;
  venueId: string;
  courtId: string;
  sportId: string;
  categoryId: string;
  type: ReservationType;
  status: ReservationStatus;
  scheduledAt: Date;
  durationMinutes: number;
  visibility: Visibility | null;
  organizerUserId: string | null;
  formatPresetId: string | null;
  maxParticipants: number;
  pricePerPlayerCents: number;
  matchStatus: MatchStatus | null;
}> = {}) {
  return {
    id: 'booking-1',
    venueId: 'venue-1',
    courtId: 'court-1',
    courtName: 'Cancha 1',
    sportId: 'sport-1',
    categoryId: 'category-1',
    type: ReservationType.DIRECT,
    status: ReservationStatus.CONFIRMED,
    scheduledAt: new Date('2026-06-01T10:00:00Z'),
    durationMinutes: 60,
    notes: null,
    createdByUserId: 'user-1',
    responsibleName: null,
    responsiblePhone: null,
    totalAmountCents: 9000,
    paidAmountCents: 0,
    paymentStatus: 'UNPAID' as const,
    createdAt: new Date('2026-05-01T00:00:00Z'),
    updatedAt: new Date('2026-05-01T00:00:00Z'),
    matchId: null,
    organizerUserId: null,
    formatPresetId: null,
    formatParameters: null,
    maxParticipants: 4,
    pricePerPlayerCents: 0,
    visibility: null,
    matchStatus: null,
    ...overrides,
  };
}

/** Court fixture con pricePerHourCents. */
const COURT_WITH_PRICE = {
  id: 'court-1',
  venueId: 'venue-1',
  name: 'Cancha 1',
  sportType: 'PADEL' as const,
  indoor: true,
  lighting: false,
  surfaceType: null,
  status: 'ACTIVE' as const,
  pricePerHourCents: 9000,
  capacity: null,
  durationMinutes: 60,
  createdAt: new Date(),
  pricingTiers: [],
};

const ACTOR_USER_ID = 'staff-user-1';
const VENUE_ID = 'venue-1';
const COURT_ID = 'court-1';
const SPORT_ID = 'sport-1';
const CATEGORY_ID = 'category-1';

// ---------------------------------------------------------------------------
// CreateBookingUseCase
// ---------------------------------------------------------------------------

describe('CreateBookingUseCase', () => {
  let bookingRepo: ReturnType<typeof createMockBookingRepository>;
  let venueStaffRepo: ReturnType<typeof createMockVenueStaffRepository>;
  let courtRepo: ReturnType<typeof createMockCourtRepository>;
  let useCase: CreateBookingUseCase;

  beforeEach(() => {
    bookingRepo = createMockBookingRepository();
    venueStaffRepo = createMockVenueStaffRepository();
    courtRepo = createMockCourtRepository();
    useCase = new CreateBookingUseCase(bookingRepo, venueStaffRepo, courtRepo);
  });

  it('should create a DIRECT booking when valid input provided', async () => {
    const input: CreateBookingInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'DIRECT',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
      durationMinutes: 60,
    };
    const expected = createBookingDTO({ type: ReservationType.DIRECT });
    bookingRepo.assertAvailableSV.mockResolvedValue(undefined);
    courtRepo.findById.mockResolvedValue(COURT_WITH_PRICE);
    bookingRepo.createBookingSV.mockResolvedValue(expected);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    const result = await useCase.executeSV(input, ACTOR_USER_ID);

    expect(result.booking.type).toBe(ReservationType.DIRECT);
    expect(bookingRepo.createBookingSV).toHaveBeenCalled();
  });

  it('should create a BLOCKED booking when type is BLOCKED', async () => {
    const input: CreateBookingInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'BLOCKED',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
    };
    const expected = createBookingDTO({ type: ReservationType.BLOCKED });
    bookingRepo.assertAvailableSV.mockResolvedValue(undefined);
    courtRepo.findById.mockResolvedValue(COURT_WITH_PRICE);
    bookingRepo.createBookingSV.mockResolvedValue(expected);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    const result = await useCase.executeSV(input, ACTOR_USER_ID);

    expect(result.booking.type).toBe(ReservationType.BLOCKED);
    expect(bookingRepo.createBookingSV).toHaveBeenCalled();
  });

  it('should create a MATCH booking with visibility=DRAFT by default', async () => {
    const input: CreateBookingInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'MATCH',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
      organizerUserId: 'organizer-1',
      maxParticipants: 4,
    };
    const expected = createBookingDTO({
      type: ReservationType.MATCH,
      visibility: Visibility.DRAFT,
      organizerUserId: 'organizer-1',
      maxParticipants: 4,
    });
    bookingRepo.assertAvailableSV.mockResolvedValue(undefined);
    courtRepo.findById.mockResolvedValue(COURT_WITH_PRICE);
    bookingRepo.createBookingSV.mockResolvedValue(expected);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    const result = await useCase.executeSV(input, ACTOR_USER_ID);

    expect(result.booking.type).toBe(ReservationType.MATCH);
    expect(result.booking.visibility).toBe(Visibility.DRAFT);
    expect(result.booking.organizerUserId).toBe('organizer-1');
  });

  it('should create a MATCH booking with visibility=PUBLISHED when specified', async () => {
    const input: CreateBookingInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'MATCH',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
      organizerUserId: 'organizer-1',
      visibility: 'PUBLISHED',
    };
    const expected = createBookingDTO({
      type: ReservationType.MATCH,
      visibility: Visibility.PUBLISHED,
      organizerUserId: 'organizer-1',
    });
    bookingRepo.assertAvailableSV.mockResolvedValue(undefined);
    courtRepo.findById.mockResolvedValue(COURT_WITH_PRICE);
    bookingRepo.createBookingSV.mockResolvedValue(expected);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    const result = await useCase.executeSV(input, ACTOR_USER_ID);

    expect(result.booking.visibility).toBe(Visibility.PUBLISHED);
  });

  it('should throw VALIDACION_FALLIDA when durationMinutes is 0', async () => {
    const input: CreateBookingInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'DIRECT',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
      durationMinutes: 0,
    };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('durationMinutes debe ser mayor a 0.');
  });

  it('should throw VALIDACION_FALLIDA when type=MATCH but organizerUserId missing', async () => {
    const input: CreateBookingInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'MATCH',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
      // organizerUserId missing
    };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('organizerUserId es requerido para type=MATCH.');
  });

  it('should throw VALIDACION_FALLIDA when type=MATCH and maxParticipants is 0', async () => {
    const input: CreateBookingInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'MATCH',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
      organizerUserId: 'organizer-1',
      maxParticipants: 0,
    };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('maxParticipants debe ser mayor a 0.');
  });

  it('should throw VALIDACION_FALLIDA when type=MATCH and pricePerPlayerCents is negative', async () => {
    const input: CreateBookingInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'MATCH',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
      organizerUserId: 'organizer-1',
      pricePerPlayerCents: -100,
    };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('pricePerPlayerCents no puede ser negativo.');
  });

  it('should throw NO_AUTORIZADO when user is not staff of venue', async () => {
    const input: CreateBookingInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'DIRECT',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
    };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(false);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('No tienes permisos para crear bookings en esta sede.');
  });

  it('should call assertAvailableSV before creating booking', async () => {
    const input: CreateBookingInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'DIRECT',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
    };
    bookingRepo.assertAvailableSV.mockResolvedValue(undefined);
    courtRepo.findById.mockResolvedValue(COURT_WITH_PRICE);
    bookingRepo.createBookingSV.mockResolvedValue(createBookingDTO());
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await useCase.executeSV(input, ACTOR_USER_ID);

    expect(bookingRepo.assertAvailableSV).toHaveBeenCalledWith(COURT_ID, input.scheduledAt);
  });

  it('should calculate totalAmountCents from court pricePerHourCents', async () => {
    const input: CreateBookingInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'DIRECT',
      scheduledAt: new Date('2026-06-01T10:00:00Z'),
      durationMinutes: 120, // 2 hours
    };
    bookingRepo.assertAvailableSV.mockResolvedValue(undefined);
    courtRepo.findById.mockResolvedValue(COURT_WITH_PRICE);
    const expected = createBookingDTO({ totalAmountCents: 18000 }); // 9000 * 2
    bookingRepo.createBookingSV.mockResolvedValue(expected);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await useCase.executeSV(input, ACTOR_USER_ID);

    expect(bookingRepo.createBookingSV).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmountCents: 18000 }),
    );
  });
});

// ---------------------------------------------------------------------------
// ListBookingsUseCase
// ---------------------------------------------------------------------------

describe('ListBookingsUseCase', () => {
  let bookingRepo: ReturnType<typeof createMockBookingRepository>;
  let venueStaffRepo: ReturnType<typeof createMockVenueStaffRepository>;
  let useCase: ListBookingsUseCase;

  beforeEach(() => {
    bookingRepo = createMockBookingRepository();
    venueStaffRepo = createMockVenueStaffRepository();
    useCase = new ListBookingsUseCase(bookingRepo, venueStaffRepo);
  });

  it('should return paginated bookings when called with valid params', async () => {
    const input: ListBookingsInput = {
      venueId: VENUE_ID,
      page: 1,
      limit: 20,
    };
    const items = [createBookingDTO()];
    bookingRepo.listBookingsSV.mockResolvedValue({ items, total: 1 });
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    const result = await useCase.executeSV(input, ACTOR_USER_ID);

    expect(result.items).toHaveLength(1);
    expect(result.pageInfo.page).toBe(1);
    expect(result.pageInfo.limit).toBe(20);
    expect(result.pageInfo.total).toBe(1);
  });

  it('should throw PAGINACION_INVALIDA when page is less than 1', async () => {
    const input: ListBookingsInput = { venueId: VENUE_ID, page: 0, limit: 20 };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('page debe ser mayor o igual a 1.');
  });

  it('should throw PAGINACION_INVALIDA when limit exceeds 100', async () => {
    const input: ListBookingsInput = { venueId: VENUE_ID, page: 1, limit: 101 };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('limit debe estar entre 1 y 100.');
  });

  it('should throw VALIDACION_FALLIDA when from date format is invalid', async () => {
    const input: ListBookingsInput = { venueId: VENUE_ID, page: 1, limit: 20, from: '2026-6-1' };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('from debe estar en formato YYYY-MM-DD.');
  });

  it('should throw NO_AUTORIZADO when user is not staff of venue', async () => {
    const input: ListBookingsInput = { venueId: VENUE_ID, page: 1, limit: 20 };
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(false);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('No tienes permisos para ver los bookings de esta sede.');
  });

  it('should pass filters to repository including type and visibility', async () => {
    const input: ListBookingsInput = {
      venueId: VENUE_ID,
      courtId: COURT_ID,
      from: '2026-06-01',
      to: '2026-06-30',
      status: ReservationStatus.CONFIRMED,
      type: 'MATCH',
      visibility: 'PUBLISHED',
      page: 1,
      limit: 20,
    };
    bookingRepo.listBookingsSV.mockResolvedValue({ items: [], total: 0 });
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await useCase.executeSV(input, ACTOR_USER_ID);

    expect(bookingRepo.listBookingsSV).toHaveBeenCalledWith(
      expect.objectContaining({
        venueId: VENUE_ID,
        courtId: COURT_ID,
        from: '2026-06-01',
        to: '2026-06-30',
        status: ReservationStatus.CONFIRMED,
        type: ReservationType.MATCH,
        visibility: Visibility.PUBLISHED,
      }),
      { page: 1, limit: 20 },
    );
  });
});

// ---------------------------------------------------------------------------
// CancelBookingUseCase
// ---------------------------------------------------------------------------

describe('CancelBookingUseCase', () => {
  let bookingRepo: ReturnType<typeof createMockBookingRepository>;
  let venueStaffRepo: ReturnType<typeof createMockVenueStaffRepository>;
  let useCase: CancelBookingUseCase;

  beforeEach(() => {
    bookingRepo = createMockBookingRepository();
    venueStaffRepo = createMockVenueStaffRepository();
    useCase = new CancelBookingUseCase(bookingRepo, venueStaffRepo);
  });

  it('should cancel an existing booking', async () => {
    const input: CancelBookingInput = { bookingId: 'booking-1' };
    const existing = createBookingDTO();
    const cancelled = createBookingDTO({ status: ReservationStatus.CANCELLED });
    bookingRepo.findByIdSV.mockResolvedValue(existing);
    bookingRepo.cancelBookingSV.mockResolvedValue(cancelled);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    const result = await useCase.executeSV(input, ACTOR_USER_ID);

    expect(result.booking.status).toBe(ReservationStatus.CANCELLED);
    expect(bookingRepo.cancelBookingSV).toHaveBeenCalledWith('booking-1');
  });

  it('should throw BOOKING_NO_ENCONTRADO when booking does not exist', async () => {
    const input: CancelBookingInput = { bookingId: 'unknown' };
    bookingRepo.findByIdSV.mockResolvedValue(null);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('El booking indicado no existe.');
  });

  it('should throw NO_AUTORIZADO when user is not staff of venue', async () => {
    const input: CancelBookingInput = { bookingId: 'booking-1' };
    const existing = createBookingDTO();
    bookingRepo.findByIdSV.mockResolvedValue(existing);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(false);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('No tienes permisos para cancelar bookings de esta sede.');
  });
});

// ---------------------------------------------------------------------------
// UpdateBookingUseCase
// ---------------------------------------------------------------------------

describe('UpdateBookingUseCase', () => {
  let bookingRepo: ReturnType<typeof createMockBookingRepository>;
  let venueStaffRepo: ReturnType<typeof createMockVenueStaffRepository>;
  let useCase: UpdateBookingUseCase;

  beforeEach(() => {
    bookingRepo = createMockBookingRepository();
    venueStaffRepo = createMockVenueStaffRepository();
    useCase = new UpdateBookingUseCase(bookingRepo, venueStaffRepo);
  });

  it('should update visibility for a MATCH booking', async () => {
    const input: UpdateBookingInput = {
      bookingId: 'booking-1',
      visibility: 'PUBLISHED',
    };
    const existing = createBookingDTO({ type: ReservationType.MATCH, visibility: Visibility.DRAFT });
    const updated = createBookingDTO({ type: ReservationType.MATCH, visibility: Visibility.PUBLISHED });
    bookingRepo.findByIdSV.mockResolvedValue(existing);
    bookingRepo.updateBookingSV.mockResolvedValue(updated);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    const result = await useCase.executeSV(input, ACTOR_USER_ID);

    expect(result.booking.visibility).toBe(Visibility.PUBLISHED);
    expect(bookingRepo.updateBookingSV).toHaveBeenCalledWith(
      'booking-1',
      expect.objectContaining({ visibility: Visibility.PUBLISHED }),
    );
  });

  it('should update matchStatus for a MATCH booking', async () => {
    const input: UpdateBookingInput = {
      bookingId: 'booking-1',
      matchStatus: 'IN_PROGRESS',
    };
    const existing = createBookingDTO({ type: ReservationType.MATCH, matchStatus: MatchStatus.SCHEDULED });
    const updated = createBookingDTO({ type: ReservationType.MATCH, matchStatus: MatchStatus.IN_PROGRESS });
    bookingRepo.findByIdSV.mockResolvedValue(existing);
    bookingRepo.updateBookingSV.mockResolvedValue(updated);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    const result = await useCase.executeSV(input, ACTOR_USER_ID);

    expect(result.booking.matchStatus).toBe(MatchStatus.IN_PROGRESS);
  });

  it('should throw BOOKING_NO_ENCONTRADO when booking does not exist', async () => {
    const input: UpdateBookingInput = { bookingId: 'unknown' };
    bookingRepo.findByIdSV.mockResolvedValue(null);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('El booking indicado no existe.');
  });

  it('should throw NO_AUTORIZADO when user is not staff of venue', async () => {
    const input: UpdateBookingInput = { bookingId: 'booking-1', visibility: 'PUBLISHED' };
    const existing = createBookingDTO();
    bookingRepo.findByIdSV.mockResolvedValue(existing);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(false);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('No tienes permisos para actualizar bookings de esta sede.');
  });

  it('should throw VALIDACION_FALLIDA when updating visibility on non-MATCH booking', async () => {
    const input: UpdateBookingInput = {
      bookingId: 'booking-1',
      visibility: 'PUBLISHED',
    };
    const existing = createBookingDTO({ type: ReservationType.DIRECT });
    bookingRepo.findByIdSV.mockResolvedValue(existing);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('visibility solo puede modificarse en bookings de tipo MATCH.');
  });

  it('should throw VALIDACION_FALLIDA when updating matchStatus on non-MATCH booking', async () => {
    const input: UpdateBookingInput = {
      bookingId: 'booking-1',
      matchStatus: 'IN_PROGRESS',
    };
    const existing = createBookingDTO({ type: ReservationType.BLOCKED });
    bookingRepo.findByIdSV.mockResolvedValue(existing);
    venueStaffRepo.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow(AppError);
    await expect(useCase.executeSV(input, ACTOR_USER_ID)).rejects.toThrow('matchStatus solo puede modificarse en bookings de tipo MATCH.');
  });
});