// Venue types
export interface Venue {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: Record<string, { open: string; close: string }> | null;
  courtsCount?: number;
  displayCurrency?: string;
  pricingCurrency?: string;
}

export interface VenueSummary {
  id: string;
  name: string;
}

export interface ExchangeRate {
  id: string;
  countryCode: string;
  currency: string; // 'USD' | 'EUR'
  rateToBs: number;
  effectiveDate?: string;
  source: string | null;
  updatedAt: string;
}

// Dashboard stats (API response shape)
export interface DashboardStatsResponse {
  totalRevenue: number;
  totalCourts: number;
  occupancyRate: string; // ej. "4/5"
  conversionRate: number;
  revenueTrend: number;
  conversionTrend: number;
  // Campos computados por el front para gráficos (pueden venir vacíos del API)
  weeklyIncome: { day: string; amount: number }[];
  courtOccupancy: { name: string; occupancy: number }[];
  mostReservedCourt: { name: string; hours: number; reservations: number } | null;
}

// Transaction stats
export interface TransactionStatsResponse {
  weeklyRevenue: number;
  totalPaid: number;
  successRate: number;
  weeklyIncome: { day: string; amount: number }[];
  paymentMethods: { method: string; percentage: number; color?: string }[];
}

// Transaction history
export interface TransactionHistoryItem {
  id: string;
  date: string;
  clientName: string;
  courtName: string;
  amount: number;
  status: 'Pagado' | 'Pendiente' | 'Cancelled';
}

export interface TransactionHistoryResponse {
  items: TransactionHistoryItem[];
  pageInfo: {
    page: number;
    limit: number;
    total: number;
  };
}

// Venue update
export type VenueCurrencyCode = 'BS' | 'USD' | 'EUR';

export interface VenueUpdateData {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: Record<string, { open: string; close: string }> | null;
  pricingCurrency?: VenueCurrencyCode;
  displayCurrency?: VenueCurrencyCode;
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
export type CourtStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type SportType = 'PADEL' | 'TENNIS';

export interface CourtPricingTier {
  id: string;
  courtId: string;
  label: string;
  startTime: string;
  endTime: string;
  pricePerHourCents: number;
}

export interface Court {
  id: string;
  venueId: string;
  name: string;
  sportType: SportType;
  indoor: boolean;
  lighting: boolean;
  surfaceType: string | null;
  status: CourtStatus;
  pricePerHourCents?: number | null;
  capacity?: string | null;
  durationMinutes?: number;
  createdAt: string;
  pricingTiers?: CourtPricingTier[];
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
  from?: string;
  to?: string;
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
  documentNumber?: string | null;
  birthDate?: string;
  dominantHand?: 'LEFT' | 'RIGHT' | 'AMBIDEXTROUS';
  sidePreference?: 'LEFT' | 'RIGHT';
  birthYear?: number;
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  documentNumber: string | null;
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

// Reservation types
export type ReservationType = 'DIRECT' | 'BLOCKED';
export type ReservationStatus = 'CONFIRMED' | 'CANCELLED';

export interface Reservation {
  id: string;
  venueId: string;
  courtId: string;
  sportId: string;
  categoryId: string;
  type: ReservationType;
  status: ReservationStatus;
  scheduledAt: string;
  durationMinutes: number;
  notes: string | null;
  createdByUserId: string;
}

export interface ReservationListItem {
  id: string;
  venueId: string;
  courtId: string;
  courtName: string | null;
  type: ReservationType;
  status: ReservationStatus;
  scheduledAt: string;
  durationMinutes: number;
  notes: string | null;
  totalAmountCents?: number;
  paidAmountCents?: number;
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID';
}

export interface CreateReservationRequest {
  courtId: string;
  sportId?: string;
  categoryId?: string;
  scheduledAt: string;
  durationMinutes: number;
  notes?: string;
  responsible?: ReservationResponsible;
}

export type ReservationResponsible =
  | { type: 'PLAYER'; playerId: string }
  | { type: 'GUEST'; name: string; phone?: string };

export interface BlockSlotRequest {
  courtId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  notes?: string;
}

export interface ReservationListResponse {
  items: ReservationListItem[];
  pageInfo: {
    page: number;
    limit: number;
    total: number;
  };
}

// ─── Unified Booking types ───────────────────────────────────────────────────

/** Tipo unificado de booking: DIRECT, BLOCKED o MATCH */
export type UnifiedBookingType = 'MATCH' | 'DIRECT' | 'BLOCKED';

/** Item returned by GET /venues/:id/bookings — unified booking shape */
export interface BookingItem {
  id: string;
  type: UnifiedBookingType;
  courtId: string;
  courtName: string | null;
  sportId: string;
  categoryId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'CONFIRMED' | 'CANCELLED';
  visibility?: 'PUBLISHED' | 'DRAFT' | 'PRIVATE' | null;
  // MATCH-specific:
  matchStatus?: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | null;
  participantCount?: number;
  maxParticipants?: number;
  organizerUserId?: string | null;
  // Payment:
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID';
  totalAmountCents?: number | null;
  paidAmountCents?: number;
  pricingCurrency?: string;
  totalAmountMinor?: string | null;
  paidAmountMinor?: string;
  // Common:
  notes?: string | null;
  responsibleName?: string | null;
  responsiblePhone?: string | null;
  createdByUserId?: string;
}

export interface BookingListResponse {
  items: BookingItem[];
  pageInfo: {
    page: number;
    limit: number;
    total: number;
  };
}

// Court Pricing Tier types
export interface CourtPricingTier {
  id: string;
  courtId: string;
  label: string;
  startTime: string;
  endTime: string;
  pricePerHourCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourtPricingTierRequest {
  label: string;
  startTime: string;
  endTime: string;
  pricePerHourCents: number;
}

export interface UpdateCourtPricingTierRequest {
  label?: string;
  startTime?: string;
  endTime?: string;
  pricePerHourCents?: number;
}

// Bracket types (Phase 3: Web Types)
export interface PlayerBracketSlot {
  userId: string;
  displayName: string;
  seedPosition: number;
}

export interface BracketMatch {
  matchNumber: number;
  roundNumber: number;
  playerA: PlayerBracketSlot | null;
  playerB: PlayerBracketSlot | null;
  winnerId: string | null;
  score: { userId: string; points: number }[] | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BYE';
  matchId: string | null;
}

export interface BracketRound {
  roundNumber: number;
  name: string;
  matches: BracketMatch[];
}

export interface TournamentBracket {
  tournamentId: string;
  tournamentName: string;
  totalRounds: number;
  bracketSize: number;
  rounds: BracketRound[];
}

export interface ScoreEntry {
  userId: string;
  points: number;
}

// ─── Payment Method types ──────────────────────────────────────────────────────

export type PaymentMethodType = 'CASH' | 'BANK_TRANSFER' | 'PAGO_MOVIL' | 'POS' | 'OTHER';

/** Tipos de identificación venezolanos. */
export type IdType = 'V' | 'E' | 'P' | 'J' | 'G' | 'R';

export interface VenuePaymentMethod {
  id: string;
  venueId: string;
  type: PaymentMethodType;
  name: string;
  config: PaymentMethodConfig | null;
  settlementCurrency?: string;
  isActive: boolean;
  position: number;
}

export type PaymentMethodConfig =
  | { type: 'CASH' }
  | { type: 'BANK_TRANSFER'; accountNumber: string; bank: string; idType: IdType; idNumber: string }
  | { type: 'PAGO_MOVIL'; phoneNumber: string; idType: IdType; idNumber: string; bank: string }
  | { type: 'POS'; reference: string }
  | { type: 'OTHER'; reference: string };
