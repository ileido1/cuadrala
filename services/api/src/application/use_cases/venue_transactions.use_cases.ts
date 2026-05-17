/**
 * Use Case para estadísticas de transacciones de sede.
 *
 * GET /api/v1/venues/:venueId/transactions/stats
 */

import type {
  TransactionStatsDTO,
  VenueAnalyticsRepository,
  VenueTransactionHistoryItemDTO,
} from '../../domain/ports/venue_analytics_repository.js';

export type {
  PaymentMethodStatsDTO,
  TransactionStatsDTO,
  WeeklyIncomeItemDTO,
} from '../../domain/ports/venue_analytics_repository.js';

export type VenueTransactionHistoryDTO = {
  items: VenueTransactionHistoryItemDTO[];
  total: number;
};

export class GetTransactionStatsUseCase {
  constructor(private readonly _venueAnalyticsRepository: VenueAnalyticsRepository) {}

  async executeSV(_venueId: string): Promise<TransactionStatsDTO> {
    return this._venueAnalyticsRepository.getTransactionStatsSV(_venueId);
  }
}

export class ListVenueTransactionHistoryUseCase {
  constructor(private readonly _venueAnalyticsRepository: VenueAnalyticsRepository) {}

  async executeSV(
    _venueId: string,
    _page: number,
    _limit: number,
  ): Promise<VenueTransactionHistoryDTO> {
    return this._venueAnalyticsRepository.listTransactionHistorySV(
      _venueId,
      _page,
      _limit,
    );
  }
}
