// Venue types
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

// Court types
export type CourtStatus = 'ACTIVE' | 'INACTIVE';
export type SportType = 'PADEL' | 'TENNIS';

export interface Court {
  id: string;
  venueId: string;
  name: string;
  sportType: SportType;
  indoor: boolean;
  lighting: boolean;
  surfaceType: string | null;
  status: CourtStatus;
  createdAt: string;
}

export interface CreateCourtRequest {
  name: string;
  sportType?: SportType;
  indoor?: boolean;
  lighting?: boolean;
  surfaceType?: string | null;
}

export interface UpdateCourtRequest {
  name?: string;
  sportType?: SportType;
  indoor?: boolean;
  lighting?: boolean;
  surfaceType?: string | null;
}

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

// Court slot types
export type CourtAvailabilityReason = 'OCCUPIED_MATCH' | 'INCOMPATIBLE_VACANT_HOUR' | 'OUT_OF_RANGE';

export interface CourtSlot {
  start: string;
  end: string;
  isAvailable: boolean;
  reason?: CourtAvailabilityReason;
}

export interface CourtSlotsResponse {
  courtId: string;
  date: string;
  durationMinutes: number;
  stepMinutes: number;
  slots: CourtSlot[];
}
