import type { QuickMatchRepository, QuickMatchSearchDTO } from '../../domain/ports/quick_match_repository.js';

const HOLD_MS = 2 * 60 * 1000;

export class MatchQuickMatchUseCase {
  constructor(private readonly _repository: QuickMatchRepository) {}

  async executeSV(_search: QuickMatchSearchDTO): Promise<QuickMatchSearchDTO> {
    if (!_search.includeOpenMatches) return this._repository.markNoMatchYetSV(_search.id);
    const CANDIDATE = await this._repository.findOpenCandidateSV(_search);
    if (CANDIDATE === null) return this._repository.markNoMatchYetSV(_search.id);
    const PROPOSAL = await this._repository.createOpenProposalSV(_search.id, CANDIDATE, new Date(Date.now() + HOLD_MS));
    return PROPOSAL ?? this._repository.markNoMatchYetSV(_search.id);
  }
}
