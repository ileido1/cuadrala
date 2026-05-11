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

// Match types
export type MatchStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
export type MatchType = 'AMERICANO' | 'REGULAR';

export interface MatchListItem {
  id: string;
  courtId: string | null;
  courtName: string | null;
  status: MatchStatus;
  scheduledAt: string | null;
  type: MatchType;
  participantCount: number;
  maxParticipants: number;
  pricePerPlayerCents: number;
  categoryName?: string;
}

export interface MatchListFilters {
  courtId?: string;
  date?: string;
  status?: MatchStatus;
  page?: number;
  limit?: number;
}

export interface MatchListResponse {
  items: MatchListItem[];
  pageInfo: {
    page: number;
    limit: number;
    total: number;
  };
}

// Match detail types
export interface MatchParticipantDto {
  userId: string;
  displayName?: string;
  joinedAt: string;
}

export interface MatchDetailDto {
  id: string;
  sportId: string;
  categoryId: string;
  categoryName?: string;
  type: MatchType;
  status: MatchStatus;
  scheduledAt: string | null;
  pricePerPlayerCents: number;
  maxParticipants: number;
  participantCount: number;
  openSpots: number;
  courtId: string | null;
  courtName: string | null;
  participants: MatchParticipantDto[];
  createdAt: string;
  updatedAt: string;
}

export interface MatchDetailResponse {
  data: MatchDetailDto;
}

// Tournament types

// Tournament types
export type TournamentStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'WITHDRAWN';

export interface TournamentListItem {
  id: string;
  name: string;
  status: TournamentStatus;
  sportId: string;
  sportName: string;
  categoryId: string;
  categoryName: string;
  startsAt: string | null;
  registrationCount: number;
  maxParticipants: number;
}

export interface TournamentDetail extends TournamentListItem {
  formatPresetId: string;
  formatPresetName: string;
  presetSchemaVersion: number;
  formatParameters: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  id: string;
  userId: string;
  userName: string;
  status: RegistrationStatus;
  createdAt: string;
}

export interface TournamentListFilters {
  status?: TournamentStatus;
  sportId?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface TournamentListResponse {
  items: TournamentListItem[];
  pageInfo: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface TournamentDetailResponse {
  tournament: TournamentDetail;
  registrations: Registration[];
}

// Chat types
export interface ChatMessage {
  id: string;
  threadId: string;
  senderUserId: string;
  displayName?: string;
  text: string;
  createdAt: string;
}

export interface ChatMessagesPage {
  items: ChatMessage[];
  nextCursorCreatedAt: string | null;
}

// Profile types
export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  subscriptionType?: string;
}

export interface PlayerProfile {
  id: string;
  userId: string;
  birthDate?: string;
  dominantHand?: 'LEFT' | 'RIGHT' | 'AMBIDEXTROUS';
  sidePreference?: 'LEFT' | 'RIGHT';
  birthYear?: number;
}

export interface UserStats {
  userId: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number;
}

export interface UserRating {
  categoryId: string;
  categoryName: string;
  rating: number;
}
