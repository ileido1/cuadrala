import type { CategoryRepository } from '../domain/ports/category_repository.js';
import type { FormatPresetRepository } from '../domain/ports/format_preset_repository.js';
import type { SportRepository } from '../domain/ports/sport_repository.js';
import type { TournamentRepository } from '../domain/ports/tournament_repository.js';

import {
  CreateParametrizedTournamentUseCase,
  type CreateParametrizedTournamentInput,
} from './use_cases/create_parametrized_tournament.use_case.js';

export type { CreateParametrizedTournamentInput };

export function buildCreateParametrizedTournamentSV(
  _categoryRepository: CategoryRepository,
  _sportRepository: SportRepository,
  _formatPresetRepository: FormatPresetRepository,
  _tournamentRepository: TournamentRepository,
) {
  const UC = new CreateParametrizedTournamentUseCase(
    _categoryRepository,
    _sportRepository,
    _formatPresetRepository,
    _tournamentRepository,
  );
  return UC.executeSV.bind(UC);
}
