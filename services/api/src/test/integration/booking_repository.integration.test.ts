/**
 * Pruebas de integración para PrismaBookingRepository.
 * Verifica CRUD de bookings para todos los tipos (DIRECT, BLOCKED, MATCH).
 * Requires TEST_DATABASE_URL con migraciones aplicadas.
 * Design: sdd/unificar-match-reservation (PR3 — Infrastructure Layer)
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  MatchStatus,
  ReservationType,
  Visibility,
} from '../../domain/entities/booking/reservation.entity.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { PrismaBookingRepository } from '../../infrastructure/adapters/prisma_booking_repository.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';

const BOOKING_REPO = new PrismaBookingRepository(PRISMA);

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'PrismaBookingRepository (Integración HTTP + DB)',
  () => {
    let venueId: string;
    let courtId: string;
    let sportPadelId: string;
    let categoryId: string;
    let staffUserId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const TS = Date.now();
      const CAT = await PRISMA.category.create({ data: { name: `Cat ${TS}`, slug: `booking-${TS}` } });
      categoryId = CAT.id;

      const VENUE = await PRISMA.venue.create({
        data: { name: `Venue Booking ${TS}`, latitude: -34.6037, longitude: -58.3816 },
      });
      venueId = VENUE.id;

      const COURT = await PRISMA.court.create({
        data: { name: `Court Booking ${TS}`, venueId, pricePerHourCents: 5000 },
      });
      courtId = COURT.id;

      // Crear usuario staff
      const USER = await PRISMA.user.create({
        data: { email: `staff-booking-${TS}@test.com`, name: 'Staff Booking' },
      });
      staffUserId = USER.id;

      // Asignar staff a la sede
      await PRISMA.venueStaff.create({
        data: { userId: staffUserId, venueId, role: 'STAFF' },
      });
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    // -------------------------------------------------------------------------
    // Helper: limpia tabla Reservation antes de cada test
    // -------------------------------------------------------------------------
    beforeEach(async () => {
      await PRISMA.reservation.deleteMany({});
    });

    // -------------------------------------------------------------------------
    // createBookingSV — los tres tipos
    // -------------------------------------------------------------------------

    it('debe crear un booking tipo DIRECT y retornarlo con todos los campos', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 3 * 60 * 60 * 1000);

      const BOOKING = await BOOKING_REPO.createBookingSV({
        venueId,
        courtId,
        sportId: sportPadelId,
        categoryId,
        type: ReservationType.DIRECT,
        scheduledAt: SCHEDULED_AT,
        durationMinutes: 60,
        notes: 'Test DIRECT',
        createdByUserId: staffUserId,
        responsibleName: 'Juan Pérez',
        responsiblePhone: '+5491112345678',
        totalAmountCents: 5000,
      });

      expect(BOOKING.id).toBeDefined();
      expect(BOOKING.type).toBe('DIRECT');
      expect(BOOKING.status).toBe('CONFIRMED');
      expect(BOOKING.courtId).toBe(courtId);
      expect(BOOKING.venueId).toBe(venueId);
      expect(BOOKING.scheduledAt).toEqual(SCHEDULED_AT);
      expect(BOOKING.durationMinutes).toBe(60);
      expect(BOOKING.notes).toBe('Test DIRECT');
      expect(BOOKING.responsibleName).toBe('Juan Pérez');
      expect(BOOKING.responsiblePhone).toBe('+5491112345678');
      expect(BOOKING.totalAmountCents).toBe(5000);
      expect(BOOKING.visibility).toBeNull();
      expect(BOOKING.matchStatus).toBeNull();
      expect(BOOKING.organizerUserId).toBeNull();
      // MATCH-specific fields son null para DIRECT
      expect(BOOKING.matchId).toBeNull();
      expect(BOOKING.formatPresetId).toBeNull();
      expect(BOOKING.maxParticipants).toBe(4); // default
    });

    it('debe crear un booking tipo BLOCKED', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 4 * 60 * 60 * 1000);

      const BOOKING = await BOOKING_REPO.createBookingSV({
        venueId,
        courtId,
        sportId: sportPadelId,
        categoryId,
        type: ReservationType.BLOCKED,
        scheduledAt: SCHEDULED_AT,
        durationMinutes: 90,
        createdByUserId: staffUserId,
        notes: 'Bloqueado por mantenimiento',
      });

      expect(BOOKING.type).toBe('BLOCKED');
      expect(BOOKING.status).toBe('CONFIRMED');
      expect(BOOKING.visibility).toBeNull();
      expect(BOOKING.matchStatus).toBeNull();
    });

    it('debe crear un booking tipo MATCH con visibility=DRAFT por defecto', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 5 * 60 * 60 * 1000);

      const BOOKING = await BOOKING_REPO.createBookingSV({
        venueId,
        courtId,
        sportId: sportPadelId,
        categoryId,
        type: ReservationType.MATCH,
        scheduledAt: SCHEDULED_AT,
        durationMinutes: 90,
        createdByUserId: staffUserId,
        organizerUserId: staffUserId,
        maxParticipants: 4,
        pricePerPlayerCents: 2500,
        visibility: Visibility.DRAFT,
      });

      expect(BOOKING.type).toBe('MATCH');
      expect(BOOKING.status).toBe('CONFIRMED');
      expect(BOOKING.visibility).toBe('DRAFT');
      expect(BOOKING.matchStatus).toBe('SCHEDULED');
      expect(BOOKING.organizerUserId).toBe(staffUserId);
      expect(BOOKING.maxParticipants).toBe(4);
      expect(BOOKING.pricePerPlayerCents).toBe(2500);
    });

    it('debe crear un booking tipo MATCH con visibility=PUBLISHED', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 6 * 60 * 60 * 1000);

      const BOOKING = await BOOKING_REPO.createBookingSV({
        venueId,
        courtId,
        sportId: sportPadelId,
        categoryId,
        type: ReservationType.MATCH,
        scheduledAt: SCHEDULED_AT,
        durationMinutes: 90,
        createdByUserId: staffUserId,
        organizerUserId: staffUserId,
        maxParticipants: 4,
        pricePerPlayerCents: 3000,
        visibility: Visibility.PUBLISHED,
      });

      expect(BOOKING.type).toBe('MATCH');
      expect(BOOKING.visibility).toBe('PUBLISHED');
      expect(BOOKING.matchStatus).toBe('SCHEDULED');
    });

    // -------------------------------------------------------------------------
    // listBookingsSV — filtros
    // -------------------------------------------------------------------------

    it('debe listar bookings por venueId con paginación', async () => {
      const NOW = Date.now();
      // Crear 3 bookings de distinto tipo
      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.DIRECT,
        scheduledAt: new Date(NOW + 7 * 60 * 60 * 1000),
        createdByUserId: staffUserId,
      });
      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.BLOCKED,
        scheduledAt: new Date(NOW + 8 * 60 * 60 * 1000),
        createdByUserId: staffUserId,
      });
      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.MATCH,
        scheduledAt: new Date(NOW + 9 * 60 * 60 * 1000),
        createdByUserId: staffUserId,
        organizerUserId: staffUserId,
        visibility: Visibility.PUBLISHED,
      });

      const RESULT = await BOOKING_REPO.listBookingsSV({ venueId }, { page: 1, limit: 10 });

      expect(RESULT.total).toBe(3);
      expect(RESULT.items).toHaveLength(3);
    });

    it('debe filtrar bookings por tipo=MATCH', async () => {
      const NOW = Date.now();
      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.DIRECT,
        scheduledAt: new Date(NOW + 10 * 60 * 60 * 1000),
        createdByUserId: staffUserId,
      });
      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.MATCH,
        scheduledAt: new Date(NOW + 11 * 60 * 60 * 1000),
        createdByUserId: staffUserId,
        organizerUserId: staffUserId,
        visibility: Visibility.PUBLISHED,
      });

      const RESULT = await BOOKING_REPO.listBookingsSV(
        { venueId, type: ReservationType.MATCH },
        { page: 1, limit: 10 },
      );

      expect(RESULT.total).toBe(1);
      expect(RESULT.items[0]!.type).toBe('MATCH');
    });

    it('debe filtrar bookings por visibilidad=PUBLISHED', async () => {
      const NOW = Date.now();
      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.MATCH,
        scheduledAt: new Date(NOW + 12 * 60 * 60 * 1000),
        createdByUserId: staffUserId,
        organizerUserId: staffUserId,
        visibility: Visibility.DRAFT,
      });
      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.MATCH,
        scheduledAt: new Date(NOW + 13 * 60 * 60 * 1000),
        createdByUserId: staffUserId,
        organizerUserId: staffUserId,
        visibility: Visibility.PUBLISHED,
      });

      const RESULT = await BOOKING_REPO.listBookingsSV(
        { venueId, visibility: Visibility.PUBLISHED },
        { page: 1, limit: 10 },
      );

      expect(RESULT.total).toBe(1);
      expect(RESULT.items[0]!.visibility).toBe('PUBLISHED');
    });

    it('debe filtrar bookings por rango de fechas (from/to)', async () => {
      const BASE = new Date('2025-01-01T10:00:00Z').getTime();

      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.DIRECT,
        scheduledAt: new Date(BASE + 0 * 60 * 60 * 1000),
        createdByUserId: staffUserId,
      });
      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.DIRECT,
        scheduledAt: new Date(BASE + 48 * 60 * 60 * 1000), // +2 días
        createdByUserId: staffUserId,
      });
      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.DIRECT,
        scheduledAt: new Date(BASE + 96 * 60 * 60 * 1000), // +4 días
        createdByUserId: staffUserId,
      });

      const RESULT = await BOOKING_REPO.listBookingsSV(
        { venueId, from: '2025-01-02', to: '2025-01-03' },
        { page: 1, limit: 10 },
      );

      expect(RESULT.total).toBe(1);
    });

    it('debe paginar correctamente', async () => {
      const NOW = Date.now();
      // Crear 5 bookings
      for (let i = 0; i < 5; i++) {
        await BOOKING_REPO.createBookingSV({
          venueId, courtId, sportId: sportPadelId, categoryId,
          type: ReservationType.DIRECT,
          scheduledAt: new Date(NOW + (14 + i) * 60 * 60 * 1000),
          createdByUserId: staffUserId,
        });
      }

      const PAGE1 = await BOOKING_REPO.listBookingsSV({ venueId }, { page: 1, limit: 2 });
      expect(PAGE1.items).toHaveLength(2);
      expect(PAGE1.total).toBe(5);

      const PAGE2 = await BOOKING_REPO.listBookingsSV({ venueId }, { page: 2, limit: 2 });
      expect(PAGE2.items).toHaveLength(2);
      expect(PAGE2.total).toBe(5);
    });

    // -------------------------------------------------------------------------
    // findByIdSV
    // -------------------------------------------------------------------------

    it('debe encontrar un booking por ID', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 15 * 60 * 60 * 1000);
      const CREATED = await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.DIRECT,
        scheduledAt: SCHEDULED_AT,
        createdByUserId: staffUserId,
      });

      const FOUND = await BOOKING_REPO.findByIdSV(CREATED.id);

      expect(FOUND).not.toBeNull();
      expect(FOUND!.id).toBe(CREATED.id);
      expect(FOUND!.type).toBe('DIRECT');
    });

    it('debe retornar null para ID inexistente', async () => {
      const FOUND = await BOOKING_REPO.findByIdSV('inexistente-id-12345');
      expect(FOUND).toBeNull();
    });

    // -------------------------------------------------------------------------
    // assertAvailableSV — detección de conflictos
    // -------------------------------------------------------------------------

    it('debe lanzar error SLOT_NO_DISPONIBLE cuando el slot ya está ocupado', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 16 * 60 * 60 * 1000);

      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.DIRECT,
        scheduledAt: SCHEDULED_AT,
        createdByUserId: staffUserId,
      });

      await expect(
        BOOKING_REPO.assertAvailableSV(courtId, SCHEDULED_AT),
      ).rejects.toThrow('SLOT_NO_DISPONIBLE');
    });

    it('debe permitir el mismo slot si se excluye el booking actual (update)', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 17 * 60 * 60 * 1000);

      const BOOKING = await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.DIRECT,
        scheduledAt: SCHEDULED_AT,
        createdByUserId: staffUserId,
      });

      // No debe lanzar — excluimos el booking actual
      await expect(
        BOOKING_REPO.assertAvailableSV(courtId, SCHEDULED_AT, BOOKING.id),
      ).resolves.toBeUndefined();
    });

    it('debe considerar visibilidad DRAFT como disponible públicamente', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 18 * 60 * 60 * 1000);

      // Crear match DRAFT
      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.MATCH,
        scheduledAt: SCHEDULED_AT,
        createdByUserId: staffUserId,
        organizerUserId: staffUserId,
        visibility: Visibility.DRAFT,
      });

      // DRAFT no bloquea disponibilidad pública (visibilidad != DRAFT es la condición en assertAvailableSV)
      // El slot DEBE estar disponible porque el match es DRAFT
      const AVAILABLE = await BOOKING_REPO.assertAvailableSV(courtId, SCHEDULED_AT);
      expect(AVAILABLE).toBeUndefined();
    });

    it('debe considerar visibilidad PUBLISHED como NO disponible', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 19 * 60 * 60 * 1000);

      await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.MATCH,
        scheduledAt: SCHEDULED_AT,
        createdByUserId: staffUserId,
        organizerUserId: staffUserId,
        visibility: Visibility.PUBLISHED,
      });

      await expect(
        BOOKING_REPO.assertAvailableSV(courtId, SCHEDULED_AT),
      ).rejects.toThrow('SLOT_NO_DISPONIBLE');
    });

    // -------------------------------------------------------------------------
    // updateBookingSV
    // -------------------------------------------------------------------------

    it('debe actualizar visibility y matchStatus de un booking MATCH', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 20 * 60 * 60 * 1000);

      const BOOKING = await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.MATCH,
        scheduledAt: SCHEDULED_AT,
        createdByUserId: staffUserId,
        organizerUserId: staffUserId,
        visibility: Visibility.DRAFT,
      });

      const UPDATED = await BOOKING_REPO.updateBookingSV(BOOKING.id, {
        visibility: Visibility.PUBLISHED,
        matchStatus: MatchStatus.IN_PROGRESS,
      });

      expect(UPDATED.visibility).toBe('PUBLISHED');
      expect(UPDATED.matchStatus).toBe('IN_PROGRESS');
    });

    it('debe actualizar notes de cualquier booking', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 21 * 60 * 60 * 1000);

      const BOOKING = await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.DIRECT,
        scheduledAt: SCHEDULED_AT,
        createdByUserId: staffUserId,
        notes: 'Notas originales',
      });

      const UPDATED = await BOOKING_REPO.updateBookingSV(BOOKING.id, {
        notes: 'Notas actualizadas',
      });

      expect(UPDATED.notes).toBe('Notas actualizadas');
    });

    // -------------------------------------------------------------------------
    // cancelBookingSV
    // -------------------------------------------------------------------------

    it('debe cancelar un booking cambiando status a CANCELLED', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 22 * 60 * 60 * 1000);

      const BOOKING = await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.DIRECT,
        scheduledAt: SCHEDULED_AT,
        createdByUserId: staffUserId,
      });

      const CANCELLED = await BOOKING_REPO.cancelBookingSV(BOOKING.id);

      expect(CANCELLED.status).toBe('CANCELLED');
      expect(CANCELLED.id).toBe(BOOKING.id);
    });

    it('debe retornar el booking cancelado tras la cancelación', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 23 * 60 * 60 * 1000);

      const BOOKING = await BOOKING_REPO.createBookingSV({
        venueId, courtId, sportId: sportPadelId, categoryId,
        type: ReservationType.MATCH,
        scheduledAt: SCHEDULED_AT,
        createdByUserId: staffUserId,
        organizerUserId: staffUserId,
        visibility: Visibility.PUBLISHED,
      });

      const CANCELLED = await BOOKING_REPO.cancelBookingSV(BOOKING.id);

      expect(CANCELLED.status).toBe('CANCELLED');
      expect(CANCELLED.type).toBe('MATCH'); // type no cambia
      expect(CANCELLED.visibility).toBe('PUBLISHED'); // visibility no cambia
    });
  },
);