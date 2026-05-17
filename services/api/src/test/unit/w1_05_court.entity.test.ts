import { describe, expect, it } from 'vitest';
import {
  CourtStatus,
  SportType,
  type Court,
  type CreateCourtInput,
  type UpdateCourtInput,
} from '../../domain/entities/booking/court.entity';

describe('US-W1-05 — Dominio Court: entity types', () => {
  describe('CourtStatus enum', () => {
    it('tiene ACTIVE e INACTIVE como valores literales', () => {
      expect(CourtStatus.ACTIVE).toBe('ACTIVE');
      expect(CourtStatus.INACTIVE).toBe('INACTIVE');
    });

    it('es asignable a una propiedad status de Court', () => {
      const court: Court = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        venueId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Cancha 1',
        sportType: SportType.PADEL,
        indoor: false,
        lighting: true,
        surfaceType: 'cemento',
        status: CourtStatus.ACTIVE,
        pricePerHourCents: 850000,
        capacity: '4v4',
        durationMinutes: 60,
        createdAt: new Date('2025-01-01'),
        pricingTiers: [],
      };
      expect(court.status).toBe(CourtStatus.ACTIVE);
    });
  });

  describe('SportType enum', () => {
    it('tiene PADEL y TENNIS como valores literales', () => {
      expect(SportType.PADEL).toBe('PADEL');
      expect(SportType.TENNIS).toBe('TENNIS');
    });

    it('es asignable a una propiedad sportType de Court', () => {
      const court: Court = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        venueId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Cancha Tennis',
        sportType: SportType.TENNIS,
        indoor: true,
        lighting: true,
        surfaceType: null,
        status: CourtStatus.ACTIVE,
        pricePerHourCents: null,
        capacity: null,
        durationMinutes: 60,
        createdAt: new Date('2025-01-01'),
        pricingTiers: [],
      };
      expect(court.sportType).toBe(SportType.TENNIS);
    });
  });

  describe('Court interface', () => {
    it('requiere todos los campos mínimos', () => {
      const court: Court = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        venueId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Cancha Test',
        sportType: SportType.PADEL,
        indoor: false,
        lighting: false,
        surfaceType: null,
        status: CourtStatus.ACTIVE,
        pricePerHourCents: null,
        capacity: null,
        durationMinutes: 60,
        createdAt: new Date(),
        pricingTiers: [],
      };
      expect(court.id).toBeDefined();
      expect(court.venueId).toBeDefined();
      expect(court.name).toBeDefined();
    });

    it('surfaceType puede ser null', () => {
      const court: Court = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        venueId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Cancha Sin Superficie',
        sportType: SportType.PADEL,
        indoor: false,
        lighting: false,
        surfaceType: null,
        status: CourtStatus.INACTIVE,
        pricePerHourCents: null,
        capacity: null,
        durationMinutes: 60,
        createdAt: new Date(),
        pricingTiers: [],
      };
      expect(court.surfaceType).toBeNull();
    });
  });

  describe('CreateCourtInput interface', () => {
    it('requiere venueId y name, el resto es opcional', () => {
      const input: CreateCourtInput = {
        venueId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Nueva Cancha',
      };
      expect(input.venueId).toBeDefined();
      expect(input.name).toBeDefined();
    });

    it('permite спорt_type, indoor, lighting opcionales con defaults implícitos', () => {
      const input: CreateCourtInput = {
        venueId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Cancha Exterior',
        sportType: SportType.TENNIS,
        indoor: true,
        lighting: false,
        surfaceType: 'arcilla',
      };
      expect(input.sportType).toBe(SportType.TENNIS);
      expect(input.indoor).toBe(true);
      expect(input.lighting).toBe(false);
    });

    it('surfaceType puede ser null explícitamente', () => {
      const input: CreateCourtInput = {
        venueId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Cancha Sin Superficie',
        surfaceType: null,
      };
      expect(input.surfaceType).toBeNull();
    });
  });

  describe('UpdateCourtInput interface', () => {
    it('todos los campos son opcionales', () => {
      const input: UpdateCourtInput = {};
      expect(Object.keys(input).length).toBe(0);
    });

    it('permite actualizar solo algunos campos', () => {
      const input: UpdateCourtInput = {
        name: 'Cancha Renombrada',
        lighting: true,
      };
      expect(input.name).toBe('Cancha Renombrada');
      expect(input.lighting).toBe(true);
      expect(input.sportType).toBeUndefined();
    });
  });
});