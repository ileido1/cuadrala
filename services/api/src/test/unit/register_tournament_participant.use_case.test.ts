import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegisterTournamentParticipantUseCase } from '../../application/use_cases/register_tournament_participant.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
};

const mockRegistrationRepository = {
  upsertSV: vi.fn(),
};

const useCase = new RegisterTournamentParticipantUseCase(
  mockTournamentRepository as never,
  mockRegistrationRepository as never,
);

const BASE_TOURNAMENT = {
  id: 'tournament-1',
  name: 'Torneo Demo',
  sportId: 'sport-1',
  categoryId: 'category-1',
  formatPresetId: 'preset-1',
  presetSchemaVersion: 1,
  formatParameters: null,
  status: 'DRAFT',
  visibility: 'PUBLIC',
  startsAt: null,
  organizerUserId: 'organizer-1',
  venueId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const REGISTRATION = {
  id: 'reg-1',
  tournamentId: 'tournament-1',
  userId: 'user-1',
  status: 'PENDING',
  registrationType: 'AUTHENTICATED',
  guestName: null,
  guestPhone: null,
  guestEmail: null,
  registeredByUserId: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
  mockRegistrationRepository.upsertSV.mockResolvedValue({ created: true, registration: REGISTRATION });
});

describe('RegisterTournamentParticipantUseCase', () => {
  it('should return the full registration DTO (with createdAt) so the mobile client can parse it', async () => {
    const RESULT = await useCase.executeSV({
      tournamentId: 'tournament-1',
      userId: 'user-1',
    });

    expect(RESULT.created).toBe(true);
    expect(RESULT.registration.id).toBe('reg-1');
    expect(RESULT.registration.userId).toBe('user-1');
    //? El bug previo: la respuesta omitía createdAt y el cliente rompía al parsear.
    expect(RESULT.registration.createdAt).toBeInstanceOf(Date);
    expect(RESULT.registration.registrationType).toBe('AUTHENTICATED');
  });

  it('should throw TORNEO_CERRADO when the tournament is not DRAFT', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      status: 'OPEN',
    });

    await expect(
      useCase.executeSV({ tournamentId: 'tournament-1', userId: 'user-1' }),
    ).rejects.toThrow('El torneo no admite nuevas inscripciones en su estado actual.');
  });
});