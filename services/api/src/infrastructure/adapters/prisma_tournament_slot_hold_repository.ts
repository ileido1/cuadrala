import type { TournamentSlotHoldRepository } from '../../application/use_cases/reserve_tournament_schedule_slots.use_case.js';
import type { PlannedMatchSlot } from '../../domain/tournament/tournament_slot_planner.js';
import { PRISMA } from '../prisma_client.js';

/** Código de Prisma para violación de restricción única. */
const UNIQUE_VIOLATION = 'P2002';

export class PrismaTournamentSlotHoldRepository implements TournamentSlotHoldRepository {
  async holdSlotsSV(_input: {
    tournamentId: string;
    venueId: string;
    sportId: string;
    categoryId: string;
    createdByUserId: string;
    holdExpiresAt: Date;
    slots: PlannedMatchSlot[];
  }): Promise<{ heldSlots: PlannedMatchSlot[]; lostSlots: PlannedMatchSlot[] }> {
    const HELD: PlannedMatchSlot[] = [];
    const LOST: PlannedMatchSlot[] = [];

    const VENUE = await PRISMA.venue.findUnique({
      where: { id: _input.venueId },
      select: { pricingCurrency: true },
    });

    for (const SLOT of _input.slots) {
      try {
        await PRISMA.reservation.create({
          data: {
            venueId: _input.venueId,
            courtId: SLOT.courtId,
            sportId: _input.sportId,
            categoryId: _input.categoryId,
            scheduledAt: SLOT.scheduledAt,
            status: 'HELD',
            holdExpiresAt: _input.holdExpiresAt,
            type: 'MATCH',
            createdByUserId: _input.createdByUserId,
            organizerUserId: _input.createdByUserId,
            pricingCurrency: VENUE?.pricingCurrency ?? 'USD',
          },
        });
        HELD.push(SLOT);
      } catch (_error) {
        //? El indice parcial `Reservation_court_slot_live_uniq` es el arbitro de
        //? la carrera: entre que se leyo la agenda y se escribe, otra reserva
        //? pudo tomar el turno. Se pierde ese partido, no el cuadro entero.
        if (isUniqueViolationSV(_error)) {
          LOST.push(SLOT);
          continue;
        }
        throw _error;
      }
    }

    return { heldSlots: HELD, lostSlots: LOST };
  }
}

function isUniqueViolationSV(_error: unknown): boolean {
  return (
    typeof _error === 'object' &&
    _error !== null &&
    'code' in _error &&
    (_error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}
