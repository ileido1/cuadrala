import { describe, expect, it, vi } from 'vitest';
import { UpdateTournamentSettingsUseCase } from '../../application/use_cases/update_tournament_settings.use_case.js';

const base = (status = 'DRAFT') => ({ id: 't', name: 'Torneo', sportId: 's', categoryId: 'c', formatPresetId: 'p', presetSchemaVersion: 1, formatParameters: null, status, visibility: 'PUBLIC' as const, startsAt: null, organizerUserId: 'u', venueId: null, pairedRegistration: false, isCompetitive: false, inscriptionPrice: null, gender: null, maxSlots: null, registrationClosesAt: null, registrationCount: 0, hasSchedule: false, matchCount: 0, createdAt: new Date(), updatedAt: new Date() });

const make = (current = base()) => {
  const repo = { findByIdSV: vi.fn().mockResolvedValue(current), updateSettingsSV: vi.fn().mockResolvedValue({ id: 't' }) };
  const access = { executeSV: vi.fn() };
  const categories = { findByIdAndSportIdSV: vi.fn().mockResolvedValue({ id: 'c' }) };
  const sports = { findByIdSV: vi.fn().mockResolvedValue({ id: 's' }) };
  const presets = { findByIdSV: vi.fn().mockResolvedValue({ id: 'p', sportId: 's', schemaVersion: 1, parametersSchema: [] }) };
  const validator = { validateAndNormalizeSV: vi.fn().mockReturnValue({}) };
  return { useCase: new UpdateTournamentSettingsUseCase(repo as never, access as never, categories as never, sports as never, presets as never, validator as never), repo };
};

describe('UpdateTournamentSettingsUseCase', () => {
  it('allows editorial settings while OPEN', async () => {
    const { useCase, repo } = make(base('OPEN'));
    await useCase.executeSV({ tournamentId: 't', actorUserId: 'u', settings: { name: 'Nuevo nombre', startsAt: new Date() } });
    expect(repo.updateSettingsSV).toHaveBeenCalled();
  });

  it('rejects structural settings while OPEN', async () => {
    const { useCase } = make(base('OPEN'));
    await expect(useCase.executeSV({ tournamentId: 't', actorUserId: 'u', settings: { formatPresetId: 'p' } })).rejects.toMatchObject({ code: 'TORNEO_CONFIGURACION_BLOQUEADA' });
  });

  it('rejects structural settings when registrations exist', async () => {
    const { useCase } = make({ ...base(), registrationCount: 1 });
    await expect(useCase.executeSV({ tournamentId: 't', actorUserId: 'u', settings: { pairedRegistration: true } })).rejects.toMatchObject({ code: 'TORNEO_CONFIGURACION_INCOMPATIBLE' });
  });
});
