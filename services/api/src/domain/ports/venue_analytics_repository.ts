export type DashboardStatsDTO = {
  totalRevenue: number;
  totalCourts: number;
  occupancyRate: string;
  conversionRate: number;
  revenueTrend: number;
  conversionTrend: number;
};

export type WeeklyIncomeItemDTO = {
  day: string;
  amount: number;
};

export type PaymentMethodStatsDTO = {
  method: string;
  percentage: number;
};

export type TransactionStatsDTO = {
  weeklyRevenue: number;
  totalPaid: number;
  successRate: number;
  weeklyIncome: WeeklyIncomeItemDTO[];
  paymentMethods: PaymentMethodStatsDTO[];
};

export type VenueTransactionHistoryItemDTO = {
  id: string;
  date: string;
  clientName: string;
  courtName: string;
  amount: number;
  status: string;
};

export interface VenueAnalyticsRepository {
  getDashboardStatsSV(_venueId: string): Promise<DashboardStatsDTO>;
  getTransactionStatsSV(_venueId: string): Promise<TransactionStatsDTO>;
  listTransactionHistorySV(
    _venueId: string,
    _page: number,
    _limit: number,
  ): Promise<{ items: VenueTransactionHistoryItemDTO[]; total: number }>;
}
