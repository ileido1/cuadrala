export type PaymentReservationDetailDTO = {
  id: string;
  durationMinutes: number | null;
  totalAmountCents: number | null;
  court: {
    pricePerHourCents: number | null;
    durationMinutes: number | null;
  } | null;
};

export interface PaymentReservationReadRepository {
  findByIdSV(_reservationId: string): Promise<PaymentReservationDetailDTO | null>;
  updateTotalAmountCentsSV(_reservationId: string, _totalAmountCents: number): Promise<void>;
}
