import type {
  QuickMatchRepository,
  QuickMatchSearchDTO,
  QuickMatchSlot,
} from '../../domain/ports/quick_match_repository.js';

export type QuickMatchDay = 'TODAY' | 'TOMORROW' | 'CUSTOM';

function targetDateSV(_day: QuickMatchDay, _date?: string): Date {
  if (_day === 'CUSTOM') return new Date(`${_date}T00:00:00.000Z`);
  const DATE = new Date();
  DATE.setUTCHours(0, 0, 0, 0);
  if (_day === 'TOMORROW') DATE.setUTCDate(DATE.getUTCDate() + 1);
  return DATE;
}

export class StartQuickMatchUseCase {
  constructor(private readonly _repository: QuickMatchRepository) {}

  async executeSV(_userId: string, _input: {
    sportId: string;
    categoryId: string;
    day: QuickMatchDay;
    date?: string | undefined;
    slots: QuickMatchSlot[];
    widenLevel: boolean;
    zoneKm: number;
    includeOpenMatches: boolean;
  }): Promise<QuickMatchSearchDTO> {
    return this._repository.startForUserSV(_userId, {
      sportId: _input.sportId,
      categoryId: _input.categoryId,
      targetDate: targetDateSV(_input.day, _input.date),
      slots: _input.slots,
      widenLevel: _input.widenLevel,
      zoneKm: _input.zoneKm,
      includeOpenMatches: _input.includeOpenMatches,
    });
  }
}
