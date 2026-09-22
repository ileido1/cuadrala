import type { QuickMatchRepository, QuickMatchSearchDTO } from '../../domain/ports/quick_match_repository.js';

export class GetMyQuickMatchUseCase {
  constructor(private readonly _repository: QuickMatchRepository) {}

  async executeSV(_userId: string): Promise<QuickMatchSearchDTO | null> {
    return this._repository.findByUserIdSV(_userId);
  }
}
