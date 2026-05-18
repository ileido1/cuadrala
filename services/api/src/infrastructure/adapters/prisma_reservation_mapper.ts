import type {
  ReservationStatus,
  ReservationType,
} from '../../domain/entities/booking/reservation.entity.js';
import type { ReservationDTO } from '../../domain/entities/booking/reservation.entity.js';
import type {
  ReservationStatus as PrismaReservationStatus,
  ReservationType as PrismaReservationType,
} from '../../generated/prisma/client.js';

export const RESERVATION_LIST_SELECT = {
  id: true,
  venueId: true,
  courtId: true,
  sportId: true,
  categoryId: true,
  type: true,
  status: true,
  scheduledAt: true,
  durationMinutes: true,
  notes: true,
  createdByUserId: true,
  responsibleName: true,
  responsiblePhone: true,
  totalAmountCents: true,
  paidAmountCents: true,
  paymentStatus: true,
  court: { select: { name: true } },
  createdAt: true,
  updatedAt: true,
} as const;

export type ReservationPrismaListRow = {
  id: string;
  venueId: string;
  courtId: string;
  sportId: string;
  categoryId: string;
  type: PrismaReservationType;
  status: PrismaReservationStatus;
  scheduledAt: Date;
  durationMinutes: number;
  notes: string | null;
  createdByUserId: string;
  responsibleName: string | null;
  responsiblePhone: string | null;
  totalAmountCents: number | null;
  paidAmountCents: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  court: { name: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

export function mapPrismaReservationRowToDtoSV(
  _row: ReservationPrismaListRow,
): ReservationDTO {
  return {
    id: _row.id,
    venueId: _row.venueId,
    courtId: _row.courtId,
    sportId: _row.sportId,
    categoryId: _row.categoryId,
    type: _row.type as ReservationType,
    status: _row.status as ReservationStatus,
    scheduledAt: _row.scheduledAt,
    durationMinutes: _row.durationMinutes,
    notes: _row.notes,
    createdByUserId: _row.createdByUserId,
    responsibleName: _row.responsibleName,
    responsiblePhone: _row.responsiblePhone,
    totalAmountCents: _row.totalAmountCents,
    paidAmountCents: _row.paidAmountCents,
    paymentStatus: _row.paymentStatus,
    courtName: _row.court?.name ?? null,
    createdAt: _row.createdAt,
    updatedAt: _row.updatedAt,
  };
}
