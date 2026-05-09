// Payment types

export interface PlayerSummary {
  id: string;
  name: string;
}

export interface PendingPayment {
  id: string;
  matchId: string;
  matchLabel: string;
  amount: number;
  currency: string;
  player: PlayerSummary;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded';

export interface PaginatedPaymentsResponse {
  data: PendingPayment[];
  meta: {
    total: number;
    venueId: string;
  };
}

export interface PaymentsFilters {
  from?: string;
  to?: string;
  matchId?: string;
}
