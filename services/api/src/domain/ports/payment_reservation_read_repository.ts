export type PaymentReservationDetailDTO = {
  id: string;
  venueId: string;
  durationMinutes: number | null;
  totalAmountCents: number | null;
  pricingCurrency: string;
  totalAmountMinor: bigint | null;
  paidAmountMinor: bigint;
  court: {
    pricePerHourCents: number | null;
    durationMinutes: number | null;
  } | null;
};

export interface PaymentReservationReadRepository {
  findByIdSV(_reservationId: string): Promise<PaymentReservationDetailDTO | null>;
  updateTotalAmountCentsSV(_reservationId: string, _totalAmountCents: number): Promise<void>;
}
