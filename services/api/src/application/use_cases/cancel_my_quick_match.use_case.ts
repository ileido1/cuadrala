import type { QuickMatchRepository } from '../../domain/ports/quick_match_repository.js';

export class CancelMyQuickMatchUseCase {
  constructor(private readonly _repository: QuickMatchRepository) {}

  async executeSV(_userId: string): Promise<void> {
    await this._repository.cancelForUserSV(_userId);
  }
}
