export interface Venue {
  id: string;
  name: string;
  address?: string;
  courtsCount?: number;
}

export interface VenueSummary {
  id: string;
  name: string;
}

export interface PendingTransaction {
  id: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  amount: number;
  createdAt: string;
}

export interface UpcomingMatch {
  id: string;
  scheduledAt: string;
  courtName?: string;
}
