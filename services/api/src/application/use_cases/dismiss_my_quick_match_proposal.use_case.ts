import type { QuickMatchRepository, QuickMatchSearchDTO } from '../../domain/ports/quick_match_repository.js';

export class DismissMyQuickMatchProposalUseCase {
  constructor(private readonly _repository: QuickMatchRepository) {}

  executeSV(_userId: string): Promise<QuickMatchSearchDTO> {
    return this._repository.dismissProposalForUserSV(_userId);
  }
}
