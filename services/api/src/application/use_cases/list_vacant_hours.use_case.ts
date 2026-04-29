import { AppError } from '../../domain/errors/app_error.js';
import type {
  PageDTO,
  VacantHourDTO,
  VacantHourListFiltersDTO,
  VacantHourRepository,
} from '../../domain/ports/vacant_hour_repository.js';

export type ListVacantHoursUseCaseInput = VacantHourListFiltersDTO & {
  page?: number;
  limit?: number;
};

export class ListVacantHoursUseCase {
  constructor(private readonly _vacantHourRepository: VacantHourRepository) {}

  async executeSV(_input: ListVacantHoursUseCaseInput): Promise<{ items: VacantHourDTO[]; total: number; page: PageDTO }> {
    const PAGE = _input.page ?? 1;
    const LIMIT = _input.limit ?? 20;
    if (PAGE < 1) throw new AppError('PAGINACION_INVALIDA', 'page debe ser mayor o igual a 1.', 400);
    if (LIMIT < 1 || LIMIT > 100) throw new AppError('PAGINACION_INVALIDA', 'limit debe estar entre 1 y 100.', 400);

    const FILTERS: VacantHourListFiltersDTO = {
      ...(_input.venueId !== undefined ? { venueId: _input.venueId } : {}),
      ...(_input.courtId !== undefined ? { courtId: _input.courtId } : {}),
      ...(_input.status !== undefined ? { status: _input.status } : {}),
    };

    const RESULT = await this._vacantHourRepository.listVacantHoursSV(FILTERS, { page: PAGE, limit: LIMIT });

    return { ...RESULT, page: { page: PAGE, limit: LIMIT } };
  }
}

