/**
 * Use Case para estadísticas del dashboard de sede.
 *
 * GET /api/v1/venues/:venueId/dashboard-stats
 */

import type { DashboardStatsDTO, VenueAnalyticsRepository } from '../../domain/ports/venue_analytics_repository.js';

export type { DashboardStatsDTO };

export class GetDashboardStatsUseCase {
  constructor(private readonly _venueAnalyticsRepository: VenueAnalyticsRepository) {}

  async executeSV(_venueId: string): Promise<DashboardStatsDTO> {
    return this._venueAnalyticsRepository.getDashboardStatsSV(_venueId);
  }
}
