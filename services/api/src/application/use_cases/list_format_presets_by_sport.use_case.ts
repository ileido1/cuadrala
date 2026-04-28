import type {
  FormatPresetRepository,
  TournamentFormatPresetDTO,
} from '../../domain/ports/format_preset_repository.js';

export class ListFormatPresetsBySportUseCase {
  constructor(private readonly _formatPresetRepository: FormatPresetRepository) {}

  async executeSV(_sportId: string): Promise<TournamentFormatPresetDTO[]> {
    return this._formatPresetRepository.listActiveFormatPresetsBySportIdSV(_sportId, new Date());
  }
}

