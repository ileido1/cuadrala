import type { FormatPresetRepository } from '../domain/ports/format_preset_repository.js';
import type { SportRepository } from '../domain/ports/sport_repository.js';

import { ListFormatPresetsBySportUseCase } from './use_cases/list_format_presets_by_sport.use_case.js';
import { ListSportsUseCase } from './use_cases/list_sports.use_case.js';

export async function listSportsSV(
  _sportRepository: SportRepository,
): Promise<{ id: string; code: string; name: string }[]> {
  const UC = new ListSportsUseCase(_sportRepository);
  return UC.executeSV();
}

export async function listFormatPresetsBySportSV(
  _sportId: string,
  _formatPresetRepository: FormatPresetRepository,
): Promise<
  {
    id: string;
    sportId: string;
    code: string;
    version: number;
    name: string;
    schemaVersion: number;
    defaultParameters: unknown;
  }[]
> {
  const UC = new ListFormatPresetsBySportUseCase(_formatPresetRepository);
  return UC.executeSV(_sportId);
}
