import { describe, expect, it, vi } from 'vitest';
import { PublishFormatPresetVersionUseCase } from '../../application/use_cases/publish_format_preset_version.use_case.js';

describe('PublishFormatPresetVersionUseCase', () => {
  it('should preserve the preset description when publishing a version', async () => {
    const formatPresets = {
      publishNewVersionSV: vi.fn().mockResolvedValue({
        id: 'preset-version',
        sportId: 'sport',
        code: 'ROUND_ROBIN',
        version: 2,
        name: 'Liga',
        description: 'Todos juegan contra todos.',
        schemaVersion: 1,
        defaultParameters: {},
        isActive: true,
        effectiveFrom: new Date('2026-10-01T00:00:00.000Z'),
      }),
    };
    const useCase = new PublishFormatPresetVersionUseCase(
      { findByIdSV: vi.fn().mockResolvedValue({ id: 'sport' }) } as never,
      formatPresets as never,
    );

    const result = await useCase.executeSV({
      sportId: 'sport',
      code: 'ROUND_ROBIN',
      name: 'Liga',
      description: 'Todos juegan contra todos.',
      schemaVersion: 1,
      defaultParameters: {},
    });

    expect(formatPresets.publishNewVersionSV).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Todos juegan contra todos.' }),
    );
    expect(result.description).toBe('Todos juegan contra todos.');
  });
});
